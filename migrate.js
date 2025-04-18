import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const { DATABASE_URL } = process.env;

console.log(`DATABASE_URL: ${DATABASE_URL}`);

const tenants = ["public"];

function migrateTenant(tenantId) {
  console.log(`Migrating schema: ${tenantId}`);
  const schemaUrl = `${DATABASE_URL}?schema=${tenantId}`;

  execSync(`npx prisma migrate deploy`, {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: schemaUrl,
    },
  });
}

function migrateAllTenants() {
  console.log("Migrating all tenants");
  for (const tenantId of tenants) {
    migrateTenant(tenantId);
  }
  console.log("Generating Prisma Client...");
  execSync("npx prisma generate", {
    stdio: "inherit",
  });
}

migrateAllTenants();
