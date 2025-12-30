import AuditLog from "../models/AuditLog.js";

/**
 * GET /api/audit-logs
 * Get audit logs for the user's institution
 * Read-only, paginated, sorted by newest first
 * Accessible only to admin and scheduler
 */
export const getAuditLogs = async (req, res) => {
  try {
    // CRITICAL: Verify user belongs to an institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access audit logs",
      });
    }

    // CRITICAL: Only admin and scheduler can access audit logs
    if (!["admin", "scheduler"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only admins and schedulers can access audit logs",
      });
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Query: Only logs for user's institution, sorted by newest first
    const query = {
      institutionId: req.user.institutionId,
    };

    // Optional filter by action type
    if (req.query.action) {
      query.action = req.query.action;
    }

    // Optional filter by entity type
    if (req.query.entityType) {
      query.entityType = req.query.entityType;
    }

    // Get total count for pagination
    const total = await AuditLog.countDocuments(query);

    // Get audit logs with pagination
    const logs = await AuditLog.find(query)
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
};





