const { Pool } = require("pg");
require("dotenv").config();

const tenantsPool = new Pool({
  host: process.env.TENANTS_DB_HOST,
  database: process.env.TENANTS_DB_NAME,
  user: process.env.TENANTS_DB_USER,
  password: process.env.TENANTS_DB_PASSWORD,
  port: process.env.TENANTS_DB_PORT,
});

tenantsPool.on("error", (err) => {
  console.error("Unexpected error on tenants pool", err);
});

module.exports = { tenantsPool };
