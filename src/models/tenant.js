const { tenantsPool } = require("../config/database");
const schemaManager = require("../utils/schemaManager");
const crypto = require("crypto");

class TenantModel {
  async createTenant(name, subdomain, adminId) {
    const client = await tenantsPool.connect();

    try {
      await client.query("BEGIN");

      const schemaName = subdomain.replace(/[^a-z0-9]/gi, "_").toLowerCase();

      const existingTenant = await client.query(
        "SELECT id FROM tenants WHERE subdomain = $1 OR schema_name = $2",
        [subdomain, schemaName]
      );

      if (existingTenant.rows.length > 0) {
        throw new Error("Tenant com este subdomínio já existe");
      }

      const insertQuery = `
        INSERT INTO tenants(name, subdomain, schema_name, status, created_by_admin_id)
        VALUES($1, $2, $3, $4, $5)
        RETURNING id;
      `;

      const result = await client.query(insertQuery, [
        name,
        subdomain,
        schemaName,
        "active",
        adminId,
      ]);
      const tenantId = result.rows[0].id;

      await client.query(
        "INSERT INTO logs(super_admins_id, action) VALUES($1, $2);",
        [adminId, `Created new tenant: ${name} (${subdomain})`]
      );

      await client.query("COMMIT");

      await schemaManager.createSchema(schemaName);

      return { id: tenantId, schema: schemaName };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error creating tenant:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getTenantBySubdomain(subdomain) {
    const result = await tenantsPool.query(
      "SELECT id, name, subdomain, schema_name, status FROM tenants WHERE subdomain = $1 AND deleted_at IS NULL",
      [subdomain]
    );

    return result.rows[0] || null;
  }

  async getTenantById(id) {
    const result = await tenantsPool.query(
      "SELECT id, name, subdomain, schema_name, status, created_at, updated_at FROM tenants WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );

    return result.rows[0] || null;
  }

  async getAllTenants() {
    const result = await tenantsPool.query(
      "SELECT id, name, subdomain, schema_name, status, created_at FROM tenants WHERE deleted_at IS NULL ORDER BY created_at DESC"
    );

    return result.rows;
  }

  async updateTenant(id, name, status, adminId) {
    const client = await tenantsPool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `UPDATE tenants 
         SET name = $1, status = $2, updated_at = NOW()
         WHERE id = $3 AND deleted_at IS NULL
         RETURNING id, name, subdomain, schema_name, status, updated_at`,
        [name, status, id]
      );

      if (result.rows.length === 0) {
        throw new Error("Tenant not found");
      }

      await client.query(
        "INSERT INTO logs(super_admins_id, action) VALUES($1, $2);",
        [
          adminId,
          `Updated tenant: ID ${id} - Name: "${name}", Status: "${status}"`,
        ]
      );

      await client.query("COMMIT");

      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error updating tenant:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteTenant(id, adminId) {
    const client = await tenantsPool.connect();
  
    try {
      await client.query("BEGIN");
  
      const tenantResult = await client.query(
        "SELECT id, name, schema_name FROM tenants WHERE id = $1 AND deleted_at IS NULL",
        [id]
      );
  
      if (tenantResult.rows.length === 0) {
        throw new Error("Tenant not found");
      }
  
      const tenant = tenantResult.rows[0];
  
      await client.query(
        "UPDATE tenants SET deleted_at = NOW(), status = $1 WHERE id = $2",
        ["terminated", id]
      );
  
      await client.query(
        "INSERT INTO logs(super_admins_id, action) VALUES($1, $2);",
        [adminId, `Deleted tenant: ${tenant.name} (ID: ${id})`]
      );
  
      await client.query("COMMIT");
  
      return { success: true, name: tenant.name, id: tenant.id };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error deleting tenant:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async initializeTenantData(schemaName, adminUser, tenantName, subdomain) {
    const schemaStatus = await schemaManager.verifySchemaSetup(schemaName);

    if (!schemaStatus.users_exists) {
      console.error(
        `Schema ${schemaName} is missing required tables. Attempting to recreate...`
      );
      await schemaManager.createSchema(schemaName);

      const verifyAgain = await schemaManager.verifySchemaSetup(schemaName);
      if (!verifyAgain.users_exists) {
        throw new Error(
          `Failed to create required tables in schema ${schemaName}`
        );
      }
    }

    const client = await schemaManager.getTenantConnection(schemaName);

    try {
      await client.query("BEGIN");

      const { firstName, lastName, email, password } = adminUser;

      const hashedPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

      const userResult = await client.query(
        `INSERT INTO users(
          first_name, last_name, email, password, tenant_subdomain, teams_id
        ) VALUES($1, $2, $3, $4, $5, NULL)
        RETURNING id;`,
        [firstName, lastName, email, hashedPassword, subdomain]
      );

      const userId = userResult.rows[0].id;

      await client.query("INSERT INTO roles(title, user_id) VALUES($1, $2);", [
        "admin",
        userId,
      ]);

      await client.query("COMMIT");
      console.log(
        `Successfully initialized tenant data for ${schemaName} with admin user ID: ${userId}`
      );
      return { success: true, userId };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error initializing tenant data:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async logAdminAction(adminId, action) {
    try {
      await tenantsPool.query(
        "INSERT INTO logs(super_admins_id, action) VALUES($1, $2);",
        [adminId, action]
      );
      return true;
    } catch (error) {
      console.error("Error logging admin action:", error);
      return false;
    }
  }
}

module.exports = new TenantModel();
