// Entry point: app setup, middleware and route mounting.
// Route handlers live in ../routes, logic in ../services, AI prompts in ../prompts.
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

// Load environment variables (must run before requiring config/routes)
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

const { connectToDatabase } = require("../config/db");
const { optionalAuth } = require("../middleware/optionalAuth");
const { ensureIndexes } = require("../services/memory");

// Routes
app.use("/api/auth", require("../routes/auth.routes"));
app.use("/api/users", require("../routes/users.routes"));
app.use("/api/properties", require("../routes/properties.routes"));
app.use("/api/chat", optionalAuth, require("../routes/chat.routes"));

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
  try {
    await ensureIndexes(db); // creates chat_sessions + TTL index on first run
  } catch (error) {
    console.error("Failed to create chat_sessions indexes:", error);
  }

  console.log(`Backend server is running at http://localhost:${port}`);
});
