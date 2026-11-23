const express = require("express");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { connectToDatabase } = require("../config/db");
const { parseFilters, searchProperties } = require("../services/propertySearch");

const router = express.Router();

// Mounted at /api/properties. "/:id" stays last so it doesn't catch the named routes.
router.get("/", async (req, res) => {
  try {
    console.log("📍 /api/properties called with query:", req.query);
    const db = await connectToDatabase();

    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 60;
    const skip = (page - 1) * limit;

    // Build MongoDB query from filters
    const query = {};

    // Search query (keywords) with word-boundary regex for address to prevent false positives
    if (req.query.search) {
      const searchTerm = req.query.search.trim();
      // Ultra-strict word-boundary regex: matches "ss2" but not "ss21", "ss22", "ss25", etc.
      // Pattern: (boundary) + exact term + (not followed by digit or letter)
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const strictPattern = `(^|\\s|,|/|-)${escapedTerm}(?![0-9a-zA-Z])`;
      const strictRegex = new RegExp(strictPattern, "i");

      // For very short terms (likely location codes), use strict matching everywhere
      const useStrictForAll = searchTerm.length <= 4;
      const generalRegex = useStrictForAll
        ? strictRegex
        : new RegExp(searchTerm, "i");

      console.log(
        `Search term: "${searchTerm}", Strict pattern: ${strictPattern}, Use strict for all: ${useStrictForAll}`,
      );

      query.$or = [
        { title: generalRegex },
        { address: strictRegex },
        { house_type: generalRegex },
        { facilities: { $in: [generalRegex] } },
      ];
    }

    // Location filter (separate from search) - searches both address and title
    if (req.query.location) {
      const locationTerm = req.query.location.trim();
      const escapedLocation = locationTerm.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      const strictLocationPattern = `(^|\\s|,|/|-)${escapedLocation}(?![0-9a-zA-Z])`;
      const strictLocationRegex = new RegExp(strictLocationPattern, "i");

      // For short terms (likely location codes like ss2, pj, etc), use strict matching everywhere
      const useStrictForAll = locationTerm.length <= 4;
      const titleRegex = useStrictForAll
        ? strictLocationRegex
        : new RegExp(locationTerm, "i");

      console.log(
        `Location filter: "${locationTerm}", Pattern: ${strictLocationPattern}, Use strict for all: ${useStrictForAll}`,
      );

      // Add to existing $and or create new one
      query.$and = query.$and || [];
      query.$and.push({
        $or: [{ address: strictLocationRegex }, { title: titleRegex }],
      });
    }

    // Property type filter (can be multiple, comma-separated)
    // Don't override search query, add as additional filter
    if (req.query.propertyType) {
      const types = req.query.propertyType.split(",");
      const typeCondition = { $in: types.map((t) => new RegExp(t, "i")) };
      // Add to existing $and or create new one
      query.$and = query.$and || [];
      query.$and.push({ house_type: typeCondition });
    }

    // Price range
    if (req.query.minPrice || req.query.maxPrice) {
      query.$and = query.$and || [];
      if (req.query.minPrice) {
        query.$and.push({
          price: { $gte: parseFloat(req.query.minPrice) },
        });
      }
      if (req.query.maxPrice) {
        query.$and.push({
          price: { $lte: parseFloat(req.query.maxPrice) },
        });
      }
    }

    // Rooms filter
    if (req.query.rooms) {
      const roomsQuery = {
        $gte: [
          {
            $convert: {
              input: "$beds",
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
          parseInt(req.query.rooms),
        ],
      };
      query.$and = query.$and || [];
      query.$and.push({ $expr: roomsQuery });
    }

    // Bathrooms filter
    if (req.query.toilets) {
      const toiletsQuery = {
        $gte: [
          {
            $convert: {
              input: "$baths",
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
          parseInt(req.query.toilets),
        ],
      };
      query.$and = query.$and || [];
      query.$and.push({ $expr: toiletsQuery });
    }

    // Min size filter
    if (req.query.minSize) {
      const sizeQuery = {
        $gte: [
          { $toDouble: { $ifNull: ["$sqft", "0"] } },
          parseFloat(req.query.minSize),
        ],
      };
      query.$and = query.$and || [];
      query.$and.push({ $expr: sizeQuery });
    }

    // Build sort object
    let sortStage = {};
    if (req.query.sortBy) {
      const direction = req.query.sortDirection === "desc" ? -1 : 1;

      switch (req.query.sortBy) {
        case "price":
          sortStage = { price: direction };
          break;
        case "area":
          sortStage = { sqftNumeric: direction };
          break;
        case "name":
          sortStage = { title: direction };
          break;
        case "date":
          sortStage = { date_listed: direction };
          break;
        default:
          sortStage = { _id: -1 };
      }
    } else {
      sortStage = { _id: -1 }; // Default sort by newest
    }

    // Get total count for pagination info
    const totalCount = await db
      .collection("properties20Jan")
      .countDocuments(query);

    // Use aggregation pipeline to handle type conversion for sorting
    const pipeline = [
      { $match: query },
      {
        $addFields: {
          sqftNumeric: {
            $convert: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: {
                        $replaceAll: {
                          input: { $toString: { $ifNull: ["$sqft", 0] } },
                          find: "sq.ft.",
                          replacement: "",
                        },
                      },
                      find: ",",
                      replacement: "",
                    },
                  },
                  find: " ",
                  replacement: "",
                },
              },
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      { $sort: sortStage },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          sqftNumeric: 0,
        },
      },
    ];

    // Fetch paginated properties using aggregation
    const properties = await db
      .collection("properties20Jan")
      .aggregate(pipeline)
      .toArray();

    res.json({
      properties,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        pageSize: limit,
        hasMore: skip + properties.length < totalCount,
      },
    });
  } catch (error) {
    console.error("❌ /api/properties error:", error);
    console.error("Error details:", error.message);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});


// --- SMART LISTING (Step 2): Candidate selection based on user preferences ---
router.get("/smart-listing", async (req, res) => {
  try {
    const db = await connectToDatabase();

    // Parse user preferences from query string
    const preferences = req.query.preferences
      ? JSON.parse(req.query.preferences)
      : null;

    if (!preferences) {
      // No preferences, fallback to regular listing
      const queryParams = new URLSearchParams(req.query).toString();
      return res.redirect(307, `/api/properties?${queryParams}`);
    }

    console.log("📊 Smart listing with preferences:", preferences);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 60;
    const skip = (page - 1) * limit;

    let recommendedProperties = [];
    let candidateIds = [];

    // Only fetch recommended candidates on page 1
    if (page === 1) {
      const candidateQuery = {
        address: new RegExp(preferences.dominant_location, "i"),
        price: {
          $gte: Math.floor(preferences.avg_price * 0.6),
          $lte: Math.ceil(preferences.avg_price * 1.4),
        },
        house_type: new RegExp(preferences.dominant_type, "i"),
        furnishing: new RegExp(preferences.furnishing_preference, "i"),
      };

      // Add bedroom preference (±1 room tolerance)
      if (preferences.avg_beds > 0) {
        candidateQuery.$expr = {
          $and: [
            {
              $gte: [
                {
                  $convert: {
                    input: "$beds",
                    to: "double",
                    onError: 0,
                    onNull: 0,
                  },
                },
                preferences.avg_beds - 1,
              ],
            },
            {
              $lte: [
                {
                  $convert: {
                    input: "$beds",
                    to: "double",
                    onError: 0,
                    onNull: 0,
                  },
                },
                preferences.avg_beds + 1,
              ],
            },
          ],
        };
      }

      console.log("🔍 Candidate query:", candidateQuery);

      const candidates = await db
        .collection("properties20Jan")
        .find(candidateQuery)
        .limit(50)
        .toArray();

      candidateIds = candidates.map((c) => c._id);
      recommendedProperties = candidates.map((prop) => ({
        ...prop,
        is_recommended: true,
      }));

      console.log(
        `✅ Found ${candidates.length} recommended candidates for ${preferences.dominant_location}`
      );
    }

    // Normal query - always exclude recommended IDs to prevent duplicates
    const normalQuery =
      candidateIds.length > 0 ? { _id: { $nin: candidateIds } } : {};

    // Calculate skip and limit for normal properties
    const normalSkip = page === 1 ? 0 : skip - recommendedProperties.length;
    const normalLimit =
      page === 1 ? limit - recommendedProperties.length : limit;

    const normalProperties = await db
      .collection("properties20Jan")
      .find(normalQuery)
      .skip(Math.max(0, normalSkip))
      .limit(normalLimit)
      .toArray();

    // Merge: recommended first (page 1 only), then normal
    const mergedProperties = [...recommendedProperties, ...normalProperties];

    const totalNormal = await db
      .collection("properties20Jan")
      .countDocuments(normalQuery);
    const totalWithRecommended = totalNormal + recommendedProperties.length;

    console.log(
      `🔀 Page ${page}: ${recommendedProperties.length} recommended + ${normalProperties.length} normal = ${mergedProperties.length} total`
    );

    res.json({
      properties: mergedProperties,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalWithRecommended / limit),
        totalCount: totalWithRecommended,
        pageSize: limit,
        hasMore: skip + mergedProperties.length < totalWithRecommended,
      },
      recommendedCount: recommendedProperties.length,
    });
  } catch (error) {
    console.error("❌ /api/properties/smart-listing error:", error);
    res.status(500).json({ error: "Failed to fetch smart listing" });
  }
});

// --- PERSONALIZED PROPERTIES (Module 4): Get top 100 ranked properties based on user preferences ---
router.get("/personalized", async (req, res) => {
  console.log("🎯 /api/properties/personalized called");
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Authentication required" });

  const secret = process.env.JWT_SECRET || "dev-secret";
  try {
    const decoded = jwt.verify(token, secret);
    const { userId } = decoded;

    const db = await connectToDatabase();

    // Get user preferences
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).json({ error: "User not found" });

    const prefs = user.preferences || {};

    console.log(
      "User preferences for personalized properties:",
      JSON.stringify(prefs, null, 2),
    );

    // Normalize field names for compatibility
    const minSize = prefs.min_size_sqft || prefs.ideal_size_sqft;
    const normalizedPrefs = {
      ...prefs,
      min_size_sqft: minSize,
    };

    console.log(
      "Normalized preferences:",
      JSON.stringify(normalizedPrefs, null, 2),
    );

    // Check if user has set any preferences
    const hasPreferences =
      (normalizedPrefs.preferred_locations &&
        normalizedPrefs.preferred_locations.length > 0) ||
      (normalizedPrefs.budget_range &&
        (normalizedPrefs.budget_range.min != null ||
          normalizedPrefs.budget_range.max != null)) ||
      (normalizedPrefs.preferred_types &&
        normalizedPrefs.preferred_types.length > 0) ||
      (normalizedPrefs.keywords && normalizedPrefs.keywords.length > 0) ||
      normalizedPrefs.min_size_sqft != null ||
      (normalizedPrefs.rooms &&
        (normalizedPrefs.rooms.min != null ||
          normalizedPrefs.rooms.max != null)) ||
      (normalizedPrefs.toilets &&
        (normalizedPrefs.toilets.min != null ||
          normalizedPrefs.toilets.max != null));

    console.log("Has preferences:", hasPreferences);

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // FR_12: Fall back to default ranking (by recency) if no preferences
    if (!hasPreferences) {
      console.log(
        "No preferences found. Using default ranking by recency. Showing only 50 newest listings.",
      );

      // Only show top 50 newest listings, no pagination
      const rawProperties = await db
        .collection("properties20Jan")
        .find({})
        .sort({ date_listed: -1 }) // Sort by newest first
        .limit(50)
        .toArray();

      // Convert price to numeric format for consistency
      const properties = rawProperties.map((prop) => {
        let priceNumeric = prop.price;
        if (typeof prop.price === "string") {
          const cleaned = prop.price
            .replace(/RM/gi, "")
            .replace(/,/g, "")
            .replace(/\s/g, "")
            .trim();
          priceNumeric = parseFloat(cleaned) || 0;
        } else if (typeof prop.price === "number") {
          priceNumeric = prop.price;
        }
        return { ...prop, price: priceNumeric };
      });

      return res.json({
        properties,
        isPersonalized: false,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: properties.length,
          pageSize: 50,
          hasMore: false,
        },
      });
    }

    // Build aggregation pipeline for scoring
    const pipeline = [
      {
        $addFields: {
          priceNumeric: {
            $cond: {
              if: { $eq: [{ $type: "$price" }, "string"] },
              then: {
                $convert: {
                  input: {
                    $trim: {
                      input: {
                        $replaceAll: {
                          input: {
                            $replaceAll: {
                              input: {
                                $replaceAll: {
                                  input: "$price",
                                  find: "RM",
                                  replacement: "",
                                },
                              },
                              find: ",",
                              replacement: "",
                            },
                          },
                          find: " ",
                          replacement: "",
                        },
                      },
                    },
                  },
                  to: "double",
                  onError: 0,
                  onNull: 0,
                },
              },
              else: { $toDouble: "$price" },
            },
          },
          sqftNumeric: {
            $convert: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: {
                        $replaceAll: {
                          input: { $toString: { $ifNull: ["$sqft", 0] } },
                          find: "sq.ft.",
                          replacement: "",
                        },
                      },
                      find: ",",
                      replacement: "",
                    },
                  },
                  find: " ",
                  replacement: "",
                },
              },
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
          bedsNumeric: {
            $convert: {
              input: {
                $trim: {
                  input: {
                    $arrayElemAt: [
                      { $split: [{ $toString: "$beds" }, " "] },
                      0,
                    ],
                  },
                },
              },
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
          bathsNumeric: {
            $convert: {
              input: {
                $trim: {
                  input: {
                    $arrayElemAt: [
                      { $split: [{ $toString: "$baths" }, " "] },
                      0,
                    ],
                  },
                },
              },
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      {
        $addFields: {
          // Store individual component scores for demo logging
          locationScore: {
            $cond: {
              if:
                normalizedPrefs.preferred_locations &&
                normalizedPrefs.preferred_locations.length > 0,
              then: {
                $multiply: [
                  {
                    $cond: {
                      if: {
                        $gt: [
                          {
                            $size: {
                              $filter: {
                                input: normalizedPrefs.preferred_locations,
                                as: "loc",
                                cond: {
                                  $regexMatch: {
                                    input: { $toLower: "$address" },
                                    regex: {
                                      $concat: [
                                        "(^|\\s|,)",
                                        { $toLower: "$$loc" },
                                        "(?!\\d|[a-zA-Z])",
                                      ],
                                    },
                                    options: "i",
                                  },
                                },
                              },
                            },
                          },
                          0,
                        ],
                      },
                      then: 1,
                      else: 0,
                    },
                  },
                  40,
                ],
              },
              else: 0,
            },
          },
          priceScore: {
            // Price match score (0-30 points) - IMPROVED: Continuous scoring with smooth decay
            $cond: {
              if:
                normalizedPrefs.budget_range &&
                (normalizedPrefs.budget_range.min != null ||
                  normalizedPrefs.budget_range.max != null),
              then: {
                $let: {
                  vars: {
                    minBudget: {
                      $ifNull: [normalizedPrefs.budget_range.min, 0],
                    },
                    maxBudget: {
                      $ifNull: [normalizedPrefs.budget_range.max, 999999999],
                    },
                    price: "$priceNumeric",
                  },
                  in: {
                    $cond: {
                      // Within range - full 30 points
                      if: {
                        $and: [
                          { $gte: ["$$price", "$$minBudget"] },
                          { $lte: ["$$price", "$$maxBudget"] },
                        ],
                      },
                      then: 30,
                      else: {
                        // Outside range - smooth decay based on percentage difference
                        $let: {
                          vars: {
                            percentDiff: {
                              $cond: {
                                if: { $lt: ["$$price", "$$minBudget"] },
                                then: {
                                  $divide: [
                                    {
                                      $subtract: ["$$minBudget", "$$price"],
                                    },
                                    "$$minBudget",
                                  ],
                                },
                                else: {
                                  $divide: [
                                    {
                                      $subtract: ["$$price", "$$maxBudget"],
                                    },
                                    "$$maxBudget",
                                  ],
                                },
                              },
                            },
                          },
                          in: {
                            $max: [
                              0,
                              {
                                $subtract: [
                                  30,
                                  { $multiply: ["$$percentDiff", 300] },
                                ],
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
              else: 0,
            },
          },
          typeScore: {
            $cond: {
              if:
                normalizedPrefs.preferred_types &&
                normalizedPrefs.preferred_types.length > 0,
              then: {
                $max: {
                  $map: {
                    input: normalizedPrefs.preferred_types,
                    as: "prefType",
                    in: {
                      $let: {
                        vars: {
                          prefTypeLower: { $toLower: "$$prefType" },
                          houseTypeLower: { $toLower: "$house_type" },
                        },
                        in: {
                          $cond: [
                            // Exact match - 15 points
                            {
                              $regexMatch: {
                                input: "$$houseTypeLower",
                                regex: "$$prefTypeLower",
                                options: "i",
                              },
                            },
                            15,
                            // Similar types - partial points
                            {
                              $switch: {
                                branches: [
                                  // Condominium → Service Residence
                                  {
                                    case: {
                                      $and: [
                                        {
                                          $regexMatch: {
                                            input: "$$prefTypeLower",
                                            regex: "condominium",
                                            options: "i",
                                          },
                                        },
                                        {
                                          $regexMatch: {
                                            input: "$$houseTypeLower",
                                            regex: "service residence",
                                            options: "i",
                                          },
                                        },
                                      ],
                                    },
                                    then: 12,
                                  },
                                  // Condominium → Apartment
                                  {
                                    case: {
                                      $and: [
                                        {
                                          $regexMatch: {
                                            input: "$$prefTypeLower",
                                            regex: "condominium",
                                            options: "i",
                                          },
                                        },
                                        {
                                          $regexMatch: {
                                            input: "$$houseTypeLower",
                                            regex: "apartment",
                                            options: "i",
                                          },
                                        },
                                      ],
                                    },
                                    then: 10,
                                  },
                                  // Service Residence → Condominium
                                  {
                                    case: {
                                      $and: [
                                        {
                                          $regexMatch: {
                                            input: "$$prefTypeLower",
                                            regex: "service residence",
                                            options: "i",
                                          },
                                        },
                                        {
                                          $regexMatch: {
                                            input: "$$houseTypeLower",
                                            regex: "condominium",
                                            options: "i",
                                          },
                                        },
                                      ],
                                    },
                                    then: 12,
                                  },
                                  // Apartment → Condominium
                                  {
                                    case: {
                                      $and: [
                                        {
                                          $regexMatch: {
                                            input: "$$prefTypeLower",
                                            regex: "apartment",
                                            options: "i",
                                          },
                                        },
                                        {
                                          $regexMatch: {
                                            input: "$$houseTypeLower",
                                            regex: "condominium",
                                            options: "i",
                                          },
                                        },
                                      ],
                                    },
                                    then: 10,
                                  },
                                  // Terrace → Townhouse
                                  {
                                    case: {
                                      $and: [
                                        {
                                          $regexMatch: {
                                            input: "$$prefTypeLower",
                                            regex: "terrace",
                                            options: "i",
                                          },
                                        },
                                        {
                                          $regexMatch: {
                                            input: "$$houseTypeLower",
                                            regex: "townhouse",
                                            options: "i",
                                          },
                                        },
                                      ],
                                    },
                                    then: 12,
                                  },
                                  // Townhouse → Terrace
                                  {
                                    case: {
                                      $and: [
                                        {
                                          $regexMatch: {
                                            input: "$$prefTypeLower",
                                            regex: "townhouse",
                                            options: "i",
                                          },
                                        },
                                        {
                                          $regexMatch: {
                                            input: "$$houseTypeLower",
                                            regex: "terrace",
                                            options: "i",
                                          },
                                        },
                                      ],
                                    },
                                    then: 12,
                                  },
                                  // Semi-D → Bungalow
                                  {
                                    case: {
                                      $and: [
                                        {
                                          $regexMatch: {
                                            input: "$$prefTypeLower",
                                            regex:
                                              "semi-detached|semi detached",
                                            options: "i",
                                          },
                                        },
                                        {
                                          $regexMatch: {
                                            input: "$$houseTypeLower",
                                            regex: "bungalow",
                                            options: "i",
                                          },
                                        },
                                      ],
                                    },
                                    then: 8,
                                  },
                                  // Bungalow → Semi-D
                                  {
                                    case: {
                                      $and: [
                                        {
                                          $regexMatch: {
                                            input: "$$prefTypeLower",
                                            regex: "bungalow",
                                            options: "i",
                                          },
                                        },
                                        {
                                          $regexMatch: {
                                            input: "$$houseTypeLower",
                                            regex:
                                              "semi-detached|semi detached",
                                            options: "i",
                                          },
                                        },
                                      ],
                                    },
                                    then: 8,
                                  },
                                ],
                                default: 0,
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
              else: 0,
            },
          },
          sizeScore: {
            $cond: {
              if: normalizedPrefs.min_size_sqft,
              then: {
                $let: {
                  vars: {
                    minSize: normalizedPrefs.min_size_sqft,
                    actualSize: "$sqftNumeric",
                  },
                  in: {
                    $cond: {
                      // Meets or exceeds requirement - full 10 points
                      if: { $gte: ["$$actualSize", "$$minSize"] },
                      then: 10,
                      // Below requirement - smooth decay
                      else: {
                        $let: {
                          vars: {
                            percentDiff: {
                              $divide: [
                                {
                                  $subtract: ["$$minSize", "$$actualSize"],
                                },
                                "$$minSize",
                              ],
                            },
                          },
                          in: {
                            $max: [
                              0,
                              {
                                $subtract: [
                                  10,
                                  { $multiply: ["$$percentDiff", 100] },
                                ],
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
              else: 0,
            },
          },
          roomsScore: {
            $cond: {
              if: normalizedPrefs.rooms != null,
              then: {
                $max: [
                  0,
                  {
                    $subtract: [
                      3,
                      {
                        $abs: {
                          $subtract: ["$bedsNumeric", normalizedPrefs.rooms],
                        },
                      },
                    ],
                  },
                ],
              },
              else: 0,
            },
          },
          bathsScore: {
            $cond: {
              if: normalizedPrefs.toilets != null,
              then: {
                $max: [
                  0,
                  {
                    $subtract: [
                      2,
                      {
                        $abs: {
                          $subtract: ["$bathsNumeric", normalizedPrefs.toilets],
                        },
                      },
                    ],
                  },
                ],
              },
              else: 0,
            },
          },
          facilitiesScore: {
            $cond: {
              if:
                normalizedPrefs.keywords && normalizedPrefs.keywords.length > 0,
              then: {
                $let: {
                  vars: {
                    matchedKeywords: {
                      $size: {
                        $filter: {
                          input: normalizedPrefs.keywords,
                          as: "keyword",
                          cond: {
                            $or: [
                              {
                                $regexMatch: {
                                  input: "$title",
                                  regex: "$$keyword",
                                  options: "i",
                                },
                              },
                              {
                                $regexMatch: {
                                  input: "$address",
                                  regex: "$$keyword",
                                  options: "i",
                                },
                              },
                              {
                                $in: [
                                  {
                                    $toLower: "$$keyword",
                                  },
                                  {
                                    $map: {
                                      input: {
                                        $ifNull: ["$facilities", []],
                                      },
                                      as: "facility",
                                      in: { $toLower: "$$facility" },
                                    },
                                  },
                                ],
                              },
                            ],
                          },
                        },
                      },
                    },
                    totalKeywords: normalizedPrefs.keywords.length,
                  },
                  in: {
                    $multiply: [
                      {
                        $divide: ["$$matchedKeywords", "$$totalKeywords"],
                      },
                      5,
                    ],
                  },
                },
              },
              else: 0,
            },
          },
        },
      },
      {
        $addFields: {
          score: {
            $add: [
              "$locationScore",
              "$priceScore",
              "$typeScore",
              "$sizeScore",
              "$roomsScore",
              "$bathsScore",
              "$facilitiesScore",
            ],
          },
        },
      },

      // Only show properties with score > 0
      { $match: { score: { $gt: 0 } } },
      // Sort by score descending
      { $sort: { score: -1 } },
      // Limit to top 100 before pagination
      { $limit: 100 },
    ];

    // Get total count of scored properties
    console.log("Running aggregation pipeline...");
    const scoredProperties = await db
      .collection("properties20Jan")
      .aggregate(pipeline)
      .toArray();
    console.log(`Found ${scoredProperties.length} properties with score > 0`);

    // ===== DEMO LOGGING: Show Top 5 Ranked Properties with Component Scores =====
    if (scoredProperties.length > 0) {
      console.log("\n" + "=".repeat(80));
      console.log("PERSONALIZED RANKING ALGORITHM - LIVE CALCULATION");
      console.log("=".repeat(80));
      console.log(`USER PREFERENCES:`);
      console.log(
        `   Budget: RM ${(normalizedPrefs.budget_range?.min || 0).toLocaleString()} - RM ${(normalizedPrefs.budget_range?.max || 999999999).toLocaleString()}`,
      );
      console.log(
        `   Locations: ${normalizedPrefs.preferred_locations.join(", ") || "Any"}`,
      );
      console.log(
        `   Types: ${normalizedPrefs.preferred_types.join(", ") || "Any"}`,
      );
      console.log(
        `   Min Size: ${normalizedPrefs.min_size_sqft || "Any"} sqft`,
      );
      if (normalizedPrefs.rooms)
        console.log(`   Rooms: ${normalizedPrefs.rooms}`);
      if (normalizedPrefs.toilets)
        console.log(`   Bathrooms: ${normalizedPrefs.toilets}`);
      console.log("=".repeat(80));
      console.log(
        "SCORING SYSTEM: Location (40) + Price (30) + Type (15) + Size (10) + Rooms (3) + Baths (2) + Facilities (5) = 105",
      );
      console.log("=".repeat(80) + "\n");

      scoredProperties.slice(0, 5).forEach((prop, index) => {
        const rank = index + 1;
        const price = prop.priceNumeric || 0;
        const locationScore = prop.locationScore || 0;
        const priceScore = prop.priceScore || 0;
        const typeScore = prop.typeScore || 0;
        const sizeScore = prop.sizeScore || 0;
        const roomsScore = prop.roomsScore || 0;
        const bathsScore = prop.bathsScore || 0;
        const facilitiesScore = prop.facilitiesScore || 0;

        console.log(`RANK #${rank}`);
        console.log("-".repeat(80));
        console.log(`Property: ${prop.title}`);
        console.log(
          `Location: ${prop.address?.substring(0, 65)}${prop.address?.length > 65 ? "..." : ""}`,
        );
        console.log(
          `Type: ${prop.house_type}  |  Price: RM ${price.toLocaleString()}`,
        );
        console.log(
          `Size: ${prop.sqft}  |  Beds: ${prop.beds}  |  Baths: ${prop.baths}`,
        );
        console.log("-".repeat(80));
        console.log(`SCORE BREAKDOWN:`);
        console.log(
          `   Location Match:    ${locationScore.toFixed(1).padStart(5)} / 40.0`,
        );
        console.log(
          `   Price Match:       ${priceScore.toFixed(1).padStart(5)} / 30.0`,
        );
        console.log(
          `   Type Match:        ${typeScore.toFixed(1).padStart(5)} / 15.0`,
        );
        console.log(
          `   Size Match:        ${sizeScore.toFixed(1).padStart(5)} / 10.0`,
        );
        console.log(
          `   Rooms Match:       ${roomsScore.toFixed(1).padStart(5)} / 3.0`,
        );
        console.log(
          `   Bathrooms Match:   ${bathsScore.toFixed(1).padStart(5)} / 2.0`,
        );
        console.log(
          `   Facilities Match:  ${facilitiesScore.toFixed(1).padStart(5)} / 5.0`,
        );
        console.log("-".repeat(80));
        console.log(`TOTAL RELEVANCE SCORE: ${prop.score.toFixed(1)} / 105.0`);
        console.log("=".repeat(80) + "\n");
      });

      console.log(
        "NOTE: Higher scores indicate better match to your preferences\n",
      );
    }
    // ===== END DEMO LOGGING =====

    const totalCount = scoredProperties.length;

    // Apply pagination to the scored results
    const paginatedProperties = scoredProperties.slice(skip, skip + limit);

    // Remove temporary numeric fields and score from response
    const cleanedProperties = paginatedProperties.map((prop) => {
      const {
        priceNumeric,
        sqftNumeric,
        bedsNumeric,
        bathsNumeric,
        score,
        ...rest
      } = prop;
      // Return price from priceNumeric to ensure it's always a number
      return { ...rest, price: priceNumeric };
    });

    console.log(
      `Returning ${cleanedProperties.length} properties for page ${page}`,
    );

    res.json({
      properties: cleanedProperties,
      isPersonalized: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        pageSize: limit,
        hasMore: skip + cleanedProperties.length < totalCount,
      },
    });
  } catch (error) {
    console.error("❌ Personalized properties error:", error);
    console.error("Error message:", error.message);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      error: "Failed to fetch personalized properties",
      details: error.message,
    });
  }
});

router.post("/search", async (req, res) => {
  try {
    const filters = parseFilters(req.body.filters);
    console.log("Received Filters:", filters);
    const db = await connectToDatabase();
    const results = await searchProperties(db, filters);
    res.json(results);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();

    // Validate ObjectId format
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid property ID format" });
    }

    const property = await db.collection("properties20Jan").findOne(
      { _id: new ObjectId(req.params.id) },
      {
        projection: {
          url: 1,
          title: 1,
          address: 1,
          price: 1,
          beds: 1,
          baths: 1,
          sqft: 1,
          psf: 1,
          house_type: 1,
          furnishing: 1,
          lease_type: 1,
          date_listed: 1,
          images: 1,
          facilities: 1,
          historical_prices: 1,
        },
      },
    );

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Transform historical_prices to priceHistory format if it exists
    if (
      property.historical_prices &&
      Array.isArray(property.historical_prices)
    ) {
      property.priceHistory = property.historical_prices
        .map((entry) => {
          // Extract numeric price value from string like "RM 1.1M" or "RM 640K"
          let priceNum = 0;
          if (entry.price) {
            const priceStr = entry.price.replace(/RM\s*/i, "").trim();
            if (priceStr.endsWith("M")) {
              priceNum = parseFloat(priceStr) * 1000000;
            } else if (priceStr.endsWith("K")) {
              priceNum = parseFloat(priceStr) * 1000;
            } else {
              priceNum = parseFloat(priceStr.replace(/,/g, ""));
            }
          }

          return {
            date: entry.date || "",
            price: Math.round(priceNum),
          };
        })
        .reverse(); // Reverse to show chronological order (oldest first)
    } else {
      property.priceHistory = [];
    }

    res.json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch property" });
  }
});

module.exports = router;
