const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");

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


// Start the server
app.listen(port, async () => {
  const db = await connectToDatabase();
  console.log(`Backend server is running at http://localhost:${port}`);
});
