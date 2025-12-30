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

    // Send verification email (non-blocking)
    sendVerificationEmail(email, name, verificationToken).catch((err) => {
      console.error("Failed to send verification email:", err);
      // Don't fail registration if email fails
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

  console.log("AUTH /me DEBUG", {
    userId: user._id,
    institutionId: user.institutionId,
    institutionExists: !!institution,
    institutionSetupFlag: institution?.isSetupComplete,
  });

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
 */
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/auth?error=invalid_token`);
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/auth?error=invalid_or_expired_token`);
    }

    // Mark email as verified and clear token fields
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Redirect to success page
    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/verify-email-success`);
  } catch (error) {
    console.error("Email verification error:", error);
    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/auth?error=verification_failed`);
  }
});

/**
 * Resend Verification Email
 * POST /auth/resend-verification
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
      return res.json({ message: "If an account exists, a verification email has been sent" });
    }

    // If already verified, return success without sending
    if (user.emailVerified) {
      return res.json({ message: "Email is already verified" });
    }

    // Generate new verification token
    const verificationToken = generateSecureToken();
    const hashedToken = hashToken(verificationToken);
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    await sendVerificationEmail(user.email, user.name, verificationToken);

    return res.json({ message: "If an account exists, a verification email has been sent" });
  } catch (error) {
    console.error("Resend verification error:", error);
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

    // Send password reset email
    await sendPasswordResetEmail(user.email, user.name, resetToken);

    return res.json({ message: "If an account exists, a password reset email has been sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    // Still return success to prevent user enumeration
    return res.json({ message: "If an account exists, a password reset email has been sent" });
  }
});

/**
 * Reset Password
 * POST /auth/reset-password
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

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

export default router;
