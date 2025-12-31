import AuditLog from "../models/AuditLog.js";

/**
 * Audit Logger Utility
 * Non-intrusive logging that never blocks operations
 * All errors are silently ignored to prevent affecting business logic
 */

/**
 * Log an audit event
 * @param {Object} params
 * @param {String} params.action - Action type (e.g., "CREATE_TEACHER", "DELETE_TEACHER")
 * @param {String} params.entityType - Entity type (e.g., "teacher", "timetable")
 * @param {mongoose.Types.ObjectId|null} params.entityId - ID of affected entity
 * @param {mongoose.Types.ObjectId} params.performedBy - User ID who performed the action
 * @param {String} params.role - User role ("admin" | "scheduler")
 * @param {mongoose.Types.ObjectId} params.institutionId - Institution ID
 * @param {Object} params.meta - Optional metadata (e.g., { teacherName: "John Doe" })
 */
export const logAudit = async ({
  action,
  entityType,
  entityId = null,
  performedBy,
  role,
  institutionId,
  meta = {},
}) => {
  // CRITICAL: Never throw errors - silently ignore logging failures
  try {
    // Only log for admin and scheduler roles
    if (!["admin", "scheduler"].includes(role)) {
      return;
    }

    // Validate required fields
    if (!action || !entityType || !performedBy || !institutionId) {
      console.warn("Audit log skipped: missing required fields");
      return;
    }

    await AuditLog.create({
      action,
      entityType,
      entityId,
      performedBy,
      role,
      institutionId,
      meta,
    });
  } catch (error) {
    // Silently ignore audit logging errors - never affect business logic
    console.error("Audit log error (ignored):", error.message);
  }
};

/**
 * Helper to create audit log from request object
 * Extracts user info from req.user automatically
 */
export const logAuditFromRequest = async (req, action, entityType, entityId = null, meta = {}) => {
  if (!req.user || !req.user.institutionId) {
    return; // Skip if user not authenticated or not in institution
  }

  await logAudit({
    action,
    entityType,
    entityId,
    performedBy: req.user._id,
    role: req.user.role,
    institutionId: req.user.institutionId,
    meta,
  });
};













