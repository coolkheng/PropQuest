const { OpenAI } = require("openai");

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Model used for all chat calls. Override with OPENAI_MODEL in .env.
const OPENAI_MODEL = process.env.OPENAI_MODEL;

module.exports = { openai, OPENAI_MODEL };
