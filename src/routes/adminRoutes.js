const express = require("express");
const adminController = require("../controllers/adminController");
const router = express.Router();

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     description: Authenticate as a super admin
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Admin email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Admin password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: Admin ID
 *                     name:
 *                       type: string
 *                       description: Admin name
 *                     email:
 *                       type: string
 *                       description: Admin email
 *                     isSuperAdmin:
 *                       type: boolean
 *                       description: Whether the user is a super admin
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.post("/login", adminController.login);

/**
 * @swagger
 * /api/admin/profile:
 *   get:
 *     summary: Get admin profile
 *     description: Retrieve the authenticated admin's profile
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: Admin ID
 *                 name:
 *                   type: string
 *                   description: Admin name
 *                 email:
 *                   type: string
 *                   description: Admin email address
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   description: Account creation date
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not a super admin
 *       404:
 *         description: Admin not found
 *       500:
 *         description: Internal server error
 */
router.get("/profile", adminController.getProfile);

/**
 * @swagger
 * /api/admin/profile:
 *   put:
 *     summary: Update admin profile
 *     description: Update the authenticated admin's profile
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 description: Admin name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Admin email address
 *               currentPassword:
 *                 type: string
 *                 description: Current password (required for password change)
 *               newPassword:
 *                 type: string
 *                 description: New password
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Unauthorized - Invalid password or token
 *       403:
 *         description: Forbidden - Not a super admin
 *       404:
 *         description: Admin not found
 *       500:
 *         description: Internal server error
 */
router.put("/profile", adminController.updateProfile);

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: Get system logs
 *     description: Retrieve system activity logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of logs per page
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       action:
 *                         type: string
 *                       performed_at:
 *                         type: string
 *                         format: date-time
 *                       admin_id:
 *                         type: integer
 *                       admin_name:
 *                         type: string
 *                       admin_email:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalLogs:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not a super admin
 *       500:
 *         description: Internal server error
 */
router.get("/logs", adminController.getLogs);

module.exports = router;
