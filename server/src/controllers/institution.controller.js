import InstitutionSettings from "../models/InstitutionSettings.js";
import Institution from "../models/Institution.js";
import User from "../models/User.js";
import InviteCode from "../models/InviteCode.js";
import { logAuditFromRequest } from "../utils/auditLogger.js";
import { requireWritableInstitution } from "../middleware/institutionStatusMiddleware.js";
import { canSwitchInstitutionType, canCompleteModeSetup } from "../utils/planLimits.js";
/**
 * GET /api/institution-settings
 * CRITICAL: Only admins can access (enforced by route middleware)
 */
export const getInstitutionSettings = async (req, res) => {
  try {
    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;
    if (!targetInstitutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access settings",
      });
    }

    const settings = await InstitutionSettings.findOne({
      institutionId: targetInstitutionId,
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
    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;
    if (!targetInstitutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to modify settings",
      });
    }

    const institution = await Institution.findById(targetInstitutionId);
    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    // Get current settings to check for type changes
    const currentSettings = await InstitutionSettings.findOne({
      institutionId: targetInstitutionId,
    });

    // SaaS Logic: Validate institution type switching based on plan
    if (req.body.institution_type && currentSettings?.institution_type) {
      const newType = req.body.institution_type;
      const validation = canSwitchInstitutionType(institution, newType, currentSettings);

      if (!validation.allowed) {
        return res.status(403).json({
          message: validation.reason || "Institution type switching is not allowed",
        });
      }
    }

    // For Flex plan: Handle mode-specific settings storage
    let updateData = {
      ...req.body,
      institutionId: targetInstitutionId,
      is_setup_complete: true,
    };

    if (institution.plan === "flex") {
      // Determine which mode we're updating (use activeMode if type not specified)
      const mode = req.body.institution_type || institution.activeMode || currentSettings?.institution_type;

      if (mode) {
        // Preserve existing flex mode settings
        const existingSettings = currentSettings?.flexModeSettings || {};

        // Store/update settings for this specific mode
        updateData.flexModeSettings = {
          ...existingSettings,
          [mode]: {
            institution_name: req.body.institution_name !== undefined ? req.body.institution_name : (existingSettings[mode]?.institution_name || currentSettings?.institution_name),
            working_days: req.body.working_days !== undefined ? req.body.working_days : (existingSettings[mode]?.working_days || currentSettings?.working_days),
            periods_per_day: req.body.periods_per_day !== undefined ? req.body.periods_per_day : (existingSettings[mode]?.periods_per_day || currentSettings?.periods_per_day),
            period_duration: req.body.period_duration !== undefined ? req.body.period_duration : (existingSettings[mode]?.period_duration || currentSettings?.period_duration),
            start_time: req.body.start_time !== undefined ? req.body.start_time : (existingSettings[mode]?.start_time || currentSettings?.start_time),
            lab_duration: req.body.lab_duration !== undefined ? req.body.lab_duration : (existingSettings[mode]?.lab_duration || currentSettings?.lab_duration),
            breaks: req.body.breaks !== undefined ? req.body.breaks : (existingSettings[mode]?.breaks || currentSettings?.breaks),
            is_setup_complete: true,
          },
        };
      }
    }

    const settings = await InstitutionSettings.findOneAndUpdate(
      { institutionId: targetInstitutionId },
      updateData,
      { new: true, upsert: true }
    );

    console.log(`[Setup] SUCCESS: Updated institution settings for ${targetInstitutionId}`);

    // Audit log: Log AFTER successful settings update
    logAuditFromRequest(
      req,
      "UPDATE_INSTITUTION_SETTINGS",
      "institution",
      targetInstitutionId,
      {}
    ).catch(() => { }); // Silently ignore logging errors

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const setupInstitution = async (req, res) => {
  // SaaS Logic: Allow both admins and super_admins (for testing/maintenance)
  if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    console.warn(`[Setup] 403: User ${req.user.email} has insufficient role: ${req.user.role}`);
    return res.status(403).json({
      message: "Only admins can setup institution",
      debug: { role: req.user.role, email: req.user.email }
    });
  }

  // CRITICAL: Enforce email verification requirement (relaxed for non-production environments to prevent blocking)
  if (process.env.NODE_ENV === "production" && !req.user.emailVerified) {
    console.warn(`[Setup] 403: User ${req.user.email} attempted setup without email verification in production`);
    return res.status(403).json({
      message: "Please verify your email address before completing institution setup. Check your inbox for the verification link.",
      requiresEmailVerification: true,
      debug: { role: req.user.role, emailVerified: req.user.emailVerified, env: process.env.NODE_ENV }
    });
  }

  let institution;

  const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;

  if (targetInstitutionId) {
    // ✅ UPDATE ONLY
    institution = await Institution.findById(targetInstitutionId);

    if (!institution) {
      console.warn(`[Setup] 404: Institution ${targetInstitutionId} not found for user ${req.user.email}`);
      return res.status(404).json({ message: "Institution not found" });
    }

    // SaaS Logic: Prevent redundant setup calls for Standard plan (Idempotency)
    if (institution.plan === "standard" && institution.isSetupComplete && institution.institutionTypeLocked) {
      console.log(`[Setup] Info: Institution ${institution._id} already complete (Standard plan locked). Returning success for idempotency.`);
      return res.json({
        institutionId: institution._id,
        isSetupComplete: true,
        message: "Institution setup is already complete.",
      });
    }

    // SaaS Logic: For Flex plan, track completed modes
    const updateData = {
      name: req.body.institutionName,
      isSetupComplete: true,
    };

    // Get current settings to determine which mode is being set up
    const settings = await InstitutionSettings.findOne({
      institutionId: institution._id,
    });

    // Flex second setup: mode can come from body (e.g. /setup?mode=college) or from settings
    const modeForSetup = req.body.institution_type || settings?.institution_type;
    let completedModeThisRequest = null; // used to persist schoolSetupComplete/collegeSetupComplete

    if (institution.plan === "flex" && modeForSetup) {
      const mode = modeForSetup;
      const completedModes = institution.completedModes || [];

      // SaaS Logic: Prevent duplicate setup for already completed mode (Idempotency)
      if (completedModes.includes(mode)) {
        console.log(`[Setup] Info: Mode ${mode} already completed for institution ${institution._id}. Returning success for idempotency.`);
        return res.json({
          institutionId: institution._id,
          isSetupComplete: true,
          message: `Mode "${mode}" is already set up. You can switch between modes or update settings without re-running setup.`,
        });
      }

      // Validate if this mode setup is allowed
      const validation = canCompleteModeSetup(institution, mode);
      if (!validation.allowed) {
        console.warn(`[Setup] 403: Mode setup not allowed for ${mode}: ${validation.reason}`);
        return res.status(403).json({
          message: validation.reason || "Mode setup is not allowed",
        });
      }

      // Add mode to completed modes
      updateData.completedModes = [...completedModes, mode];
      completedModeThisRequest = mode;

      // Set active mode if this is the first completed mode
      if (!institution.activeMode) {
        updateData.activeMode = mode;
      }
    } else if (institution.plan === "standard" && settings?.institution_type) {
      // Standard plan: Lock institution type after first setup
      // Only if not already locked (allows first-time setup)
      if (!institution.institutionTypeLocked) {
        updateData.institutionTypeLocked = true;
        updateData.lockedInstitutionType = settings.institution_type;
        updateData.activeMode = settings.institution_type;
        updateData.completedModes = [settings.institution_type];
      }
    } else if (institution.plan === "trial" && settings?.institution_type) {
      // Trial plan: Track the mode but don't lock (will be locked on upgrade to standard)
      updateData.activeMode = settings.institution_type;
      if (!institution.completedModes?.includes(settings.institution_type)) {
        updateData.completedModes = [settings.institution_type];
      }
    }

    institution = await Institution.findByIdAndUpdate(
      targetInstitutionId,
      updateData,
      { new: true }
    );

    // Flex: persist setup completion flags on InstitutionSettings (never overwrite existing)
    if (completedModeThisRequest) {
      const flagField = completedModeThisRequest === "school" ? "schoolSetupComplete" : "collegeSetupComplete";
      await InstitutionSettings.findOneAndUpdate(
        { institutionId: targetInstitutionId },
        { $set: { [flagField]: true } },
        { upsert: false }
      );
    }

    // Trial/Standard first setup: set the single completed mode's flag for consistency
    if (!completedModeThisRequest && (institution.plan === "trial" || institution.plan === "standard") && settings?.institution_type) {
      const flagField = settings.institution_type === "school" ? "schoolSetupComplete" : "collegeSetupComplete";
      await InstitutionSettings.findOneAndUpdate(
        { institutionId: targetInstitutionId },
        { $set: { [flagField]: true } },
        { upsert: false }
      );
    }

    // Audit log: Log AFTER successful setup completion
    logAuditFromRequest(
      req,
      "COMPLETE_INSTITUTION_SETUP",
      "institution",
      institution._id,
      { institutionName: institution.name }
    ).catch(() => { }); // Silently ignore logging errors
  } else {
    // ✅ CREATE ONCE
    const initialMode = req.body.institution_type || "school";
    institution = await Institution.create({
      name: req.body.institutionName,
      createdBy: req.user._id,
      isSetupComplete: true,
      activeMode: initialMode,
      completedModes: [initialMode],
    });

    await User.findByIdAndUpdate(req.user._id, {
      institutionId: institution._id,
    });

    // Auto-create Subscription with 14-day trial
    try {
      const { default: Subscription } = await import("../models/Subscription.js");
      await Subscription.create({
        institutionId: institution._id,
        plan: "trial",
        status: "active",
        trialStartedAt: new Date(),
        // trialEndsAt is auto-calculated in pre-save hook
      });
    } catch (subErr) {
      // Non-fatal: log but don't block institution creation
      console.error("[Institution] Failed to create Subscription record:", subErr.message);
    }

    // Audit log: Log AFTER successful institution creation
    logAuditFromRequest(
      req,
      "CREATE_INSTITUTION",
      "institution",
      institution._id,
      { institutionName: institution.name }
    ).catch(() => { }); // Silently ignore logging errors
    console.log(`[Setup] SUCCESS: Created institution ${institution._id} for user ${req.user.email}`);
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
    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;

    if (!targetInstitutionId) {
      return res.status(403).json({
        message: "You must be part of an institution",
      });
    }

    const institution = await Institution.findById(targetInstitutionId);

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

    const response = {
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
    };

    // SaaS Logic: Add Flex plan specific information
    const schoolSetupComplete = Boolean(settings?.schoolSetupComplete ?? (institution.completedModes || []).includes("school"));
    const collegeSetupComplete = Boolean(settings?.collegeSetupComplete ?? (institution.completedModes || []).includes("college"));
    if (institution.plan === "flex") {
      response.activeMode = institution.activeMode;
      response.completedModes = institution.completedModes || [];
      response.schoolSetupComplete = schoolSetupComplete;
      response.collegeSetupComplete = collegeSetupComplete;
      response.canSwitchMode = schoolSetupComplete && collegeSetupComplete;
    }

    // SaaS Logic: Add Standard plan locking information
    if (institution.plan === "standard") {
      response.institutionTypeLocked = institution.institutionTypeLocked || false;
    }

    res.json(response);
  } catch (error) {
    console.error("Get institution info error:", error);
    res.status(500).json({ message: "Failed to get institution info" });
  }
};

/**
 * POST /api/institutions/switch-mode
 * Switch active mode for Flex plan institutions
 */
export const switchMode = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can switch modes" });
    }

    const targetInstitutionId = req.user.institutionId?._id || req.user.institutionId;

    if (!targetInstitutionId) {
      return res.status(403).json({
        message: "You must be part of an institution",
      });
    }

    const { mode } = req.body;

    if (!mode || !["school", "college"].includes(mode)) {
      return res.status(400).json({
        message: "Valid mode (school or college) is required",
      });
    }

    const institution = await Institution.findById(targetInstitutionId);

    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    // SaaS Logic: Only Flex plan can switch modes
    if (institution.plan !== "flex") {
      return res.status(403).json({
        message: "Mode switching is only available for Flex plan. Upgrade to Flex plan to switch between school and college modes.",
      });
    }

    // Get settings once for gating and for applying mode
    const settings = await InstitutionSettings.findOne({
      institutionId: institution._id,
    });

    if (!settings) {
      return res.status(404).json({ message: "Institution settings not found" });
    }

    // SaaS Logic: Mode switch allowed ONLY when plan is flex AND both setups complete
    const schoolDone = Boolean(settings.schoolSetupComplete ?? (institution.completedModes || []).includes("school"));
    const collegeDone = Boolean(settings.collegeSetupComplete ?? (institution.completedModes || []).includes("college"));
    if (!schoolDone || !collegeDone) {
      return res.status(403).json({
        message: "Both school and college modes must be set up before switching. Please complete setup for both modes first.",
      });
    }

    const completedModes = institution.completedModes || [];
    if (!completedModes.includes(mode)) {
      return res.status(403).json({
        message: `Mode "${mode}" has not been set up yet. Please complete setup for this mode first.`,
      });
    }

    // Load settings for the new mode if available (Flex plan stores per-mode settings)
    if (institution.plan === "flex" && settings.flexModeSettings?.[mode]) {
      const modeSettings = settings.flexModeSettings[mode];
      settings.institution_type = mode;
      settings.institution_name = modeSettings.institution_name || settings.institution_name;
      settings.working_days = modeSettings.working_days || settings.working_days;
      settings.periods_per_day = modeSettings.periods_per_day || settings.periods_per_day;
      settings.period_duration = modeSettings.period_duration || settings.period_duration;
      settings.start_time = modeSettings.start_time || settings.start_time;
      settings.lab_duration = modeSettings.lab_duration || settings.lab_duration;
      settings.breaks = modeSettings.breaks || settings.breaks;
    } else {
      settings.institution_type = mode;
    }

    await settings.save();

    // Update institution active mode
    institution.activeMode = mode;
    await institution.save();

    // Audit log
    logAuditFromRequest(
      req,
      "SWITCH_INSTITUTION_MODE",
      "institution",
      institution._id,
      { mode, previousMode: institution.activeMode }
    ).catch(() => { });

    res.json({
      message: `Switched to ${mode} mode successfully`,
      activeMode: mode,
      institutionType: mode,
    });
  } catch (error) {
    console.error("Switch mode error:", error);
    res.status(500).json({ message: "Failed to switch mode" });
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
