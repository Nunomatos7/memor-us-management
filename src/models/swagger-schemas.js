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
 *       example:
 *         id: 1
 *         name: "Company ABC"
 *         subdomain: "company-abc"
 *         schema_name: "company_abc"
 *         status: "active"
 *         created_at: "2025-04-15T12:00:00Z"
 *         updated_at: "2025-04-15T12:00:00Z"
 *     
 *     AdminUser:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           description: The admin user ID
 *         name:
 *           type: string
 *           description: The admin user's name
 *         email:
 *           type: string
 *           format: email
 *           description: The admin user's email
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       example:
 *         id: 1
 *         name: "Admin User"
 *         email: "admin@memor-us.com"
 *         created_at: "2025-04-15T12:00:00Z"
 *         updated_at: "2025-04-15T12:00:00Z"
 *     
 *     Log:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The log entry ID
 *         action:
 *           type: string
 *           description: The action performed
 *         performed_at:
 *           type: string
 *           format: date-time
 *           description: When the action was performed
 *         admin_id:
 *           type: integer
 *           description: The ID of the admin who performed the action
 *         admin_name:
 *           type: string
 *           description: The name of the admin who performed the action
 *         admin_email:
 *           type: string
 *           description: The email of the admin who performed the action
 *       example:
 *         id: 1
 *         action: "Created new tenant: Company ABC (company-abc)"
 *         performed_at: "2025-04-15T12:00:00Z"
 *         admin_id: 1
 *         admin_name: "Admin User"
 *         admin_email: "admin@memor-us.com"
 *     
 *     TenantCreation:
 *       type: object
 *       required:
 *         - name
 *         - subdomain
 *         - adminId
 *         - adminUser
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the tenant
 *         subdomain:
 *           type: string
 *           description: Subdomain for the tenant (lowercase letters, numbers, and hyphens only)
 *         adminId:
 *           type: integer
 *           description: ID of the admin creating the tenant
 *         adminUser:
 *           type: object
 *           required:
 *             - firstName
 *             - lastName
 *             - email
 *             - password
 *           properties:
 *             firstName:
 *               type: string
 *               description: First name of the tenant admin
 *             lastName:
 *               type: string
 *               description: Last name of the tenant admin
 *             email:
 *               type: string
 *               format: email
 *               description: Email of the tenant admin
 *             password:
 *               type: string
 *               format: password
 *               description: Password for the tenant admin (minimum 6 characters)
 *       example:
 *         name: "Company ABC"
 *         subdomain: "company-abc"
 *         adminId: 1
 *         adminUser:
 *           firstName: "John"
 *           lastName: "Doe"
 *           email: "admin@company-abc.com"
 *           password: "securePassword"
 *     
 *     TenantUpdate:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: The tenant name
 *         status:
 *           type: string
 *           enum: [active, pending, deactivated]
 *           description: The tenant status
 *       example:
 *         name: "Company ABC Updated"
 *         status: "active"
 *     
 *     AdminLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Admin email address
 *         password:
 *           type: string
 *           format: password
 *           description: Admin password
 *       example:
 *         email: "admin@memor-us.com"
 *         password: "securePassword"
 *     
 *     AdminProfileUpdate:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         name:
 *           type: string
 *           description: Admin name
 *         email:
 *           type: string
 *           format: email
 *           description: Admin email address
 *         currentPassword:
 *           type: string
 *           description: Current password (required for password change)
 *         newPassword:
 *           type: string
 *           description: New password
 *       example:
 *         name: "Admin User"
 *         email: "admin@memor-us.com"
 *         currentPassword: "oldPassword"
 *         newPassword: "newSecurePassword"
 *     
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *         message:
 *           type: string
 *           description: Detailed error message (optional)
 *       example:
 *         error: "Internal server error"
 *         message: "Error details"
 *     
 *     Success:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           description: Success message
 *       example:
 *         success: true
 *         message: "Operation completed successfully"
 */