const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OpenAI } = require("openai");

// Load environment variables
dotenv.config();

const app = express();
// Allow overriding the port via environment (useful if 5000 is occupied on macOS)
const port = process.env.PORT || 5001;
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Allow cross-origin requests from the frontend and include credentials (cookies)
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const db = await connectToDatabase();
    
    // Find user by email
    const user = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    
    // Return generic error (don't reveal if email exists)
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Compare plain password with hashed password
    const valid = bcrypt.compareSync(password, user.hashed_password);
    
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Password correct - proceed with login
    // Generate JWT token (see next section)
    
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const db = await connectToDatabase();
    
    // Find user by email
    const user = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    
    // Return generic error (don't reveal if email exists)
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Compare plain password with hashed password
    const valid = bcrypt.compareSync(password, user.hashed_password);
    
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Password correct - proceed with login
    // Generate JWT token (see next section)
    
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const db = await connectToDatabase();
    
    // Find user by email
    const user = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    
    // Return generic error (don't reveal if email exists)
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Compare plain password with hashed password
    const valid = bcrypt.compareSync(password, user.hashed_password);
    
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Password correct - proceed with login
    // Generate JWT token (see next section)
    
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const db = await connectToDatabase();
    
    // Find user by email
    const user = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    
    // Return generic error (don't reveal if email exists)
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Compare plain password with hashed password
    const valid = bcrypt.compareSync(password, user.hashed_password);
    
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Password correct - proceed with login
    // Generate JWT token (see next section)
    
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});
app.use(cookieParser());

// Middleware to parse JSON
app.use(express.json());

// MongoDB connection setup
const client = new MongoClient(process.env.MONGODB_URI);

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

// Routes
app.get("/api/properties", async (req, res) => {
  try {
    const db = await connectToDatabase();

    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 60;
    const skip = (page - 1) * limit;

    // Build MongoDB query from filters
    const query = {};

    // Search query (keywords)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { title: searchRegex },
        { address: searchRegex },
        { house_type: searchRegex },
        { facilities: { $in: [searchRegex] } },
      ];
    }

    // Property type filter (can be multiple, comma-separated)
    if (req.query.propertyType) {
      const types = req.query.propertyType.split(",");
      query.house_type = { $in: types.map((t) => new RegExp(t, "i")) };
    }

    // Price range
    if (req.query.minPrice || req.query.maxPrice) {
      query.$and = query.$and || [];
      if (req.query.minPrice) {
        query.$and.push({
          $expr: {
            $gte: [
              { $toDouble: { $ifNull: ["$price", "0"] } },
              parseFloat(req.query.minPrice),
            ],
          },
        });
      }
      if (req.query.maxPrice) {
        query.$and.push({
          $expr: {
            $lte: [
              { $toDouble: { $ifNull: ["$price", "0"] } },
              parseFloat(req.query.maxPrice),
            ],
          },
        });
      }
    }

    // Rooms filter
    if (req.query.rooms) {
      query.$expr = query.$expr || {};
      const roomsQuery = {
        $gte: [
          { $toDouble: { $ifNull: ["$beds", "0"] } },
          parseInt(req.query.rooms),
        ],
      };
      if (query.$and) {
        query.$and.push({ $expr: roomsQuery });
      } else {
        query.$expr = roomsQuery;
      }
    }

    // Bathrooms filter
    if (req.query.toilets) {
      const toiletsQuery = {
        $gte: [
          { $toDouble: { $ifNull: ["$baths", "0"] } },
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
          sortStage = { priceNumeric: direction };
          break;
        case "area":
          sortStage = { sqftNumeric: direction };
          break;
        case "name":
          sortStage = { title: direction };
          break;
        default:
          sortStage = { _id: -1 };
      }
    } else {
      sortStage = { _id: -1 }; // Default sort by newest
    }

    // Get total count for pagination info
    const totalCount = await db
      .collection("properties19nov")
      .countDocuments(query);

    // Use aggregation pipeline to handle type conversion for sorting
    const pipeline = [
      { $match: query },
      {
        $addFields: {
          priceNumeric: {
            $convert: {
              input: {
                $cond: {
                  if: { $eq: [{ $type: "$price" }, "string"] },
                  then: {
                    $replaceAll: {
                      input: {
                        $replaceAll: {
                          input: {
                            $replaceAll: {
                              input: { $ifNull: ["$price", "0"] },
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
                  else: "$price",
                },
              },
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
          sqftNumeric: {
            $convert: {
              input: {
                $cond: {
                  if: { $eq: [{ $type: "$sqft" }, "string"] },
                  then: {
                    $replaceAll: {
                      input: {
                        $replaceAll: {
                          input: {
                            $replaceAll: {
                              input: { $ifNull: ["$sqft", "0"] },
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
                  else: "$sqft",
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
          priceNumeric: 0,
          sqftNumeric: 0,
        },
      },
    ];

    // Fetch paginated properties using aggregation
    const properties = await db
      .collection("properties19nov")
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
    console.error(error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// --- PERSONALIZED PROPERTIES (Module 4): Get top 100 ranked properties based on user preferences ---
app.get("/api/properties/personalized", async (req, res) => {
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
      JSON.stringify(prefs, null, 2)
    );

    // Normalize field names for compatibility
    const minSize = prefs.min_size_sqft || prefs.ideal_size_sqft;
    const normalizedPrefs = {
      ...prefs,
      min_size_sqft: minSize,
    };

    console.log(
      "Normalized preferences:",
      JSON.stringify(normalizedPrefs, null, 2)
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
      normalizedPrefs.rooms != null ||
      normalizedPrefs.toilets != null;

    console.log("Has preferences:", hasPreferences);

    if (!hasPreferences) {
      return res.json({
        properties: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          pageSize: 60,
          hasMore: false,
        },
      });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 60;
    const skip = (page - 1) * limit;

    // Build aggregation pipeline for scoring
    const pipeline = [
      {
        $addFields: {
          priceNumeric: {
            $convert: {
              input: {
                $cond: {
                  if: { $eq: [{ $type: "$price" }, "string"] },
                  then: {
                    $replaceAll: {
                      input: {
                        $replaceAll: {
                          input: {
                            $replaceAll: {
                              input: { $ifNull: ["$price", "0"] },
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
                  else: "$price",
                },
              },
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
          sqftNumeric: {
            $convert: {
              input: {
                $cond: {
                  if: { $eq: [{ $type: "$sqft" }, "string"] },
                  then: {
                    $replaceAll: {
                      input: {
                        $replaceAll: {
                          input: {
                            $replaceAll: {
                              input: { $ifNull: ["$sqft", "0"] },
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
                  else: "$sqft",
                },
              },
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
          bedsNumeric: {
            $convert: {
              input: "$beds",
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
          bathsNumeric: {
            $convert: {
              input: "$baths",
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      {
        $addFields: {
          score: {
            $add: [
              // Location match score (0-40 points) - Exact match with word boundaries
              {
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
                                            "(\\s|,|$)",
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
              // Price match score (0-30 points) - IMPROVED: Continuous scoring with smooth decay
              {
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
                          $ifNull: [
                            normalizedPrefs.budget_range.max,
                            999999999,
                          ],
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
              // Property type match (0-15 points) - IMPROVED: Similarity matrix for related types
              {
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
              // Size match (0-10 points) - IMPROVED: Smooth decay based on percentage difference
              {
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
              // Rooms match (0-3 points) - IMPROVED: Distance-based scoring
              {
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
                              $subtract: [
                                "$bedsNumeric",
                                normalizedPrefs.rooms,
                              ],
                            },
                          },
                        ],
                      },
                    ],
                  },
                  else: 0,
                },
              },
              // Bathrooms match (0-2 points) - IMPROVED: Distance-based scoring
              {
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
                              $subtract: [
                                "$bathsNumeric",
                                normalizedPrefs.toilets,
                              ],
                            },
                          },
                        ],
                      },
                    ],
                  },
                  else: 0,
                },
              },
              // Keywords match (0-5 points) - IMPROVED: Proportional scoring based on match ratio
              {
                $cond: {
                  if:
                    normalizedPrefs.keywords &&
                    normalizedPrefs.keywords.length > 0,
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
      .collection("properties19nov")
      .aggregate(pipeline)
      .toArray();
    console.log(`Found ${scoredProperties.length} properties with score > 0`);

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
      return rest;
    });

    console.log(
      `Returning ${cleanedProperties.length} properties for page ${page}`
    );

    res.json({
      properties: cleanedProperties,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        pageSize: limit,
        hasMore: skip + cleanedProperties.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Personalized properties error:", error);
    res.status(500).json({ error: "Failed to fetch personalized properties" });
  }
});

app.get("/api/properties/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const property = await db.collection("properties19nov").findOne(
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
        },
      }
    );

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
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
      model: "gpt-4o",
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
      max_tokens: 120,
      temperature: 0.3,
    });
    res.json({ reply: response.choices[0].message.content });
  } catch (error) {
    console.error("Error with OpenAI API:", error?.response?.data || error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

app.post("/api/properties/search", async (req, res) => {
  let { filters } = req.body;
  filters = JSON.parse(filters);
  console.log("Received Filters:", filters);
  try {
    const db = await connectToDatabase();

    // Stage 1: Basic filters
    const matchStage = {};
    if (filters.location)
      matchStage.address = { $regex: filters.location, $options: "i" };
    if (filters.house_type) matchStage.house_type = filters.house_type;
    if (filters.lease_type) matchStage.lease_type = filters.lease_type;
    
    if (filters.furnishing) {
      if (filters.furnishing.toLowerCase() === 'furnished') {
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
          $toInt: {
            $replaceAll: {
              input: {
                $replaceAll: { input: "$price", find: "RM ", replacement: "" },
              },
              find: ",",
              replacement: "",
            },
          },
        },
        beds_num: {
          $cond: {
            if: { $eq: ["$beds", "N/A"] },
            then: 0,
            else: { $toInt: "$beds" },
          },
        },
        baths_num: {
          $cond: {
            if: { $eq: ["$baths", "N/A"] },
            then: 0,
            else: { $toInt: "$baths" },
          },
        },
        sqft_num: {
          $convert: {
            input: {
              $replaceAll: { input: "$sqft", find: ",", replacement: "" },
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
    const results = await db
      .collection("properties19nov")
      .aggregate(pipeline)
      .toArray();
    res.json(results);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

INTENT_CLASSIFICATION_TEXT = `You are an intent classifier for a property chatbot.
Classify the user's intent into one of these three:
- "search" (the user wants to find,search properties)
- "question" (ONLY WHEN the user asks about your job,property info or concepts)
- "unknown" 
Return only JSON.`

QUESTION_TEXT=`You are an AI property assistant. 
            Answer user questions related to real estate in Malaysia. 
            Your job scope :  1. Answer property-related questions
🎯 2. Recommend properties that fit your preferences
🔍 3. Find property based on your criteria
📈 4. Show market price trends and insights
            Provide concise and accurate responses.`

PREFERENCES_SEARCH_TEXT = `You are a property assistant. 
            You must collect user preferences step-by-step... 
            ALWAYS return in JSON format
            When all main preferences are filled, say 'Search' in intent and provide the full preferences.
            If the user has no preference, set the value to null.
            If the user is unclear, ask for clarification.
            Give user example options for house_type, lease_type, furnishing, and facilities when asking for preferences.
            Condo = Condominium`


app.post("/api/chat/classify", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: INTENT_CLASSIFICATION_TEXT,
        },
        { role: "user", content: message },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intent_classification",
          schema: {
            type: "object",
            properties: {
              intent: {
                type: "string",
                enum: ["search", "question", "unknown"],
              },
            },
            required: ["intent"],
            additionalProperties: false,
          },
        },
      },
      max_tokens: 20,
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
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: QUESTION_TEXT,
        },
        { role: "user", content: message },
      ],
      max_tokens: 200,
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
  conversation.forEach(msg => {
    message.push({
      role: "user",
      content: msg.content
    });
  });

  try {
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: message,
      max_tokens: 150,
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

    // Set httpOnly cookie for session (dev defaults: not secure)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
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
    if (!user) return res.status(404).json({ error: "User not found" });

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
    console.error("Token verification error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
});

// --- AUTH: Logout (clear cookie) ---
app.post("/api/auth/logout", async (req, res) => {
  try {
    res.clearCookie("token", { path: "/" });
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
        { $set: { preferences: prefs } }
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

// Start the server
app.listen(port, async () => {
  const db = await connectToDatabase();

  console.log(`Backend server is running at http://localhost:${port}`);
});
