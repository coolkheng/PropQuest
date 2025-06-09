// test-mongo-connection.js
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri =
  "mongodb+srv://eugeneseeyile:OCq53AHzYGGwdrnH@propertygurupj.scuh1vk.mongodb.net/?retryWrites=true&w=majority&appName=propertyguruPJ";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "✅ Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
