const express = require("express");
const tenantController = require("../controllers/tenantController");
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Tenant:
 *       type: object
 *       required:
 *         - name
 *         - subdomain
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the tenant
 *         name:
 *           type: string
 *           description: The name of the tenant
 *         subdomain:
 *           type: string
 *           description: The subdomain for the tenant
 *         schema_name:
 *           type: string
 *           description: Database schema name for the tenant
 *         status:
 *           type: string
 *           enum: [active, pending, deactivated, terminated]
 *           description: Current status of the tenant
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * /api/tenants:
 *   post:
 *     summary: Create a new tenant
 *     description: Create a new tenant with an admin user
 *     tags: [Tenants]
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
 *               - subdomain
 *               - adminId
 *               - adminUser
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the tenant
 *               subdomain:
 *                 type: string
 *                 description: Subdomain for the tenant (lowercase letters, numbers, and hyphens only)
 *               adminId:
 *                 type: integer
 *                 description: ID of the admin creating the tenant
 *               adminUser:
 *                 type: object
 *                 required:
 *                   - firstName
 *                   - lastName
 *                   - email
 *                   - password
 *                 properties:
 *                   firstName:
 *                     type: string
 *                     description: First name of the tenant admin
 *                   lastName:
 *                     type: string
 *                     description: Last name of the tenant admin
 *                   email:
 *                     type: string
 *                     format: email
 *                     description: Email of the tenant admin
 *                   password:
 *                     type: string
 *                     format: password
 *                     minLength: 6
 *                     description: Password for the tenant admin
 *     responses:
 *       201:
 *         description: Tenant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 tenantId:
 *                   type: integer
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not a super admin
 *       500:
 *         description: Internal server error
 */
router.post("/", tenantController.createTenant);

/**
 * @swagger
 * /api/tenants:
 *   get:
 *     summary: Get all tenants
 *     description: Retrieve a list of all tenants (requires super admin access)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of tenants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tenant'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not a super admin
 *       500:
 *         description: Internal server error
 */
router.get("/", tenantController.getAllTenants);

/**
 * @swagger
 * /api/tenants/check-subdomain/{subdomain}:
 *   get:
 *     summary: Check subdomain availability
 *     description: Check if a subdomain is available for use
 *     tags: [Tenants]
 *     parameters:
 *       - in: path
 *         name: subdomain
 *         required: true
 *         schema:
 *           type: string
 *         description: The subdomain to check
 *     responses:
 *       200:
 *         description: Subdomain availability status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                   description: Whether the subdomain is available
 *       400:
 *         description: Bad request - Missing subdomain
 *       500:
 *         description: Internal server error
 */
router.get("/check-subdomain/:subdomain", tenantController.checkSubdomain);

/**
 * @swagger
 * /api/tenants/{id}:
 *   get:
 *     summary: Get a tenant by ID
 *     description: Retrieve details for a specific tenant
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The tenant ID
 *     responses:
 *       200:
 *         description: Tenant details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tenant'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not a super admin
 *       404:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", tenantController.getTenantById);

/**
 * @swagger
 * /api/tenants/{id}:
 *   put:
 *     summary: Update a tenant
 *     description: Update a tenant's information
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The tenant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: The tenant name
 *               status:
 *                 type: string
 *                 enum: [active, pending, deactivated]
 *                 description: The tenant status
 *     responses:
 *       200:
 *         description: Tenant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 tenant:
 *                   $ref: '#/components/schemas/Tenant'
 *       400:
 *         description: Bad request - Missing name
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not a super admin
 *       404:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", tenantController.updateTenant);

/**
 * @swagger
 * /api/tenants/{id}:
 *   delete:
 *     summary: Delete a tenant
 *     description: Mark a tenant as deleted (soft delete)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The tenant ID
 *     responses:
 *       200:
 *         description: Tenant deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Tenant deleted successfully
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not a super admin
 *       404:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", tenantController.deleteTenant);

module.exports = router;