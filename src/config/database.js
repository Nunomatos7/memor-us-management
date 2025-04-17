const { Pool } = require("pg");
require("dotenv").config();

const tenantsPool = new Pool({
  host: process.env.TENANTS_DB_HOST || "localhost",
  database: process.env.TENANTS_DB_NAME || "memor_us_tenanting",
  user: process.env.TENANTS_DB_USER || "postgres",
  password: process.env.TENANTS_DB_PASSWORD || "postgres",
  port: process.env.TENANTS_DB_PORT || 5432,
});

tenantsPool.on("error", (err) => {
  console.error("Unexpected error on tenants pool", err);
});

module.exports = { tenantsPool };