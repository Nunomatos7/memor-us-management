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

    // Initialize the main Prisma client
    this.prisma = new PrismaClient();
  }

  // Create schema directly in the database without using external API
  async createSchema(schemaName) {
    console.log(`Creating schema: ${schemaName}`);

    try {
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is not set");
      }

      // Create a connection to the database
      const pool = new Pool({
        connectionString: DATABASE_URL,
      });

      try {
        // Create the schema
        await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        console.log(`Schema ${schemaName} created.`);

        // Set the search path to the new schema and run the tables script
        const tablesResult = await pool.query(`
          SET search_path TO "${schemaName}";
          ${this.tablesScript}
        `);

        console.log(`Tables created in schema ${schemaName}`);
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

  // This method verifies if the schema exists and has the required tables
  async verifySchemaSetup(schemaName) {
    try {
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is not set");
      }

      // Create a connection to the database
      const pool = new Pool({
        connectionString: DATABASE_URL,
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
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is not set");
      }

      // Create a connection to the database with the specified schema
      const pool = new Pool({
        connectionString: `${DATABASE_URL}?schema=${schemaName}`,
      });

      try {
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
      // Use the DATABASE_URL from .env
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is not set");
      }

      // Create a connection pool for the specific schema
      const pool = new Pool({
        connectionString: `${DATABASE_URL}?schema=${schemaName}`,
      });

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
