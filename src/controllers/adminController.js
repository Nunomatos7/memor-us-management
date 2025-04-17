const { tenantsPool } = require("../config/database");
const auth = require("../utils/auth");
const crypto = require("crypto");
const tenantModel = require("../models/tenant");

class AdminController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const hashedPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

      const result = await tenantsPool.query(
        `SELECT id, name, email 
         FROM super_admins 
         WHERE email = $1 AND password_hash = $2 AND deleted_at IS NULL`,
        [email, hashedPassword]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const admin = result.rows[0];

      const token = auth.generateToken({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        isSuperAdmin: true,
      });

      await tenantsPool.query(
        "INSERT INTO logs(super_admins_id, action) VALUES($1, $2)",
        [admin.id, `Admin login: ${admin.name} (${admin.email})`]
      );

      return res.json({
        token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          isSuperAdmin: true,
        },
      });
    } catch (error) {
      console.error("Error during admin login:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getProfile(req, res) {
    try {
      const adminId = req.user.id;

      const result = await tenantsPool.query(
        "SELECT id, name, email, created_at FROM super_admins WHERE id = $1",
        [adminId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Admin not found" });
      }

      await tenantsPool.query(
        "INSERT INTO logs(super_admins_id, action) VALUES($1, $2)",
        [adminId, "Viewed admin profile"]
      );

      return res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateProfile(req, res) {
    try {
      const adminId = req.user.id;
      const { name, email, currentPassword, newPassword } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      await tenantsPool.query("BEGIN");

      const adminResult = await tenantsPool.query(
        "SELECT id, password_hash FROM super_admins WHERE id = $1",
        [adminId]
      );

      if (adminResult.rows.length === 0) {
        await tenantsPool.query("ROLLBACK");
        return res.status(404).json({ error: "Admin not found" });
      }

      if (newPassword) {
        if (!currentPassword) {
          await tenantsPool.query("ROLLBACK");
          return res
            .status(400)
            .json({
              error: "Current password is required to set a new password",
            });
        }

        const currentHashedPassword = crypto
          .createHash("sha256")
          .update(currentPassword)
          .digest("hex");

        if (currentHashedPassword !== adminResult.rows[0].password_hash) {
          await tenantsPool.query("ROLLBACK");
          return res
            .status(401)
            .json({ error: "Current password is incorrect" });
        }

        const newHashedPassword = crypto
          .createHash("sha256")
          .update(newPassword)
          .digest("hex");

        await tenantsPool.query(
          "UPDATE super_admins SET name = $1, email = $2, password_hash = $3, updated_at = NOW() WHERE id = $4",
          [name, email, newHashedPassword, adminId]
        );

        await tenantsPool.query(
          "INSERT INTO logs(super_admins_id, action) VALUES($1, $2)",
          [
            adminId,
            `Updated admin profile with password change: ${name} (${email})`,
          ]
        );
      } else {
        await tenantsPool.query(
          "UPDATE super_admins SET name = $1, email = $2, updated_at = NOW() WHERE id = $3",
          [name, email, adminId]
        );

        await tenantsPool.query(
          "INSERT INTO logs(super_admins_id, action) VALUES($1, $2)",
          [adminId, `Updated admin profile: ${name} (${email})`]
        );
      }

      await tenantsPool.query("COMMIT");

      const updatedResult = await tenantsPool.query(
        "SELECT id, name, email, created_at, updated_at FROM super_admins WHERE id = $1",
        [adminId]
      );

      return res.json(updatedResult.rows[0]);
    } catch (error) {
      await tenantsPool.query("ROLLBACK");
      console.error("Error updating admin profile:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getLogs(req, res) {
    try {
      const adminId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      await tenantsPool.query(
        "INSERT INTO logs(super_admins_id, action) VALUES($1, $2)",
        [adminId, `Viewed system logs (page ${page}, limit ${limit})`]
      );

      const result = await tenantsPool.query(
        `SELECT l.id, l.action, l.performed_at, 
                s.id as admin_id, s.name as admin_name, s.email as admin_email
         FROM logs l
         LEFT JOIN super_admins s ON l.super_admins_id = s.id
         ORDER BY l.performed_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const countResult = await tenantsPool.query("SELECT COUNT(*) FROM logs");
      const totalLogs = parseInt(countResult.rows[0].count);

      return res.json({
        logs: result.rows,
        pagination: {
          page,
          limit,
          totalLogs,
          totalPages: Math.ceil(totalLogs / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching logs:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new AdminController();
