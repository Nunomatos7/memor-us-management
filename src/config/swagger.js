// src/config/swagger.js
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Memor'Us Tenant Manager API",
      version: "1.0.0",
      description: "API for managing tenants in the Memor'Us platform",
      contact: {
        name: "Memor'Us Support",
        url: "https://memor-us.com/support",
        email: "support@memor-us.com",
      },
      license: {
        name: "Proprietary",
        url: "https://memor-us.com/terms",
      },
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Development Server",
      },
      {
        url: "https://tenant-manager.memor-us.com",
        description: "Production Server",
      },
    ],
    tags: [
      {
        name: "Admin",
        description: "Admin authentication and profile management",
      },
      {
        name: "Tenants",
        description: "Tenant management operations",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token in the format: Bearer <token>",
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Authentication information is missing or invalid",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "string",
                    example: "Invalid token",
                  },
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: "Insufficient permissions to access the resource",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "string",
                    example: "Access denied: Super admin privileges required",
                  },
                },
              },
            },
          },
        },
        ServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: {
                    type: "string",
                    example: "Internal server error",
                  },
                  message: {
                    type: "string",
                    example: "Error details",
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    "./src/routes/*.js",
    "./src/models/swagger-schemas.js",
    "./src/middleware/authMiddleware.js",
  ], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export default specs;
