// C:\Users\nunoe\Desktop\memor-us-management\src\utils\schemaManager.js
const { tenantsPool } = require("../config/database");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

class SchemaManager {
  constructor() {
    this.tablesScript = fs.readFileSync(
      path.join(__dirname, "../db/migrations/tenantTables.sql"),
      "utf8"
    );
    this.tenantAppApiUrl = process.env.TENANT_APP_API_URL || "http://localhost:3000";
    this.internalApiKey = process.env.INTERNAL_API_KEY || "your-secure-internal-api-key";
  }
  
  // This method now delegates schema creation to the tenant application API
  async createSchema(schemaName) {
    console.log(`Requesting schema creation: ${schemaName}`);
    
    try {
      // Call the Tenant Application API to create the schema
      const response = await axios.post(
        `${this.tenantAppApiUrl}/api/internal/schemas`, 
        { schemaName, tablesScript: this.tablesScript },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.internalApiKey
          }
        }
      );
      
      console.log(`Schema ${schemaName} creation response:`, response.data);
      return { success: true, schema: schemaName };
    } catch (error) {
      console.error(`Error creating schema ${schemaName}:`, error.message);
      if (error.response) {
        console.error('Error response data:', error.response.data);
      }
      throw error;
    }
  }

  // This method verifies schema setup via the tenant application API
  async verifySchemaSetup(schemaName) {
    try {
      const response = await axios.get(
        `${this.tenantAppApiUrl}/api/internal/schemas/${schemaName}/verify`,
        {
          headers: {
            'X-API-Key': this.internalApiKey
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error verifying schema ${schemaName}:`, error.message);
      throw error;
    }
  }
}

module.exports = new SchemaManager();