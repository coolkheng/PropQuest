// Filters may arrive as a JSON string (from /api/chat/search) or an object.
function parseFilters(filters) {
  if (!filters) return {};
  return typeof filters === "string" ? JSON.parse(filters) : filters;
}

// Escapes user/AI text so it is matched literally inside a regex.
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Data stores "Fully furnished", "Partially furnished", "Unfurnished" (or "N/A").
// Map what users/the AI say onto those; plain "furnished" means fully or partially,
// never "Unfurnished" (a bare /furnished/ regex used to match that too).
function furnishingMatch(value) {
  const v = String(value).toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  if (/^(un|not |non |bare)/.test(v)) return { $regex: /^unfurnished/i };
  if (/^(fully|full)\b/.test(v)) return { $regex: /^fully furnished/i };
  if (/^(partial|partly|semi|half)/.test(v)) return { $regex: /^partially furnished/i };
  if (v === "furnished" || v === "any furnished") return { $regex: /^(fully|partially) furnished/i };
  return { $regex: "^" + escapeRegex(String(value).trim()), $options: "i" };
}

// Runs the dynamic aggregation pipeline for the given filters and returns all matches.
async function searchProperties(db, filters) {
    // Stage 1: Basic filters
    const matchStage = {};
    if (filters.location)
      matchStage.address = { $regex: filters.location, $options: "i" };
    if (filters.house_type) matchStage.house_type = filters.house_type;
    // Data stores "Freehold tenure" / "Leasehold (99 years left)", while users and the AI
    // say "Freehold" / "Leasehold": match the start of the value, case-insensitive.
    if (filters.lease_type)
      matchStage.lease_type = {
        $regex: "^" + escapeRegex(String(filters.lease_type).trim()),
        $options: "i",
      };

    if (filters.furnishing) matchStage.furnishing = furnishingMatch(filters.furnishing);

    if (filters.facilities)
      matchStage.facilities = { $all: filters.facilities };

    const pipeline = [{ $match: matchStage }];

    // Stage 2: Convert numeric fields

    pipeline.push({
      $addFields: {
        price_num: {
          $convert: {
            input: {
              $replaceAll: {
                input: {
                  $replaceAll: {
                    input: { $toString: { $ifNull: ["$price", 0] } },
                    find: "RM ",
                    replacement: "",
                  },
                },
                find: ",",
                replacement: "",
              },
            },
            to: "int",
            onError: 0,
            onNull: 0,
          },
        },
        beds_num: {
          $convert: {
            input: {
              $cond: {
                if: {
                  $or: [
                    { $eq: ["$beds", "N/A"] },
                    { $eq: [{ $type: "$beds" }, "missing"] },
                  ],
                },
                then: "0",
                else: {
                  $cond: {
                    if: {
                      $in: [
                        { $type: "$beds" },
                        ["int", "long", "double", "decimal"],
                      ],
                    },
                    then: { $toString: "$beds" },
                    else: {
                      $trim: {
                        input: {
                          $arrayElemAt: [
                            { $split: [{ $toString: "$beds" }, " "] },
                            0,
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
            to: "int",
            onError: 0,
            onNull: 0,
          },
        },
        baths_num: {
          $convert: {
            input: {
              $cond: {
                if: {
                  $or: [
                    { $eq: ["$baths", "N/A"] },
                    { $eq: [{ $type: "$baths" }, "missing"] },
                  ],
                },
                then: "0",
                else: {
                  $cond: {
                    if: {
                      $in: [
                        { $type: "$baths" },
                        ["int", "long", "double", "decimal"],
                      ],
                    },
                    then: { $toString: "$baths" },
                    else: {
                      $trim: {
                        input: {
                          $arrayElemAt: [
                            { $split: [{ $toString: "$baths" }, " "] },
                            0,
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
            to: "int",
            onError: 0,
            onNull: 0,
          },
        },
        sqft_num: {
          $convert: {
            input: {
              $replaceAll: {
                input: { $toString: { $ifNull: ["$sqft", 0] } },
                find: ",",
                replacement: "",
              },
            },
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
      },
    });

    // Stage 3: Numeric filters

    const numericMatch = {};
    if (filters.price_min != null || filters.price_max != null) {
      numericMatch.price_num = {};
      if (filters.price_min != null)
        numericMatch.price_num.$gte = filters.price_min;
      if (filters.price_max != null)
        numericMatch.price_num.$lte = filters.price_max;
    }
    if (filters.beds_min != null)
      numericMatch.beds_num = { $gte: filters.beds_min };
    if (filters.baths_min != null)
      numericMatch.baths_num = { $gte: filters.baths_min };
    if (filters.sqft_min != null || filters.sqft_max != null) {
      numericMatch.sqft_num = {};
      if (filters.sqft_min != null)
        numericMatch.sqft_num.$gte = filters.sqft_min;
      if (filters.sqft_max != null)
        numericMatch.sqft_num.$lte = filters.sqft_max;
    }

    if (Object.keys(numericMatch).length > 0) {
      pipeline.push({ $match: numericMatch });
    }

    // Stage 4: Clean up temporary fields
    pipeline.push({
      $project: {
        price_num: 0,
        beds_num: 0,
        baths_num: 0,
        sqft_num: 0,
      },
    });
    return db.collection("properties20Jan").aggregate(pipeline).toArray();
}

module.exports = { parseFilters, searchProperties };
