import crypto from "crypto";

/**
 * Generate cryptographically secure random token
 * @param {number} bytes - Number of random bytes (default: 32)
 * @returns {string} Hex-encoded token
 */
export const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("hex");
};

/**
 * Hash token using SHA256 (for storing in database)
 * @param {string} token - Plain token
 * @returns {string} Hashed token
 */
export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Compare plain token with hashed token
 * @param {string} plainToken - Plain token from request
 * @param {string} hashedToken - Hashed token from database
 * @returns {boolean} True if tokens match
 */
export const compareTokens = (plainToken, hashedToken) => {
  if (!plainToken || !hashedToken) return false;
  
  const hashedPlainToken = hashToken(plainToken);
  
  // Both should be SHA256 hashes (64 hex characters)
  if (hashedPlainToken.length !== hashedToken.length) {
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hashedPlainToken, "hex"),
      Buffer.from(hashedToken, "hex")
    );
  } catch {
    return false;
  }
};

