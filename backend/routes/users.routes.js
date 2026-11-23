const express = require("express");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { connectToDatabase } = require("../config/db");

const router = express.Router();

// Mounted at /api/users
// --- USER PREFERENCES: Get current user's preferences ---
router.get("/me/preferences", async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Missing token" });
  const secret = process.env.JWT_SECRET || "dev-secret";
  try {
    const decoded = jwt.verify(token, secret);
    const { userId } = decoded;
    const db = await connectToDatabase();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).json({ error: "User not found" });

    const defaultPrefs = {
      preferred_locations: [],
      budget_range: { min: null, max: null },
      preferred_types: [],
      keywords: [],
      min_size_sqft: null,
      // new fields: rooms and toilets (single numeric values)
      rooms: null,
      toilets: null,
      // optional extra fields
      size_tolerance_pct: 10,
      radius_km: null,
      updated_at: null,
    };

    // Normalize older/alternate field names: allow ideal_size_sqft to map to min_size_sqft
    const stored = user.preferences || {};
    // Normalize older/alternate field names: allow ideal_size_sqft to map to min_size_sqft
    if (stored.min_size_sqft == null && stored.ideal_size_sqft != null) {
      stored.min_size_sqft = stored.ideal_size_sqft;
    }

    // Normalize legacy rooms/toilets shape (if previously stored as {min,max}) to single numeric
    const normalizedStored = { ...stored };
    if (stored.rooms && typeof stored.rooms === "object") {
      normalizedStored.rooms =
        stored.rooms.min != null
          ? Number(stored.rooms.min)
          : stored.rooms.max != null
            ? Number(stored.rooms.max)
            : null;
    }
    if (stored.toilets && typeof stored.toilets === "object") {
      normalizedStored.toilets =
        stored.toilets.min != null
          ? Number(stored.toilets.min)
          : stored.toilets.max != null
            ? Number(stored.toilets.max)
            : null;
    }

    const prefsToReturn = { ...defaultPrefs, ...normalizedStored };
    return res.json({ preferences: prefsToReturn });
  } catch (err) {
    console.error("Preferences read error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
});

// --- USER PREFERENCES: Update current user's preferences ---
router.post("/me/preferences", async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Missing token" });
  const secret = process.env.JWT_SECRET || "dev-secret";
  try {
    const decoded = jwt.verify(token, secret);
    const { userId } = decoded;
    const newPrefs = req.body?.preferences || req.body;
    console.log("Incoming preferences payload:", JSON.stringify(newPrefs));

    const db = await connectToDatabase();
    // Fetch existing preferences to avoid overwriting omitted fields
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).json({ error: "User not found" });
    const existing = user.preferences || {};

    // Basic validation / sanitization, merging with existing values when fields are omitted
    // compute canonical min size once
    const computed_min_size_sqft = (() => {
      const candidate =
        newPrefs?.min_size_sqft != null
          ? newPrefs.min_size_sqft
          : newPrefs?.ideal_size_sqft != null
            ? newPrefs.ideal_size_sqft
            : existing?.min_size_sqft != null
              ? existing.min_size_sqft
              : existing?.ideal_size_sqft != null
                ? existing.ideal_size_sqft
                : null;
      const n = Number(candidate);
      return Number.isFinite(n) ? n : null;
    })();

    const prefs = {
      preferred_locations: Array.isArray(newPrefs.preferred_locations)
        ? newPrefs.preferred_locations.map((s) => String(s))
        : Array.isArray(existing.preferred_locations)
          ? existing.preferred_locations.map((s) => String(s))
          : [],
      budget_range: {
        min:
          newPrefs?.budget_range?.min != null
            ? Number(newPrefs.budget_range.min)
            : existing?.budget_range?.min != null
              ? Number(existing.budget_range.min)
              : null,
        max:
          newPrefs?.budget_range?.max != null
            ? Number(newPrefs.budget_range.max)
            : existing?.budget_range?.max != null
              ? Number(existing.budget_range.max)
              : null,
      },
      preferred_types: Array.isArray(newPrefs.preferred_types)
        ? newPrefs.preferred_types.map((s) => String(s))
        : Array.isArray(existing.preferred_types)
          ? existing.preferred_types.map((s) => String(s))
          : [],
      keywords: Array.isArray(newPrefs.keywords)
        ? newPrefs.keywords.map((s) => String(s))
        : Array.isArray(existing.keywords)
          ? existing.keywords.map((s) => String(s))
          : [],
      // canonical min size (explicitly include both canonical and legacy keys)
      min_size_sqft: computed_min_size_sqft,
      ideal_size_sqft: computed_min_size_sqft,
      // rooms (single numeric)
      rooms:
        newPrefs?.rooms != null
          ? typeof newPrefs.rooms === "object"
            ? newPrefs.rooms.min != null
              ? Number(newPrefs.rooms.min)
              : newPrefs.rooms.max != null
                ? Number(newPrefs.rooms.max)
                : null
            : Number(newPrefs.rooms)
          : existing?.rooms != null
            ? typeof existing.rooms === "object"
              ? existing.rooms.min != null
                ? Number(existing.rooms.min)
                : existing.rooms.max != null
                  ? Number(existing.rooms.max)
                  : null
              : Number(existing.rooms)
            : null,
      // toilets (single numeric)
      toilets:
        newPrefs?.toilets != null
          ? typeof newPrefs.toilets === "object"
            ? newPrefs.toilets.min != null
              ? Number(newPrefs.toilets.min)
              : newPrefs.toilets.max != null
                ? Number(newPrefs.toilets.max)
                : null
            : Number(newPrefs.toilets)
          : existing?.toilets != null
            ? typeof existing.toilets === "object"
              ? existing.toilets.min != null
                ? Number(existing.toilets.min)
                : existing.toilets.max != null
                  ? Number(existing.toilets.max)
                  : null
              : Number(existing.toilets)
            : null,
      size_tolerance_pct:
        newPrefs?.size_tolerance_pct != null
          ? Number(newPrefs.size_tolerance_pct)
          : existing?.size_tolerance_pct != null
            ? Number(existing.size_tolerance_pct)
            : 10,
      radius_km:
        newPrefs?.radius_km != null
          ? Number(newPrefs.radius_km)
          : existing?.radius_km != null
            ? Number(existing.radius_km)
            : null,
      updated_at: new Date().toISOString(),
    };

    // both keys are explicitly present now

    const result = await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(userId) },
        { $set: { preferences: prefs } },
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ ok: true, preferences: prefs });
  } catch (err) {
    console.error("Preferences save error:", err);
    return res.status(401).json({ error: "Invalid token or save failed" });
  }
});

module.exports = router;
