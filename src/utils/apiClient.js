const axios = require('axios');
require('dotenv').config();

const TENANT_APP_API_URL = process.env.TENANT_APP_API_URL || 'http://localhost:3000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'your-secure-internal-api-key';

const internalApiClient = axios.create({
  baseURL: TENANT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': INTERNAL_API_KEY
  }
});

module.exports = {
  internalApiClient
};