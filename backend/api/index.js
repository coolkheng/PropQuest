const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");

// Load environment variables
dotenv.config();

const app = express();
const port = 5000;
const cors = require("cors");
app.use(cors());

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const propertySchema = {
  type: "object",
  properties: {
    url: { type: "string" },
    title: { type: "string" },
    address: { type: "string" },
    price: { type: "string" },
    psf: { type: "string" },
    sqft: { type: "string" },
    beds: { type: "string" },
    baths: { type: "string" },
    house_type: { type: "string" },
    lease_type: { type: "string" },
    furnishing: { type: "string" },
    date_listed: { type: "string" },
    facilities: {
      type: "array",
      items: { type: "string" },
    },
    images: {
      type: "array",
      items: { type: "string" },
    },
  },
};

// Routes
app.get("/api/properties", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const properties = await db.collection("properties").find({}).toArray();
    res.json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

app.get("/api/properties/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const property = await db.collection("properties").findOne(
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
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Extract property search parameters as concise JSON. Use only fields that the user specified. Omit fields not mentioned. Return JSON only.",
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

  if (typeof filters === "string") {
    try {
      filters = JSON.parse(filters);
    } catch (e) {
      return res.status(400).json({ error: "Filters JSON string invalid" });
    }
  }
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return res.status(400).json({ error: "Filters must be an object" });
  }

  // Clean null/empty
  Object.keys(filters).forEach((k) => {
    const v = filters[k];
    if (v === null || v === undefined) delete filters[k];
    else if (Array.isArray(v) && v.length === 0) delete filters[k];
  });

  try {
    const db = await connectToDatabase();

    // Base (string / exact / regex) criteria first
    const baseMatch = {};
    if (filters.location)
      baseMatch.address = { $regex: filters.location, $options: "i" };
    if (filters.house_type) baseMatch.house_type = filters.house_type;
    if (filters.lease_type) baseMatch.lease_type = filters.lease_type;
    if (filters.furnishing) baseMatch.furnishing = filters.furnishing;
    if (filters.facilities) baseMatch.facilities = { $all: filters.facilities };

    // Determine if we need numeric transforms
    const needsNumeric = [
      "price_min",
      "price_max",
      "beds_min",
      "baths_min",
      "sqft_min",
      "sqft_max",
    ].some((k) => k in filters);

    let results;

    if (!needsNumeric) {
      // Simple find
      results = await db.collection("properties").find(baseMatch).toArray();
    } else {
      // Aggregation pipeline with numeric conversion using $regexReplace + $convert
      const addFieldsStage = {
        $addFields: {
          price_num: {
            $convert: {
              input: {
                $regexReplace: {
                  input: "$price",
                  regex: "[^0-9.]",
                  replacement: "",
                },
              },
              to: "double",
              onError: null,
              onNull: null,
            },
          },
          beds_num: {
            $convert: {
              input: {
                $regexReplace: {
                  input: "$beds",
                  regex: "[^0-9]",
                  replacement: "",
                },
              },
              to: "int",
              onError: null,
              onNull: null,
            },
          },
          baths_num: {
            $convert: {
              input: {
                $regexReplace: {
                  input: "$baths",
                  regex: "[^0-9]",
                  replacement: "",
                },
              },
              to: "int",
              onError: null,
              onNull: null,
            },
          },
          sqft_num: {
            $convert: {
              input: {
                $regexReplace: {
                  input: "$sqft",
                  regex: "[^0-9.]",
                  replacement: "",
                },
              },
              to: "double",
              onError: null,
              onNull: null,
            },
          },
        },
      };

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

      // Remove empty objects
      Object.keys(numericMatch).forEach((k) => {
        if (numericMatch[k] && Object.keys(numericMatch[k]).length === 0)
          delete numericMatch[k];
      });

      const pipeline = [{ $match: baseMatch }, addFieldsStage];
      if (Object.keys(numericMatch).length)
        pipeline.push({ $match: numericMatch });

      // Debug (optional - comment out in production)
      console.log("/api/properties/search filters=", filters);
      console.log("Pipeline=", JSON.stringify(pipeline, null, 2));

      results = await db.collection("properties").aggregate(pipeline).toArray();
    }

    res.json(results);
  } catch (error) {
    console.error("Error searching properties:", error);
    res.status(500).json({ error: "Failed to search properties" });
  }
});

// Start the server
app.listen(port, async () => {
  const db = await connectToDatabase();
  console.log(`Backend server is running at http://localhost:${port}`);
});
