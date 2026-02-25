/**
 * Role-based access control middleware
 * Usage: requireRole(['admin', 'scheduler'])
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Super admin has platform-level god mode — passes all role checks
    if (userRole === "super_admin") {
      return next();
    }

    // For privileged admin/scheduler routes, enforce email verification
    const requiresPrivilegedRole = roles.includes("admin") || roles.includes("scheduler");
    if (requiresPrivilegedRole && !req.user.emailVerified) {
      return res.status(403).json({
        message:
          "Please verify your email address before accessing this resource. Check your inbox for the verification link.",
        requiresEmailVerification: true,
      });
    }

    // Admins have access to everything within their institution (after verification check above)
    if (userRole === "admin") {
      return next();
    }

    // Check if user's role is in allowed roles
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
};

/**
 * Super Admin guard — platform-level only.
 * Must be used AFTER requireAuth (authMiddleware).
 * Usage: router.use(authMiddleware, requireSuperAdmin)
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Access denied. Super admin only." });
  }
  next();
};

/**
 * Middleware to ensure user belongs to an institution
 */
export const requireInstitution = (req, res, next) => {
  if (!req.user.institutionId) {
    return res.status(403).json({
      message: "You must be part of an institution to access this resource",
    });
  }
  next();
};

/**
 * Middleware to ensure user can only access their own institution's data
 */
export const requireSameInstitution = (req, res, next) => {
  const requestedInstitutionId =
    req.params.institutionId || req.body.institutionId;

  if (requestedInstitutionId) {
    if (
      req.user.role !== "admin" &&
      req.user.role !== "super_admin" &&
      req.user.institutionId?.toString() !== requestedInstitutionId.toString()
    ) {
      return res.status(403).json({
        message: "You can only access your own institution's data",
      });
    }
  }

  next();
};

