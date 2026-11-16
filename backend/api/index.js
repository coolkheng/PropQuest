const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OpenAI } = require("openai");

// Load environment variables
dotenv.config();

// DEVELOPMENT ONLY: Disable SSL verification if explicitly set
// WARNING: Never use this in production!
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
  console.warn(
    "⚠️  WARNING: SSL certificate verification is disabled. This should only be used in development!",
  );
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const app = express();
// Allow overriding the port via environment (useful if 5000 is occupied on macOS)
const port = process.env.PORT || 5001;
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Allow cross-origin requests from the frontend and include credentials (cookies)
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL, // Production Vercel URL
  process.env.FRONTEND_ORIGIN, // Legacy support
].filter(Boolean); // Remove undefined values

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // CRITICAL: Required for httpOnly cookies cross-domain
  }),
);

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// MongoDB connection setup with SSL options
const client = new MongoClient(process.env.MONGODB_URI, {
  tls: true,
  tlsAllowInvalidCertificates: process.env.NODE_ENV === "development",
  tlsAllowInvalidHostnames: process.env.NODE_ENV === "development",
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    return client.db("propertyguruPJ");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Model used for all chat calls. Override with OPENAI_MODEL in .env.
const OPENAI_MODEL = process.env.OPENAI_MODEL;

// Routes
app.get("/api/properties", async (req, res) => {
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
app.get("/api/properties/smart-listing", async (req, res) => {
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
app.get("/api/properties/personalized", async (req, res) => {
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

app.get("/api/properties/:id", async (req, res) => {
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

// Chatbot Route
app.post("/api/chat/search", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      reasoning_effort: "none", // reasoning off: required for temperature, and keeps replies fast/cheap
      messages: [
        {
          role: "system",
          content:
            "Extract property search parameters as concise JSON. Use only fields that the user specified. Omit fields not mentioned. Return JSON only and strictly capitalize the first Letter of data name but not the field name.No shortforms(Condo = Condominium).",
        },
        { role: "user", content: message },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "property_filters",
          schema: {
            type: "object",
            properties: {
              price_min: { type: "integer", nullable: true },
              price_max: { type: "integer", nullable: true },
              location: { type: "string", nullable: true },
              beds_min: { type: "integer", nullable: true },
              baths_min: { type: "integer", nullable: true },
              sqft_min: { type: "integer", nullable: true },
              sqft_max: { type: "integer", nullable: true },
              house_type: { type: "string", nullable: true },
              lease_type: { type: "string", nullable: true },
              furnishing: { type: "string", nullable: true },
              facilities: {
                type: "array",
                items: { type: "string" },
                nullable: true,
              },
            },
            additionalProperties: false,
            required: [],
          },
        },
      },
      max_completion_tokens: 120,
      temperature: 0.3,
    });
    res.json({ reply: response.choices[0].message.content });
  } catch (error) {
    console.error("Error with OpenAI API:", error?.response?.data || error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

app.post("/api/properties/search", async (req, res) => {
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

// Filters may arrive as a JSON string (from /api/chat/search) or an object.
function parseFilters(filters) {
  if (!filters) return {};
  return typeof filters === "string" ? JSON.parse(filters) : filters;
}

// Runs the dynamic aggregation pipeline for the given filters and returns all matches.
async function searchProperties(db, filters) {
    // Stage 1: Basic filters
    const matchStage = {};
    if (filters.location)
      matchStage.address = { $regex: filters.location, $options: "i" };
    if (filters.house_type) matchStage.house_type = filters.house_type;
    if (filters.lease_type) matchStage.lease_type = filters.lease_type;

    if (filters.furnishing) {
      if (filters.furnishing.toLowerCase() === "furnished") {
        matchStage.furnishing = { $regex: /furnished/i };
      } else {
        matchStage.furnishing = filters.furnishing;
      }
    }

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
    console.log("Aggregation Pipeline:", JSON.stringify(pipeline, null, 2));
    return db.collection("properties20Jan").aggregate(pipeline).toArray();
}

// ---------------------------------------------------------------------------
// RAG: answer from retrieved listings
// ---------------------------------------------------------------------------

// Caps that keep the prompt (and cost) roughly flat per message.
const RAG_TOP_N = 8; // listings sent to the model in detail
const RAG_DETAILS_CHARS = 400; // characters of each listing's description
const RAG_HISTORY_MESSAGES = 4; // earlier chat messages sent with a follow-up
const RAG_HISTORY_CHARS = 800; // max characters per history message

const RAG_ANSWER_TEXT = `You are PropQuest's property assistant for Malaysia.
Answer the user's QUESTION using ONLY the DATA provided (search filters, stats over all matches, and the top listings).
Rules:
- Never invent listings, prices, facilities or facts that are not in DATA. If DATA does not cover something (e.g. schools, transport), say so briefly.
- "stats" describe ALL matches; "listings" are only the best-value few (lowest price per sqft) shown in detail. Make that clear when it matters.
- Prices are in RM. Format like RM 650,000 or RM 650k. psf = price per square foot.
- Refer to listings by title (and address if titles repeat). Never write ids in the reply text; put the ids of the listings you recommend or single out in recommended_ids instead.
- If there are no matches, say so and suggest which filter to loosen.
- Be concise: a one-line summary, then up to 3 short bullet points. Use Markdown bold for listing names.`;

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function toNumber(v) {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Summary numbers over ALL results, computed in code so the model can't get them wrong.
function buildStats(results) {
  const prices = results.map((p) => toNumber(p.price)).filter((n) => n > 0);
  const psfs = results.map((p) => toNumber(p.psf)).filter((n) => n > 0);
  const byType = {};
  results.forEach((p) => {
    const t = p.house_type || "Unknown";
    byType[t] = (byType[t] || 0) + 1;
  });
  return {
    total_matches: results.length,
    price: prices.length
      ? { min: Math.min(...prices), median: median(prices), max: Math.max(...prices) }
      : null,
    median_psf: median(psfs),
    by_type: byType,
  };
}

// Pick the listings to show the model in detail: best value (lowest price per sqft).
// Every result already matches the user's filters (budget included), so value is the
// most useful tie-breaker. Listings without a valid psf go last.
function sortByValue(results) {
  const psf = (p) => toNumber(p.psf) || Infinity;
  return [...results].sort((a, b) => psf(a) - psf(b));
}

// Trimmed listing for the prompt: key facts only, no images/urls.
function toContextItem(doc) {
  const details = String(doc.details || "").replace(/\s+/g, " ").trim();
  return {
    id: String(doc._id),
    title: doc.title,
    address: doc.address,
    price: toNumber(doc.price),
    beds: doc.beds,
    baths: doc.baths,
    sqft: toNumber(doc.sqft),
    psf: toNumber(doc.psf),
    house_type: doc.house_type,
    furnishing: doc.furnishing,
    lease_type: doc.lease_type,
    facilities: Array.isArray(doc.facilities) ? doc.facilities : [],
    date_listed: String(doc.date_listed || "").replace(/^Listed on\s*/i, ""),
    details:
      details.length > RAG_DETAILS_CHARS
        ? details.slice(0, RAG_DETAILS_CHARS) + "…"
        : details,
    price_history: Array.isArray(doc.historical_prices)
      ? doc.historical_prices.slice(0, 3).map((h) => ({ date: h.date, price: h.price }))
      : [],
  };
}

// Only keep the last few user/assistant text messages; never trust the client to cap it.
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (m) =>
        m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
    )
    .slice(-RAG_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, RAG_HISTORY_CHARS) }));
}

// Load listings by id (for follow-ups), keeping the order the user saw them in.
async function findPropertiesByIds(db, ids) {
  const clean = ids.filter((id) => typeof id === "string").slice(0, RAG_TOP_N);
  const objectIds = clean.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const docs = await db
    .collection("properties20Jan")
    .find({ _id: { $in: [...objectIds, ...clean] } })
    .toArray();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  return clean.map((id) => byId.get(id)).filter(Boolean);
}

app.post("/api/chat/answer", async (req, res) => {
  const { message, propertyIds, history } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  const isFollowUp = Array.isArray(propertyIds) && propertyIds.length > 0;
  let filters = {};
  let results;
  let top;

  // 1. Retrieve
  try {
    const db = await connectToDatabase();
    if (isFollowUp) {
      top = await findPropertiesByIds(db, propertyIds);
      results = top;
    } else {
      filters = parseFilters(req.body.filters);
      // Best value first: the map only pins the first 100, so the AI's picks are always on it
      results = sortByValue(await searchProperties(db, filters));
      top = results.slice(0, RAG_TOP_N);
    }
  } catch (error) {
    console.error("RAG retrieval error:", error);
    return res.status(500).json({ error: "Search failed" });
  }

  const stats = buildStats(results);
  const contextIds = top.map((p) => String(p._id));
  const payload = {
    // Follow-ups return no new properties, so the map keeps what it shows.
    properties: isFollowUp ? undefined : results,
    stats,
    context_ids: contextIds,
  };

  // 2. Augment
  const data = {
    ...(isFollowUp ? {} : { filters }),
    stats: isFollowUp ? { ...stats, note: "stats over the listings being discussed" } : stats,
    listings: top.map(toContextItem),
  };
  const messages = [
    { role: "system", content: RAG_ANSWER_TEXT },
    ...sanitizeHistory(history),
    {
      role: "user",
      content: `DATA:\n${JSON.stringify(data)}\n\nQUESTION: ${message}`,
    },
  ];

  // 3. Generate
  try {
    const openaiResponse = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      reasoning_effort: "none",
      messages,
      max_completion_tokens: 500,
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "rag_answer",
          strict: true,
          schema: {
            type: "object",
            properties: {
              reply: { type: "string" },
              recommended_ids: { type: "array", items: { type: "string" } },
            },
            required: ["reply", "recommended_ids"],
            additionalProperties: false,
          },
        },
      },
    });
    console.log("RAG token usage:", openaiResponse.usage);
    const { reply, recommended_ids } = JSON.parse(
      openaiResponse.choices[0].message.content,
    );
    // Only keep ids that were actually in the context.
    const recommended = recommended_ids.filter((id) => contextIds.includes(id));
    res.json({ ...payload, reply, recommended_ids: recommended });
  } catch (error) {
    // The model failing should never break search: fall back to a plain message.
    console.error("RAG generation error:", error?.response?.data || error);
    res.json({
      ...payload,
      reply: isFollowUp
        ? "Sorry, I couldn't answer that right now. Please try again."
        : `I found ${results.length} properties matching your criteria. Check them out on the map!`,
      recommended_ids: [],
      fallback: true,
    });
  }
});

INTENT_CLASSIFICATION_TEXT = `You are an intent classifier for a property chatbot.
Classify the user's intent into one of these three:
- "search" (the user wants to find,search properties)
- "question" (ONLY WHEN the user asks about your job,property info or concepts)
- "unknown (if the intent is unclear and when search question does not specific enough )"
Return only JSON.`;

// Added to the classifier prompt only when listings are currently shown to the user.
const FOLLOWUP_CLASSIFICATION_TEXT = `
The user is currently looking at search results. Also allow:
- "followup" (the user asks about, compares, ranks or wants more detail on the listings already shown, e.g. "which of these has a pool?", "compare the first two", "is the cheapest one freehold?", "tell me more about it")
Choose "search" instead if the user asks for a NEW or different search (new location, budget, type, etc.).`;

QUESTION_TEXT = `You are an AI property assistant. 
            Answer user questions related to real estate in Malaysia. 
            Your job scope :  1. Answer property-related questions
🎯 2. Recommend properties that fit your preferences
🔍 3. Find property based on your criteria
📈 4. Show market price trends and insights
            Provide concise and accurate responses.`;

PREFERENCES_SEARCH_TEXT = `You are a property assistant. 
            You must collect user preferences step-by-step... 
            ALWAYS return in JSON format
            When all main preferences are filled, say 'Search' in intent and provide the full preferences.
            If the user has no preference, set the value to null.
            If the user is unclear, ask for clarification.
            Give user example options for house_type, lease_type, furnishing, and facilities when asking for preferences.
            Condo = Condominium`;

app.post("/api/chat/classify", async (req, res) => {
  const { message, hasResults, lastAssistantMessage } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  const intents = hasResults
    ? ["search", "question", "followup", "unknown"]
    : ["search", "question", "unknown"];
  const messages = [
    {
      role: "system",
      content: INTENT_CLASSIFICATION_TEXT + (hasResults ? FOLLOWUP_CLASSIFICATION_TEXT : ""),
    },
  ];
  // The last AI reply helps tell "which one is cheapest?" (follow-up) from a new search.
  if (hasResults && typeof lastAssistantMessage === "string") {
    messages.push({ role: "assistant", content: lastAssistantMessage.slice(0, 500) });
  }
  messages.push({ role: "user", content: message });

  try {
    const openaiResponse = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      reasoning_effort: "none", // reasoning off: required for temperature, and keeps replies fast/cheap
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intent_classification",
          schema: {
            type: "object",
            properties: {
              intent: {
                type: "string",
                enum: intents,
              },
            },
            required: ["intent"],
            additionalProperties: false,
          },
        },
      },
      max_completion_tokens: 20,
      temperature: 0,
    });
    console.log("OpenAI Response:", openaiResponse.choices[0].message.content);
    const intent = JSON.parse(openaiResponse.choices[0].message.content);

    res.json(intent);
  } catch (error) {
    console.error("Error with OpenAI API:", error?.response?.data || error);
    res.status(500).json({ error: "Failed to classify intent" });
  }
});

app.post("/api/chat/questions", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const openaiResponse = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      reasoning_effort: "none", // reasoning off: required for temperature, and keeps replies fast/cheap
      messages: [
        {
          role: "system",
          content: QUESTION_TEXT,
        },
        { role: "user", content: message },
      ],
      max_completion_tokens: 200,
      temperature: 0.7,
    });

    const reply = openaiResponse.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("Error with OpenAI API:", error?.response?.data || error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

// Endpoint to handle user preferences
app.post("/api/chat/preferences", async (req, res) => {
  const { conversation } = req.body;
  console.log("Received Conversation:", conversation);

  if (!conversation) {
    return res.status(400).json({ error: "Conversation is required" });
  }
  const message = [
    {
      role: "system",
      content: PREFERENCES_SEARCH_TEXT,
    },
  ];

  // Add conversation messages with role
  conversation.forEach((msg) => {
    message.push({
      role: "user",
      content: msg.content,
    });
  });

  try {
    const openaiResponse = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      reasoning_effort: "none", // reasoning off: required for temperature, and keeps replies fast/cheap
      messages: message,
      max_completion_tokens: 150,
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "property_preference_schema",
          schema: {
            type: "object",
            properties: {
              intent: {
                type: "string",
                enum: ["ask", "search"],
              },
              question_asking_preferences: {
                type: ["string", "null"],
                enum: [
                  "price_min",
                  "price_max",
                  "beds_min",
                  "baths_min",
                  "sqft_min",
                  "sqft_max",
                  "house_type",
                  "lease_type",
                  "furnishing",
                  "facilities",
                ],
              },
              question: {
                type: ["string", "null"],
              },
              preferences: {
                type: "object",
                properties: {
                  price_min: { type: "integer", nullable: true },
                  price_max: { type: "integer", nullable: true },
                  beds_min: { type: "integer", nullable: true },
                  baths_min: { type: "integer", nullable: true },
                  sqft_min: { type: "integer", nullable: true },
                  sqft_max: { type: "integer", nullable: true },
                  house_type: { type: "string", nullable: true },
                  lease_type: { type: "string", nullable: true },
                  furnishing: { type: "string", nullable: true },
                  facilities: {
                    type: "array",
                    items: { type: "string" },
                    nullable: true,
                  },
                },
              },
            },
            required: ["intent", "question"],
            additionalProperties: false,
          },
        },
      },
    });

    const reply = JSON.parse(openaiResponse.choices[0].message.content);
    res.json({ reply });
  } catch (error) {
    console.error("Error with OpenAI API:", error?.response?.data || error);
    res.status(500).json({ error: "Failed to process preferences" });
  }
});

// --- AUTH: Register new user ---
app.post("/api/auth/register", async (req, res) => {
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
app.post("/api/auth/login", async (req, res) => {
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
app.get("/api/auth/me", async (req, res) => {
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
app.post("/api/auth/logout", async (req, res) => {
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

// --- USER PREFERENCES: Get current user's preferences ---
app.get("/api/users/me/preferences", async (req, res) => {
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
app.post("/api/users/me/preferences", async (req, res) => {
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

// Health check endpoint for NFR_03 (uptime monitoring)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Start the server
app.listen(port, async () => {
  const db = await connectToDatabase();

  console.log(`Backend server is running at http://localhost:${port}`);
});
