/**
 * Plan-based feature limits
 * These limits are enforced at the middleware/controller level
 */

export const PLAN_LIMITS = {
  trial: {
    maxClasses: 5,
    maxTeachers: 10,
    allowExports: false,
    allowSchedulerInvites: true, // Allow but limited
    maxSchedulerAccounts: 2,
    allowInstitutionTypeSwitch: false,
  },
  standard: {
    maxClasses: Infinity,
    maxTeachers: Infinity,
    allowExports: true,
    allowSchedulerInvites: true,
    maxSchedulerAccounts: Infinity,
    allowInstitutionTypeSwitch: false, // Standard plan locks to one type
  },
  flex: {
    maxClasses: Infinity,
    maxTeachers: Infinity,
    allowExports: true,
    allowSchedulerInvites: true,
    maxSchedulerAccounts: Infinity,
    allowInstitutionTypeSwitch: true, // Flex plan allows switching
  },
};

/**
 * Get plan limits for a given plan
 */
export const getPlanLimits = (plan = "trial") => {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
};

/**
 * Check if an action is allowed for a plan
 */
export const isActionAllowed = (plan, action) => {
  const limits = getPlanLimits(plan);
  
  switch (action) {
    case "export":
      return limits.allowExports;
    case "create_class":
      return true; // Always allowed, but count is checked separately
    case "create_teacher":
      return true; // Always allowed, but count is checked separately
    case "create_scheduler":
      return limits.allowSchedulerInvites;
    case "switch_institution_type":
      return limits.allowInstitutionTypeSwitch;
    default:
      return false;
  }
};

/**
 * Check if institution has reached class limit
 */
export const hasReachedClassLimit = (plan, currentClassCount) => {
  const limits = getPlanLimits(plan);
  if (limits.maxClasses === Infinity) return false;
  return currentClassCount >= limits.maxClasses;
};

/**
 * Check if institution has reached teacher limit
 */
export const hasReachedTeacherLimit = (plan, currentTeacherCount) => {
  const limits = getPlanLimits(plan);
  if (limits.maxTeachers === Infinity) return false;
  return currentTeacherCount >= limits.maxTeachers;
};

/**
 * Check if institution has reached scheduler limit
 */
export const hasReachedSchedulerLimit = (plan, currentSchedulerCount) => {
  const limits = getPlanLimits(plan);
  if (limits.maxSchedulerAccounts === Infinity) return false;
  return currentSchedulerCount >= limits.maxSchedulerAccounts;
};

/**
 * Validate if institution can switch institution type based on plan rules
 * @param {object} institution - Institution document
 * @param {string} newType - New institution type (school or college)
 * @param {object} settings - Current InstitutionSettings document
 * @returns {object} { allowed: boolean, reason?: string }
 */
export const canSwitchInstitutionType = (institution, newType, settings) => {
  if (!institution || !newType) {
    return { allowed: false, reason: "Invalid institution or type" };
  }

  const currentType = settings?.institution_type;

  // If type hasn't changed, allow
  if (currentType === newType) {
    return { allowed: true };
  }

  // Standard plan: Type is locked after setup
  if (institution.plan === "standard") {
    if (institution.institutionTypeLocked || institution.isSetupComplete) {
      return {
        allowed: false,
        reason: "Standard plan locks institution type after setup. Upgrade to Flex plan to switch between school and college modes.",
      };
    }
    // Allow if setup is not complete yet
    return { allowed: true };
  }

  // Flex plan: Can switch only after both modes are completed
  if (institution.plan === "flex") {
    const completedModes = institution.completedModes || [];
    
    // Check if both modes are completed
    const hasSchool = completedModes.includes("school");
    const hasCollege = completedModes.includes("college");

    if (!hasSchool || !hasCollege) {
      return {
        allowed: false,
        reason: "Flex plan requires both school and college modes to be set up before switching. Please complete setup for both modes first.",
      };
    }

    // Both modes are completed, switching is allowed
    return { allowed: true };
  }

  // Trial plan: Type is locked after setup
  if (institution.plan === "trial") {
    if (institution.isSetupComplete) {
      return {
        allowed: false,
        reason: "Trial plan locks institution type after setup. Upgrade to Flex plan to switch between school and college modes.",
      };
    }
    return { allowed: true };
  }

  // Default: not allowed
  return { allowed: false, reason: "Institution type switching is not allowed for this plan" };
};

/**
 * Validate if institution can complete setup for a specific mode (Flex plan)
 * @param {object} institution - Institution document
 * @param {string} mode - Mode to setup (school or college)
 * @returns {object} { allowed: boolean, reason?: string }
 */
export const canCompleteModeSetup = (institution, mode) => {
  if (!institution || !mode || !["school", "college"].includes(mode)) {
    return { allowed: false, reason: "Invalid institution or mode" };
  }

  // Only Flex plan supports multiple mode setups
  if (institution.plan !== "flex") {
    return { allowed: false, reason: "Multiple mode setup is only available for Flex plan" };
  }

  const completedModes = institution.completedModes || [];
  
  // Check if mode is already completed
  if (completedModes.includes(mode)) {
    return { allowed: false, reason: `Mode "${mode}" is already set up` };
  }

  // Flex plan allows up to 2 modes (school and college)
  if (completedModes.length >= 2) {
    return { allowed: false, reason: "Maximum of 2 modes (school and college) can be set up" };
  }

  return { allowed: true };
};









