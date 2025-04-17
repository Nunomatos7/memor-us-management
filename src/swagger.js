const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

// Import the options from the Swagger config
const swaggerOptions = require('./config/swagger');

// Generate the Swagger specification
const specs = swaggerJsdoc(swaggerOptions);

// Define the output path
const outputPath = path.resolve(__dirname, '../swagger.json');

// Write the specification to a file
fs.writeFileSync(outputPath, JSON.stringify(specs, null, 2));

console.log(`Swagger specification has been written to ${outputPath}`);