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
    // Still need to fix the condo shortform issue
    // Make it match Condo, Condos, Condominium
    const matchStage = {};
    if (filters.location)
      matchStage.address = { $regex: filters.location, $options: "i" };
    if (filters.house_type) matchStage.house_type = filters.house_type;
    if (filters.lease_type) matchStage.lease_type = filters.lease_type;
    if (filters.furnishing) matchStage.furnishing = filters.furnishing;
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
      .collection("properties")
      .aggregate(pipeline)
      .toArray();
    res.json(results);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

app.post("/api/chat/classify", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Classify user intent as: 'search ', 'question', 'preference' or 'unknown. Return JSON only.",
        },
        { role: "user", content: message },
      ],
      max_tokens: 10,
      temperature: 0,
    });

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
          content:
            "You are an AI property assistant. Answer user questions related to real estate in Malaysia. Provide concise and accurate responses.",
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
  const { preference } = req.body;
  if (!preference) {
    return res.status(400).json({ error: "Preference is required" });
  }

  try {
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an AI property assistant. Respond to user preferences with personalized property suggestions.",
        },
        { role: "user", content: preference },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const reply = openaiResponse.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("Error with OpenAI API:", error?.response?.data || error);
    res.status(500).json({ error: "Failed to process preferences" });
  }
});

// Start the server
app.listen(port, async () => {
  const db = await connectToDatabase();

  console.log(`Backend server is running at http://localhost:${port}`);
});
