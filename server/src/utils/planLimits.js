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









