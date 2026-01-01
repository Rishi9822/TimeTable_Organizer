import InstitutionSettings from "../models/InstitutionSettings.js";
import Institution from "../models/Institution.js";
import User from "../models/User.js";
import InviteCode from "../models/InviteCode.js";
import { logAuditFromRequest } from "../utils/auditLogger.js";
import { requireWritableInstitution } from "../middleware/institutionStatusMiddleware.js";
import { getPlanLimits, isActionAllowed } from "../utils/planLimits.js";


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


export const upsertInstitutionSettings = async (req, res) => {
  try {
    // CRITICAL: Verify user belongs to an institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to modify settings",
      });
    }

    const institution = await Institution.findById(req.user.institutionId);
    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    const isFlex = institution.plan === "flex";

    const plan = institution.plan || "trial";

    const {
      institution_name,
      institution_type,
      working_days,
      periods_per_day,
      period_duration,
      start_time,
      lab_duration,
      breaks,
      ...rest
    } = req.body || {};

    let settings = await InstitutionSettings.findOne({
      institutionId: req.user.institutionId,
    });

if (settings.activeMode === mode) {
  return res.json({
    activeMode: settings.activeMode,
    institutionType: settings.institution_type,
    schoolSetupComplete: Boolean(settings.schoolSetupComplete),
    collegeSetupComplete: Boolean(settings.collegeSetupComplete),
  });
}


    const mirrorActiveConfig = (settings) => {
      if (!settings.activeMode) return;

      const source =
        settings.activeMode === "school"
          ? settings.schoolConfig
          : settings.collegeConfig;

      if (!source) return;

      settings.institution_type = source.institution_type;
      settings.working_days = source.working_days;
      settings.periods_per_day = source.periods_per_day;
      settings.period_duration = source.period_duration;
      settings.start_time = source.start_time;
      settings.lab_duration = source.lab_duration;
      settings.breaks = source.breaks;
      settings.is_setup_complete = true;
    };



    if (!settings) {
      settings = new InstitutionSettings({
        institutionId: req.user.institutionId,
      });
    }


     // 🚨 HARD RESET Flex-only fields for non-Flex plans
    if (!isFlex && settings) {
      settings.schoolConfig = undefined;
      settings.collegeConfig = undefined;
      settings.schoolSetupComplete = false;
      settings.collegeSetupComplete = false;
      settings.activeMode = null;
    }


    // Always keep name up to date for all plans
    if (institution_name !== undefined) {
      settings.institution_name = institution_name;
    }

    if (plan !== "flex") {
      // Single-mode behavior (trial/standard): just write into legacy fields
      if (institution_type) settings.institution_type = institution_type;
      if (working_days) settings.working_days = working_days;
      if (periods_per_day !== undefined)
        settings.periods_per_day = periods_per_day;
      if (period_duration !== undefined)
        settings.period_duration = period_duration;
      if (start_time !== undefined) settings.start_time = start_time;
      if (lab_duration !== undefined) settings.lab_duration = lab_duration;
      if (breaks !== undefined) settings.breaks = breaks;

      settings.is_setup_complete = true;
      // Preserve any extra fields from req.body for backward compatibility
      Object.assign(settings, rest);
    } else {
      // Flex plan: maintain separate configs for school and college
      const mode = institution_type || settings.activeMode || settings.institution_type;

      if (!mode || !["school", "college"].includes(mode)) {
        return res.status(400).json({
          message:
            "A valid institution_type (school or college) is required to save settings for Flex plan.",
        });
      }

      const baseConfig = {
        institution_type: mode,
        working_days: working_days ?? settings.working_days ?? [],
        periods_per_day:
          periods_per_day ?? settings.periods_per_day ?? undefined,
        period_duration:
          period_duration ?? settings.period_duration ?? undefined,
        start_time: start_time ?? settings.start_time ?? undefined,
        lab_duration: lab_duration ?? settings.lab_duration ?? undefined,
        breaks: breaks ?? settings.breaks ?? [],
        is_setup_complete: true,
      };

      if (mode === "school") {
        settings.schoolConfig = {
          ...(settings.schoolConfig || {}),
          ...baseConfig,
        };
        settings.schoolSetupComplete = true;
      } else {
        settings.collegeConfig = {
          ...(settings.collegeConfig || {}),
          ...baseConfig,
        };
        settings.collegeSetupComplete = true;
      }

      // Set active mode to the last edited mode if not explicitly set
      settings.activeMode = settings.activeMode || mode;

      // Mirror the active mode config into legacy fields so existing
      // consumers (timetable builder, contexts) continue to work.
      const activeConfig =
        settings.activeMode === "school"
          ? settings.schoolConfig
          : settings.collegeConfig;
      Object.assign(settings, rest);
    }

mirrorActiveConfig(settings);
await settings.save();

    // Audit log: Log AFTER successful settings update
    logAuditFromRequest(
      req,
      "UPDATE_INSTITUTION_SETTINGS",
      "institution",
      req.user.institutionId,
      {}
    ).catch(() => { }); // Silently ignore logging errors

    res.json(settings);
  } catch (error) {
    console.error("Upsert institution settings error:", error);
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
    ).catch(() => { }); // Silently ignore logging errors
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
    ).catch(() => { }); // Silently ignore logging errors
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

    // Get settings to include institution type and multi-mode info
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
institutionType:
  settings?.institution_type ??
  settings?.activeMode ??
  null,
      activeMode: settings?.activeMode ?? settings?.institution_type ?? null,
      schoolSetupComplete: Boolean(settings?.schoolSetupComplete),
      collegeSetupComplete: Boolean(settings?.collegeSetupComplete),
      isSetupComplete: institution.isSetupComplete,
      createdAt: institution.createdAt,
    });
  } catch (error) {
    console.error("Get institution info error:", error);
    res.status(500).json({ message: "Failed to get institution info" });
  }
};




/**
 * POST /api/institutions/switch-mode
 * Flex-only: switch active mode between school and college without
 * losing either configuration.
 */
export const switchInstitutionMode = async (req, res) => {
  try {
    const { mode } = req.body || {};

    if (req.user.role !== "admin") {
  return res.status(403).json({
    message: "Only admins can switch institution mode",
  });
}


    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to switch modes",
      });
    }

    if (!mode || !["school", "college"].includes(mode)) {
      return res.status(400).json({
        message: "A valid mode (school or college) is required",
      });
    }

    const institution = await Institution.findById(req.user.institutionId);
    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    if (institution.plan !== "flex") {
      return res.status(403).json({
        message:
          "Mode switching is only available on the Flex plan. Upgrade to Flex to maintain multiple configurations.",
      });
    }

    const settings = await InstitutionSettings.findOne({
      institutionId: req.user.institutionId,
    });

    if (!settings) {
      return res.status(400).json({
        message:
          "No institution settings found. Complete setup for at least one mode before switching.",
      });
    }

    // Switching is only allowed once BOTH setups are complete
    if (!settings.schoolSetupComplete || !settings.collegeSetupComplete) {
      return res.status(400).json({
        message:
          "You can switch modes only after completing both School and College configurations.",
      });
    }

    const sourceConfig =
      mode === "school" ? settings.schoolConfig : settings.collegeConfig;

    if (!sourceConfig || !sourceConfig.is_setup_complete) {
      return res.status(400).json({
        message: `The ${mode} configuration is not complete. Please complete its setup before switching.`,
      });
    }

    // Apply the chosen mode as active and mirror its config into legacy fields
    settings.activeMode = mode;
    settings.institution_type = sourceConfig.institution_type;
    settings.working_days = sourceConfig.working_days;
    settings.periods_per_day = sourceConfig.periods_per_day;
    settings.period_duration = sourceConfig.period_duration;
    settings.start_time = sourceConfig.start_time;
    settings.lab_duration = sourceConfig.lab_duration;
    settings.breaks = sourceConfig.breaks;
    settings.is_setup_complete = true;

    await settings.save();

    logAuditFromRequest(
      req,
      "SWITCH_INSTITUTION_MODE",
      "institution",
      req.user.institutionId,
      { mode }
    ).catch(() => { });

    res.json({
      activeMode: settings.activeMode,
      institutionType: settings.institution_type,
      schoolSetupComplete: Boolean(settings.schoolSetupComplete),
      collegeSetupComplete: Boolean(settings.collegeSetupComplete),
    });
  } catch (error) {
    console.error("Switch institution mode error:", error);
    res.status(500).json({ message: "Failed to switch institution mode" });
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
