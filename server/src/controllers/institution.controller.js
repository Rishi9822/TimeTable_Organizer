import InstitutionSettings from "../models/InstitutionSettings.js";
import Institution from "../models/Institution.js";
import User from "../models/User.js";
import InviteCode from "../models/InviteCode.js";
import { logAuditFromRequest } from "../utils/auditLogger.js";
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




export const joinInstitutionByInvite = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (req.user.role !== "scheduler") {
      return res
        .status(403)
        .json({ message: "Only schedulers can join institutions" });
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
