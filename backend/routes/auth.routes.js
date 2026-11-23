const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { connectToDatabase } = require("../config/db");

const router = express.Router();

// Mounted at /api/auth
// --- AUTH: Register new user ---
router.post("/register", async (req, res) => {
  const { fullName, email, phone, password } = req.body;

  if (!fullName || !email || !password) {
    return res
      .status(400)
      .json({ error: "fullName, email and password are required" });
  }

  try {
    const db = await connectToDatabase();

    // Ensure email uniqueness (case-insensitive)
    const existing = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    if (existing) {
      return res
        .status(409)
        .json({ error: "A user with that email already exists" });
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const hashed = bcrypt.hashSync(password, salt);

    const now = new Date();

    const user = {
      // Authentication & security
      email: email.toLowerCase(),
      hashed_password: hashed,
      creation_date: now.toISOString(),
      last_login_date: null,

      // Basic profile
      display_name: fullName,
      phone: phone || null,

      // Preferences (Module 4 Data) - default empty values
      preferences: {
        preferred_locations: [],
        budget_range: { min: null, max: null },
        preferred_types: [],
        keywords: [],
        min_size_sqft: null,
        // rooms and toilets as single numeric values (nullable)
        rooms: null,
        toilets: null,
        // optional extras
        size_tolerance_pct: 10,
        radius_km: null,
        updated_at: null,
      },

      // System data
      is_admin: false,
      is_active: true,
    };

    const result = await db.collection("users").insertOne(user);

    return res.status(201).json({ userId: result.insertedId });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
});

// --- AUTH: Login ---
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const db = await connectToDatabase();
    const user = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = bcrypt.compareSync(password, user.hashed_password);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const now = new Date().toISOString();
    await db
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { last_login_date: now } });

    const payload = {
      userId: String(user._id),
      email: user.email,
      is_admin: !!user.is_admin,
    };

    const secret = process.env.JWT_SECRET || "dev-secret";
    const token = jwt.sign(payload, secret, { expiresIn: "7d" });

    // Set httpOnly cookie for session
    res.cookie("token", token, {
      httpOnly: true, // Secure: JS can't access (XSS protection)
      secure: process.env.NODE_ENV === "production", // Only HTTPS in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "none" required for cross-domain
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Return basic user info (no token in body)
    return res.json({
      user: {
        _id: String(user._id),
        email: user.email,
        display_name: user.display_name,
        is_admin: !!user.is_admin,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

// --- AUTH: Me (verify token from httpOnly cookie) ---
router.get("/me", async (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    console.log("⚠️ /api/auth/me: No token in cookies");
    return res.status(401).json({ error: "Missing token" });
  }
  const secret = process.env.JWT_SECRET || "dev-secret";
  try {
    const decoded = jwt.verify(token, secret);
    const { userId } = decoded;
    const db = await connectToDatabase();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });
    if (!user) {
      console.log(`⚠️ /api/auth/me: User not found for userId: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // return safe user object
    return res.json({
      _id: String(user._id),
      email: user.email,
      display_name: user.display_name,
      preferences: user.preferences || {},
      is_admin: !!user.is_admin,
      is_active: !!user.is_active,
      last_login_date: user.last_login_date || null,
    });
  } catch (err) {
    console.error("⚠️ Token verification error:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
});

// --- AUTH: Logout (clear cookie) ---
router.post("/logout", async (req, res) => {
  try {
    // Must match the same options used when setting the cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ error: "Logout failed" });
  }
});

module.exports = router;
