import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Institution from "../models/Institution.js";

const router = express.Router();

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

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const allowedRoles = ["admin", "scheduler", "teacher", "student"];
    const safeRole = allowedRoles.includes(role) ? role : "student";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: safeRole,
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
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Failed to create account" });
  }
});

router.post("/login", async (req, res) => {
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
    },
  });
});



export default router;
