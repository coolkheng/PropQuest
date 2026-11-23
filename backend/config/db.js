const { MongoClient } = require("mongodb");

// MongoDB connection setup with SSL options
const client = new MongoClient(process.env.MONGODB_URI, {
  tls: true,
  tlsAllowInvalidCertificates: process.env.NODE_ENV === "development",
  tlsAllowInvalidHostnames: process.env.NODE_ENV === "development",
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

// Connect once and reuse the same connection for every request.
let dbPromise = null;

async function connectToDatabase() {
  if (!dbPromise) {
    dbPromise = client
      .connect()
      .then(() => {
        console.log("Connected to MongoDB");
        return client.db("propertyguruPJ");
      })
      .catch((error) => {
        dbPromise = null; // allow a retry on the next request
        console.error("MongoDB connection error:", error);
        throw error;
      });
  }
  return dbPromise;
}

module.exports = { client, connectToDatabase };
