import Institution from "../models/Institution.js";
import { isReadOnly, canEdit, checkAndUpdateTrialStatus } from "../utils/institutionStatus.js";

/**
 * Middleware to check institution status
 * Adds institution status info to req.institutionStatus
 * Does NOT block requests - just provides status info
 */
export const institutionStatusMiddleware = async (req, res, next) => {
  try {
    if (!req.user || !req.user.institutionId) {
      // No institution - continue (for routes that don't require institution)
      return next();
    }

    const institution = await Institution.findById(req.user.institutionId);
    
    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    // Check and update trial status if expired
    await checkAndUpdateTrialStatus(institution);
    
    // Refresh institution data after potential update
    const updatedInstitution = await Institution.findById(req.user.institutionId);

    // Attach status info to request
    req.institutionStatus = {
      status: updatedInstitution.status,
      plan: updatedInstitution.plan,
      trialEndsAt: updatedInstitution.trialEndsAt,
      trialStartedAt: updatedInstitution.trialStartedAt,
      isReadOnly: isReadOnly(updatedInstitution),
      canEdit: canEdit(updatedInstitution),
      institution: updatedInstitution,
    };

    next();
  } catch (error) {
    console.error("Institution status middleware error:", error);
    // Don't block on middleware error - continue but without status info
    req.institutionStatus = null;
    next();
  }
};

/**
 * Middleware to block write operations for read-only institutions
 * Use this on routes that modify data (POST, PUT, DELETE, PATCH)
 */
export const requireWritableInstitution = async (req, res, next) => {
  // First check institution status
  if (!req.institutionStatus) {
    // If status middleware wasn't run, check now
    await institutionStatusMiddleware(req, res, () => {});
  }

  if (req.institutionStatus && req.institutionStatus.isReadOnly) {
    return res.status(403).json({
      message: "This institution is in read-only mode. Please upgrade your plan to continue editing.",
      status: req.institutionStatus.status,
      plan: req.institutionStatus.plan,
    });
  }

  next();
};









