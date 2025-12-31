import InstitutionSettings from "../models/InstitutionSettings.js";
import Institution from "../models/Institution.js";
import User from "../models/User.js";
import InviteCode from "../models/InviteCode.js";
import { logAuditFromRequest } from "../utils/auditLogger.js";
import { requireWritableInstitution } from "../middleware/institutionStatusMiddleware.js";
/**
 * GET /api/institution-settings
 * CRITICAL: Only admins can access (enforced by route middleware)
 */
export const getInstitutionSettings = async (req, res) => {
  try {
    // CRITICAL: Verify user belongs to an institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access settings",
      });
    }

    const settings = await InstitutionSettings.findOne({
      institutionId: req.user.institutionId,
    });

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/institution-settings (UPSERT)
 * CRITICAL: Only admins can modify (enforced by route middleware)
 */
export const upsertInstitutionSettings = async (req, res) => {
  try {
    // CRITICAL: Verify user belongs to an institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to modify settings",
      });
    }

    const settings = await InstitutionSettings.findOneAndUpdate(
      { institutionId: req.user.institutionId },
      {
        ...req.body,
        institutionId: req.user.institutionId,
        is_setup_complete: true,
      },
      { new: true, upsert: true }
    );

    // Audit log: Log AFTER successful settings update
    logAuditFromRequest(
      req,
      "UPDATE_INSTITUTION_SETTINGS",
      "institution",
      req.user.institutionId,
      {}
    ).catch(() => {}); // Silently ignore logging errors

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const setupInstitution = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admins can setup institution" });
  }

  // CRITICAL: Enforce email verification requirement
  if (!req.user.emailVerified) {
    return res.status(403).json({ 
      message: "Please verify your email address before completing institution setup. Check your inbox for the verification link.",
      requiresEmailVerification: true 
    });
  }

  let institution;

  if (req.user.institutionId) {
    // ✅ UPDATE ONLY
    institution = await Institution.findByIdAndUpdate(
      req.user.institutionId,
      {
        name: req.body.institutionName,
        isSetupComplete: true,
      },
      { new: true }
    );

    // Audit log: Log AFTER successful setup completion
    logAuditFromRequest(
      req,
      "COMPLETE_INSTITUTION_SETUP",
      "institution",
      institution._id,
      { institutionName: institution.name }
    ).catch(() => {}); // Silently ignore logging errors
  } else {
    // ✅ CREATE ONCE
    institution = await Institution.create({
      name: req.body.institutionName,
      createdBy: req.user._id,
      isSetupComplete: true,
    });

    await User.findByIdAndUpdate(req.user._id, {
      institutionId: institution._id,
    });

    // Audit log: Log AFTER successful institution creation
    logAuditFromRequest(
      req,
      "CREATE_INSTITUTION",
      "institution",
      institution._id,
      { institutionName: institution.name }
    ).catch(() => {}); // Silently ignore logging errors
  }

  res.json({
    institutionId: institution._id,
    isSetupComplete: true,
  });
};

/**
 * GET /api/institutions/info
 * Get institution information including status and plan
 */
export const getInstitutionInfo = async (req, res) => {
  try {
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution",
      });
    }

    const institution = await Institution.findById(req.user.institutionId);
    
    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    // Get trial days remaining
    const { getTrialDaysRemaining } = await import("../utils/institutionStatus.js");
    const trialDaysRemaining = getTrialDaysRemaining(institution);

    // Get settings to include institution type
    const settings = await InstitutionSettings.findOne({
      institutionId: institution._id,
    });

    res.json({
      id: institution._id,
      name: institution.name,
      status: institution.status,
      plan: institution.plan,
      trialStartedAt: institution.trialStartedAt,
      trialEndsAt: institution.trialEndsAt,
      trialDaysRemaining,
      institutionType: settings?.institution_type || null,
      isSetupComplete: institution.isSetupComplete,
      createdAt: institution.createdAt,
    });
  } catch (error) {
    console.error("Get institution info error:", error);
    res.status(500).json({ message: "Failed to get institution info" });
  }
};




export const joinInstitutionByInvite = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (req.user.role !== "scheduler") {
      return res
        .status(403)
        .json({ message: "Only schedulers can join institutions" });
    }

    // Enforce email verification before allowing schedulers to join institutions
    if (!req.user.emailVerified) {
      return res.status(403).json({
        message:
          "Please verify your email address before joining an institution. Check your inbox for the verification link.",
        requiresEmailVerification: true,
      });
    }

    if (!inviteCode) {
      return res.status(400).json({ message: "Invite code is required" });
    }

    // Find the invite code
    const invite = await InviteCode.findOne({
      code: inviteCode.toUpperCase().trim(),
    });

    if (!invite) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    // Check if invite code is active
    if (!invite.isActive) {
      return res.status(400).json({ message: "Invite code is no longer active" });
    }

    // Check if invite code has expired
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return res.status(400).json({ message: "Invite code has expired" });
    }

    // Check if invite code has reached max uses
    if (invite.maxUses && invite.usesCount >= invite.maxUses) {
      return res.status(400).json({ message: "Invite code has reached maximum uses" });
    }

    // Get the institution
    const institution = await Institution.findById(invite.institutionId);
    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    // Update user's institution
    await User.findByIdAndUpdate(req.user._id, {
      institutionId: institution._id,
    });

    // Increment invite code uses
    invite.usesCount = (invite.usesCount || 0) + 1;
    await invite.save();

    res.json({
      message: "Joined institution successfully",
      institutionId: institution._id,
    });
  } catch (error) {
    console.error("Join institution error:", error);
    res.status(500).json({ message: "Failed to join institution" });
  }
};
