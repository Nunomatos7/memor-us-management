import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

// Only care about the tenant management database
const TENANT_DATABASE_URL = process.env.DATABASE_URL;

console.log(`Tenant Management DATABASE_URL: ${TENANT_DATABASE_URL}`);

function migrateTenantManagementSchema() {
  console.log(`Migrating tenant management database`);

  execSync(`npx prisma migrate deploy`, {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: TENANT_DATABASE_URL,
    },
  });
}

function migrateAndGenerate() {
  console.log("=== Migrating Tenant Management Database ===");
  migrateTenantManagementSchema();

  console.log("=== Generating Prisma Client ===");
  execSync("npx prisma generate", {
    stdio: "inherit",
  });
}

migrateAndGenerate();
