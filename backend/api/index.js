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
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Correct model name
      messages: [{ role: "user", content: message }],
      max_tokens: 150,
      temperature: 0.7,
    });

    res.json({ reply: response.choices[0].message.content.trim() });
  } catch (error) {
    console.error("Error with OpenAI API:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

// Start the server
app.listen(port, async () => {
  const db = await connectToDatabase();
  console.log(`Backend server is running at http://localhost:${port}`);
});
