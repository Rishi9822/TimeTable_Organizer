import Institution from "../models/Institution.js";
import {
  isReadOnly,
  canEdit,
  checkAndUpdateTrialStatus,
} from "../utils/institutionStatus.js";

/**
 * Resolves institution and attaches status context to req
 * MUST run before requireWritableInstitution
 */
export const institutionStatusMiddleware = async (req, res, next) => {
  try {
    // ❌ DO NOT SILENTLY SKIP
    if (!req.user || !req.user.institutionId) {
      return res.status(403).json({
        message: "User is not associated with an institution",
      });
    }

    const institution = await Institution.findById(req.user.institutionId);

    if (!institution) {
      return res.status(404).json({
        message: "Institution not found",
      });
    }

    // Ensure trial status is always up-to-date
    await checkAndUpdateTrialStatus(institution);

    // ✅ ALWAYS INITIALIZE
    req.institutionStatus = {
      institution,
      status: institution.status,
      plan: institution.plan,
      trialEndsAt: institution.trialEndsAt,
      trialStartedAt: institution.trialStartedAt,
      isReadOnly: isReadOnly(institution),
      canEdit: canEdit(institution),
    };

    next();
  } catch (error) {
    console.error("❌ Institution status middleware error:", error);
    return res.status(500).json({
      message: "Failed to resolve institution status",
    });
  }
};

/**
 * Blocks write operations when institution is read-only
 */
export const requireWritableInstitution = (req, res, next) => {
  if (!req.institutionStatus) {
    return res.status(500).json({
      message: "Institution status middleware not initialized",
    });
  }

  if (req.institutionStatus.isReadOnly) {
    return res.status(403).json({
      message: `This institution is in ${req.institutionStatus.status} state and is read-only.`,
      status: req.institutionStatus.status,
      plan: req.institutionStatus.plan,
    });
  }

  next();
};

