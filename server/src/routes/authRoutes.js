import express from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import Institution from "../models/Institution.js";
import { generateSecureToken, hashToken, compareTokens } from "../utils/tokenUtils.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/emailService.js";

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per window
  message: "Too many attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const allowedRoles = ["admin", "scheduler", "teacher", "student"];
    const safeRole = allowedRoles.includes(role) ? role : "student";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate email verification token
    const verificationToken = generateSecureToken();
    const hashedToken = hashToken(verificationToken);
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours

    const user = await User.create({
      name,
      email,
      password,
      role: safeRole,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: verificationExpires,
      emailVerified: false, // Explicitly set to false for new users
    });

    // Send verification email (non-blocking, but log result)
    sendVerificationEmail(email, name, verificationToken)
      .then((result) => {
        if (result.success) {
          console.log(`✅ [AUTH] Verification email queued for ${email}`);
        } else {
          console.warn(`⚠️ [AUTH] Failed to send verification email to ${email}: ${result.error}`);
          // Note: Registration still succeeds even if email fails
        }
      })
      .catch((err) => {
        console.error(`❌ [AUTH] Error in verification email send promise for ${email}:`, err);
        // Don't fail registration if email fails - user can request resend
      });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Fetch user with institution data
    const userWithInstitution = await User.findById(user._id).select("-password");
    let isSetupComplete = false;
    
    if (userWithInstitution.institutionId) {
      const institution = await Institution.findById(userWithInstitution.institutionId);
      isSetupComplete = Boolean(institution?.isSetupComplete);
    }

    res.status(201).json({
      token,
      user: {
        id: userWithInstitution._id,
        name: userWithInstitution.name,
        email: userWithInstitution.email,
        role: userWithInstitution.role,
        institutionId: userWithInstitution.institutionId || null,
        isSetupComplete,
        emailVerified: userWithInstitution.emailVerified || false,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Failed to create account" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Fetch institution data if user has one
    let isSetupComplete = false;
    if (user.institutionId) {
      const institution = await Institution.findById(user.institutionId);
      isSetupComplete = Boolean(institution?.isSetupComplete);
    }

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institutionId: user.institutionId || null,
        isSetupComplete,
        emailVerified: user.emailVerified || false,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Failed to login" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  const user = req.user;

  let institution = null;
  let isSetupComplete = false;

  if (user.institutionId) {
    institution = await Institution.findById(user.institutionId);
    isSetupComplete = Boolean(institution?.isSetupComplete);
  }

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId || null,
      isSetupComplete,
      emailVerified: user.emailVerified || false,
    },
  });
});

/**
 * Email Verification Endpoint
 * GET /auth/verify-email?token=...
 * Idempotent: Can be called multiple times safely (if already verified, redirects to success)
 */
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    if (!token) {
      console.warn("[AUTH] Verification attempted without token");
      return res.redirect(`${frontendUrl}/auth?error=invalid_token`);
    }

    const hashedToken = hashToken(token);

    // Find user with this token (even if expired, to check if already verified)
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
    });

    // If user not found with this token, check if token is expired or invalid
    if (!user) {
      console.warn("[AUTH] Verification attempted with invalid token");
      return res.redirect(`${frontendUrl}/auth?error=invalid_or_expired_token`);
    }

    // Idempotency: If already verified, redirect to success page
    if (user.emailVerified) {
      console.log(`[AUTH] User ${user.email} already verified, redirecting to success`);
      return res.redirect(`${frontendUrl}/auth/verify-email-success`);
    }

    // Check if token is expired
    if (user.emailVerificationExpires && new Date() > new Date(user.emailVerificationExpires)) {
      console.warn(`[AUTH] Verification token expired for user ${user.email}`);
      return res.redirect(`${frontendUrl}/auth?error=invalid_or_expired_token`);
    }

    // Mark email as verified and clear token fields (idempotent save)
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    console.log(`✅ [AUTH] Email verified successfully for user: ${user.email}`);

    // Redirect to success page
    return res.redirect(`${frontendUrl}/auth/verify-email-success`);
  } catch (error) {
    console.error("❌ [AUTH] Email verification error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(`${frontendUrl}/auth?error=verification_failed`);
  }
});

/**
 * Resend Verification Email
 * POST /auth/resend-verification
 * Regenerates token and invalidates old one
 */
router.post("/resend-verification", strictLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    // Always return success to prevent user enumeration
    if (!user) {
      console.log(`[AUTH] Resend verification requested for non-existent email: ${email}`);
      return res.json({ message: "If an account exists, a verification email has been sent" });
    }

    // If already verified, return success without sending
    if (user.emailVerified) {
      console.log(`[AUTH] Resend verification requested for already verified user: ${email}`);
      return res.json({ message: "Email is already verified" });
    }

    // Generate new verification token (invalidates old token)
    const verificationToken = generateSecureToken();
    const hashedToken = hashToken(verificationToken);
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours

    // Update user with new token (this invalidates the old one)
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    console.log(`[AUTH] New verification token generated for ${email}`);

    // Send verification email and log result
    const emailResult = await sendVerificationEmail(user.email, user.name, verificationToken);
    
    if (!emailResult.success) {
      console.warn(`⚠️ [AUTH] Failed to send resend verification email to ${email}: ${emailResult.error}`);
      // Still return success to prevent user enumeration
    } else {
      console.log(`✅ [AUTH] Resend verification email sent to ${email}`);
    }

    return res.json({ message: "If an account exists, a verification email has been sent" });
  } catch (error) {
    console.error("❌ [AUTH] Resend verification error:", error);
    // Still return success to prevent user enumeration
    return res.json({ message: "If an account exists, a verification email has been sent" });
  }
});

/**
 * Forgot Password
 * POST /auth/forgot-password
 */
router.post("/forgot-password", strictLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    // Always return success to prevent user enumeration
    if (!user) {
      return res.json({ message: "If an account exists, a password reset email has been sent" });
    }

    // Generate reset token
    const resetToken = generateSecureToken();
    const hashedToken = hashToken(resetToken);
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send password reset email and log result
    const emailResult = await sendPasswordResetEmail(user.email, user.name, resetToken);
    
    if (!emailResult.success) {
      console.warn(`⚠️ [AUTH] Failed to send password reset email to ${user.email}: ${emailResult.error}`);
      // Still return success to prevent user enumeration
    } else {
      console.log(`✅ [AUTH] Password reset email sent to ${user.email}`);
    }

    return res.json({ message: "If an account exists, a password reset email has been sent" });
  } catch (error) {
    console.error("❌ [AUTH] Forgot password error:", error);
    // Still return success to prevent user enumeration
    return res.json({ message: "If an account exists, a password reset email has been sent" });
  }
});

/**
 * Reset Password
 * POST /auth/reset-password
 * Validates token expiration and updates password
 */
router.post("/reset-password", strictLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashedToken = hashToken(token);

    // Find user with this token (check expiration explicitly)
    const user = await User.findOne({
      passwordResetToken: hashedToken,
    });

    if (!user) {
      console.warn("[AUTH] Password reset attempted with invalid token");
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Check if token is expired
    if (!user.passwordResetExpires || new Date() > new Date(user.passwordResetExpires)) {
      console.warn(`[AUTH] Password reset token expired for user ${user.email}`);
      // Clear expired token
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = password;
    // Clear reset token after successful password change
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    console.log(`✅ [AUTH] Password reset successful for user: ${user.email}`);

    return res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("❌ [AUTH] Reset password error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

export default router;
