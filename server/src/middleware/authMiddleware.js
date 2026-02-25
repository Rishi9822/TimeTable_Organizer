import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password").populate("institutionId", "status");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Platform-level block — super admin can block any user
    if (user.isBlocked) {
      console.warn(`[AuthMiddleware] 403: User ${user.email} is blocked`);
      return res.status(403).json({
        message: "Your account has been blocked. Please contact support.",
        code: "ACCOUNT_BLOCKED",
      });
    }

    // SaaS Logic: Block access if the entire institution is suspended
    // Super-admins are exempt as they don't belong to a specific tenant institution for control
    if (user.role !== "super_admin" && user.institutionId?.status === "suspended") {
      console.warn(`[AuthMiddleware] 403: Institution ${user.institutionId._id || user.institutionId} is suspended for user ${user.email}`);
      return res.status(403).json({
        message: "Your institution's account has been suspended. Please contact your administrator.",
        code: "INSTITUTION_SUSPENDED",
      });
    }

    req.user = user;
    next()
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default authMiddleware;
