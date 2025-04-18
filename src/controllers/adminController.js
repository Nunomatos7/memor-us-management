// src/controllers/adminController.js
import { prisma } from "../utils/prisma.js";
import auth from "../utils/auth.js";
import crypto from "crypto";

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

      // Find admin with matching email and password
      const admin = await prisma.super_admins.findFirst({
        where: {
          email,
          password_hash: hashedPassword,
          deleted_at: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!admin) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate JWT token
      const token = auth.generateToken({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        isSuperAdmin: true,
      });

      // Log the login action
      await prisma.logs.create({
        data: {
          super_admins_id: admin.id,
          action: `Admin login: ${admin.name} (${admin.email})`,
        },
      });

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

      // Get admin profile
      const admin = await prisma.super_admins.findUnique({
        where: {
          id: adminId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          created_at: true,
        },
      });

      if (!admin) {
        return res.status(404).json({ error: "Admin not found" });
      }

      // Log the profile view
      await prisma.logs.create({
        data: {
          super_admins_id: adminId,
          action: "Viewed admin profile",
        },
      });

      return res.json(admin);
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

      // Get current admin data
      const admin = await prisma.super_admins.findUnique({
        where: {
          id: adminId,
        },
        select: {
          id: true,
          password_hash: true,
        },
      });

      if (!admin) {
        return res.status(404).json({ error: "Admin not found" });
      }

      // Prepare update data
      const updateData = {
        name,
        email,
        updated_at: new Date(),
      };

      // Handle password change if requested
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            error: "Current password is required to set a new password",
          });
        }

        const currentHashedPassword = crypto
          .createHash("sha256")
          .update(currentPassword)
          .digest("hex");

        if (currentHashedPassword !== admin.password_hash) {
          return res
            .status(401)
            .json({ error: "Current password is incorrect" });
        }

        const newHashedPassword = crypto
          .createHash("sha256")
          .update(newPassword)
          .digest("hex");

        updateData.password_hash = newHashedPassword;
      }

      // Update admin profile
      await prisma.super_admins.update({
        where: {
          id: adminId,
        },
        data: updateData,
      });

      // Log the profile update
      await prisma.logs.create({
        data: {
          super_admins_id: adminId,
          action: newPassword
            ? `Updated admin profile with password change: ${name} (${email})`
            : `Updated admin profile: ${name} (${email})`,
        },
      });

      // Get updated admin data to return
      const updatedAdmin = await prisma.super_admins.findUnique({
        where: {
          id: adminId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          created_at: true,
          updated_at: true,
        },
      });

      return res.json(updatedAdmin);
    } catch (error) {
      console.error("Error updating admin profile:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getLogs(req, res) {
    try {
      const adminId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      // Log this action
      await prisma.logs.create({
        data: {
          super_admins_id: adminId,
          action: `Viewed system logs (page ${page}, limit ${limit})`,
        },
      });

      // Get logs with admin info
      const logs = await prisma.logs.findMany({
        include: {
          super_admins: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          performed_at: "desc",
        },
        take: limit,
        skip,
      });

      // Format logs to match the expected response structure
      const formattedLogs = logs.map((log) => ({
        id: log.id,
        action: log.action,
        performed_at: log.performed_at,
        admin_id: log.super_admins?.id,
        admin_name: log.super_admins?.name,
        admin_email: log.super_admins?.email,
      }));

      // Count total logs for pagination
      const totalLogs = await prisma.logs.count();

      return res.json({
        logs: formattedLogs,
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

export default new AdminController();
