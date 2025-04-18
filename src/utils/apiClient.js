// src/utils/apiClient.js
// This file is kept for backward compatibility but is no longer used
// All tenant operations are now performed directly

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// Create a dummy client that logs warnings when used
const internalApiClient = {
  post: async (url, data) => {
    console.warn(
      `API client post to ${url} is deprecated. Operations are now performed directly.`
    );
    console.warn("Data that would have been sent:", data);
    return { data: { success: true } };
  },
  get: async (url) => {
    console.warn(
      `API client get to ${url} is deprecated. Operations are now performed directly.`
    );
    return { data: { success: true } };
  },
};

export { internalApiClient };
