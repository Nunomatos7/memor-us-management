// src/utils/schemaManager.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

const { Pool } = pkg;
dotenv.config();

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SchemaManager {
  constructor() {
    this.tablesScript = fs.readFileSync(
      path.join(__dirname, "../db/migrations/tenantTables.sql"),
      "utf8"
    );

    // Initialize the main Prisma client for tenant management
    this.prisma = new PrismaClient();

    // Get the application database URL
    this.APP_DATABASE_URL =
      process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
    if (!this.APP_DATABASE_URL) {
      console.warn(
        "APP_DATABASE_URL not set, will fall back to DATABASE_URL for schema operations"
      );
    }
  }

  // Create schema directly in the application database
  async createSchema(schemaName) {
    console.log(`Creating schema: ${schemaName}`);

    try {
      // Use APP_DATABASE_URL for schema operations
      const dbUrl = this.APP_DATABASE_URL;
      if (!dbUrl) {
        throw new Error("No database URL available for application database");
      }

      // Create a connection to the application database
      const pool = new Pool({
        connectionString: dbUrl,
      });

      try {
        // First, create the schema
        await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        console.log(`Schema ${schemaName} created in application database.`);

        // Execute each SQL statement individually to ensure they all run
        // Split the SQL script by semicolons, but handle those inside parentheses correctly
        const statements = this.splitSqlStatements(this.tablesScript);

        for (const statement of statements) {
          if (statement.trim()) {
            // Set search path for each statement and execute it
            await pool.query(
              `SET search_path TO "${schemaName}"; ${statement}`
            );
          }
        }

        console.log(`Tables created in schema ${schemaName}`);

        // Verify tables were created
        const tableResult = await pool.query(
          `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = 'users'
        `,
          [schemaName]
        );

        if (tableResult.rows.length === 0) {
          throw new Error(`Failed to create tables in schema ${schemaName}`);
        }

        return { success: true, schema: schemaName };
      } finally {
        // Make sure to release the pool
        await pool.end();
      }
    } catch (error) {
      console.error(`Error creating schema ${schemaName}:`, error.message);
      throw error;
    }
  }

  // Helper method to split SQL statements properly
  splitSqlStatements(sqlScript) {
    // This is a simple approach - for more complex SQL you might need a proper parser
    const statements = [];
    let currentStatement = "";
    let parenthesesCount = 0;

    // Split by characters
    for (let i = 0; i < sqlScript.length; i++) {
      const char = sqlScript[i];

      // Track parentheses to avoid splitting inside them
      if (char === "(") parenthesesCount++;
      if (char === ")") parenthesesCount--;

      // Add character to current statement
      currentStatement += char;

      // If we hit a semicolon and we're not inside parentheses, end the statement
      if (char === ";" && parenthesesCount === 0) {
        statements.push(currentStatement);
        currentStatement = "";
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement);
    }

    return statements;
  }

  // This method verifies if the schema exists and has the required tables
  async verifySchemaSetup(schemaName) {
    try {
      const dbUrl = this.APP_DATABASE_URL;
      if (!dbUrl) {
        throw new Error("No database URL available for application database");
      }

      // Create a connection to the application database
      const pool = new Pool({
        connectionString: dbUrl,
      });

      try {
        // Check if the schema exists
        const schemaResult = await pool.query(
          `
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name = $1
        `,
          [schemaName]
        );

        const schemaExists = schemaResult.rows.length > 0;

        let usersTableExists = false;

        if (schemaExists) {
          // Check if the users table exists in the schema
          const tableResult = await pool.query(
            `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = 'users'
          `,
            [schemaName]
          );

          usersTableExists = tableResult.rows.length > 0;
        }

        return {
          schema_exists: schemaExists,
          users_exists: usersTableExists,
        };
      } finally {
        await pool.end();
      }
    } catch (error) {
      console.error(`Error verifying schema ${schemaName}:`, error.message);
      throw error;
    }
  }

  // Helper method to execute SQL directly in a specific schema
  async executeSqlInSchema(schemaName, sql, params = []) {
    try {
      const dbUrl = this.APP_DATABASE_URL;
      if (!dbUrl) {
        throw new Error("No database URL available for application database");
      }

      // Create a connection to the application database with the specified schema
      const pool = new Pool({
        connectionString: dbUrl,
      });

      try {
        // Set search path before executing SQL
        await pool.query(`SET search_path TO "${schemaName}"`);

        // Execute the actual query
        const result = await pool.query(sql, params);
        return result;
      } finally {
        await pool.end();
      }
    } catch (error) {
      console.error(
        `Error executing SQL in schema ${schemaName}:`,
        error.message
      );
      throw error;
    }
  }

  // This method is kept for backward compatibility
  async getTenantConnection(schemaName) {
    console.log(`Getting connection for schema: ${schemaName}`);

    try {
      const dbUrl = this.APP_DATABASE_URL;
      if (!dbUrl) {
        throw new Error("No database URL available for application database");
      }

      // Create a connection pool for the specific schema
      const pool = new Pool({
        connectionString: dbUrl,
      });

      // Set the search path right away
      await pool.query(`SET search_path TO "${schemaName}"`);

      return pool;
    } catch (error) {
      console.error(
        `Error getting tenant connection for schema ${schemaName}:`,
        error
      );
      throw error;
    }
  }
}

export default new SchemaManager();
