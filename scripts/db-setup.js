// scripts/db-setup.js
import dotenv from "dotenv";
import { createPool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const TENANT_DB_URL = process.env.DATABASE_URL;
const APP_DB_URL = process.env.APP_DATABASE_URL;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function confirmAction(message) {
  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === "y");
    });
  });
}

async function main() {
  console.log("💾 Database setup utility");
  console.log("========================");

  // Check database connection strings
  if (!TENANT_DB_URL) {
    console.error("❌ Error: DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  if (!APP_DB_URL) {
    console.error("❌ Error: APP_DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  try {
    // Create pools for both databases
    const tenantDbPool = createPool({
      connectionString: TENANT_DB_URL,
    });

    const appDbPool = createPool({
      connectionString: APP_DB_URL,
    });

    console.log("✅ Successfully connected to both databases");

    // Test tenant DB (memor_us_tenanting)
    const tenantDbResult = await tenantDbPool.query(
      "SELECT current_database()"
    );
    console.log(
      `📋 Connected to tenant management database: ${tenantDbResult.rows[0].current_database}`
    );

    // Test app DB (memor_us)
    const appDbResult = await appDbPool.query("SELECT current_database()");
    console.log(
      `📋 Connected to application database: ${appDbResult.rows[0].current_database}`
    );

    // Check if tables exist in tenant management DB
    const tenantTablesResult = await tenantDbPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tenants', 'super_admins', 'logs')
    `);

    if (tenantTablesResult.rows.length < 3) {
      console.log(
        "⚠️ Some required tables are missing in the tenant management database"
      );
      const shouldMigrate = await confirmAction(
        "Would you like to run migrations for the tenant management database?"
      );

      if (shouldMigrate) {
        console.log(
          "Running Prisma migrations for tenant management database..."
        );
        // You'd typically run a command like: npx prisma migrate deploy
        console.log(
          "✅ Prisma migrations would run here (please run 'npx prisma migrate deploy' manually)"
        );
      }
    } else {
      console.log("✅ Required tables exist in tenant management database");
    }

    // Option to sync existing tenants to app database
    const tenantsResult = await tenantDbPool.query(`
      SELECT id, name, subdomain, schema_name 
      FROM tenants 
      WHERE deleted_at IS NULL
    `);

    if (tenantsResult.rows.length > 0) {
      console.log(
        `📋 Found ${tenantsResult.rows.length} active tenants in tenant management database`
      );

      const shouldSync = await confirmAction(
        "Would you like to verify and sync tenant schemas to the application database?"
      );

      if (shouldSync) {
        // Load the tenant tables SQL script
        const tablesScript = fs.readFileSync(
          path.join(__dirname, "../src/db/migrations/tenantTables.sql"),
          "utf8"
        );

        console.log("🔄 Syncing tenant schemas to application database...");

        for (const tenant of tenantsResult.rows) {
          const { schema_name, name, subdomain } = tenant;

          // Check if schema exists in app database
          const schemaResult = await appDbPool.query(
            `
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name = $1
          `,
            [schema_name]
          );

          if (schemaResult.rows.length === 0) {
            console.log(
              `⚠️ Schema ${schema_name} for tenant ${name} (${subdomain}) does not exist in application database`
            );
            const shouldCreate = await confirmAction(
              `Create schema ${schema_name} in application database?`
            );

            if (shouldCreate) {
              try {
                // Create schema
                await appDbPool.query(
                  `CREATE SCHEMA IF NOT EXISTS "${schema_name}"`
                );
                console.log(`✅ Created schema ${schema_name}`);

                // Set search path and run tables script
                await appDbPool.query(`
                  SET search_path TO "${schema_name}";
                  ${tablesScript}
                `);
                console.log(`✅ Created tables in schema ${schema_name}`);
              } catch (error) {
                console.error(
                  `❌ Error creating schema ${schema_name}:`,
                  error.message
                );
              }
            }
          } else {
            console.log(
              `✅ Schema ${schema_name} for tenant ${name} (${subdomain}) exists in application database`
            );

            // Check if tables exist
            const tableResult = await appDbPool.query(
              `
              SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = $1 AND table_name = 'users'
            `,
              [schema_name]
            );

            if (tableResult.rows.length === 0) {
              console.log(`⚠️ Tables missing in schema ${schema_name}`);
              const shouldCreateTables = await confirmAction(
                `Create tables in schema ${schema_name}?`
              );

              if (shouldCreateTables) {
                try {
                  // Set search path and run tables script
                  await appDbPool.query(`
                    SET search_path TO "${schema_name}";
                    ${tablesScript}
                  `);
                  console.log(`✅ Created tables in schema ${schema_name}`);
                } catch (error) {
                  console.error(
                    `❌ Error creating tables in schema ${schema_name}:`,
                    error.message
                  );
                }
              }
            } else {
              console.log(`✅ Tables exist in schema ${schema_name}`);
            }
          }
        }
      }
    } else {
      console.log("ℹ️ No active tenants found in tenant management database");
    }

    console.log("💾 Database setup complete!");

    // Close DB connections and readline interface
    await tenantDbPool.end();
    await appDbPool.end();
    rl.close();
  } catch (error) {
    console.error("❌ Error:", error);
    rl.close();
    process.exit(1);
  }
}

main();
