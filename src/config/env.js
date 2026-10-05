const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  databasePath:
    process.env.DATABASE_PATH ||
    path.join(__dirname, "../database/ecomap.db"),
  apiKey: process.env.ECOMAP_API_KEY || "",
};

module.exports = config;
