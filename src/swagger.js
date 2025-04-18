// src/swagger.js
import swaggerJsdoc from "swagger-jsdoc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the options from the Swagger config
import swaggerOptions from "./config/swagger.js";

// Generate the Swagger specification
const specs = swaggerJsdoc(swaggerOptions);

// Define the output path
const outputPath = path.resolve(__dirname, "../swagger.json");

// Write the specification to a file
fs.writeFileSync(outputPath, JSON.stringify(specs, null, 2));

console.log(`Swagger specification has been written to ${outputPath}`);
