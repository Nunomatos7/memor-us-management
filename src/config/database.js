// src/config/database.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

// This pool is kept for backward compatibility
// Prefer using prisma client directly
const tenantsPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

tenantsPool.on("error", (err) => {
  console.error("Unexpected error on tenants pool", err);
});

export { tenantsPool };
