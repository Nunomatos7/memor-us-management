// src/utils/auth.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

class Auth {
  generateToken(payload) {
    console.log("Auth.generateToken input payload:", payload);

    const finalPayload = {
      ...payload,
      roles: payload.roles || [],
    };

    console.log("Final token payload:", finalPayload);

    return jwt.sign(finalPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  verifyToken(token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      console.log("Token verified. Payload:", payload);
      return payload;
    } catch (err) {
      console.error("Token verification failed:", err.message);
      return null;
    }
  }
}

export default new Auth();
