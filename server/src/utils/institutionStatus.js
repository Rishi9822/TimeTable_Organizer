/**
 * Institution status utilities
 * Handles status checks and trial expiration
 */

/**
 * Check if trial has expired
 */
export const isTrialExpired = (institution) => {
  if (institution.status !== "trial") return false;
  if (!institution.trialEndsAt) return false;
  return new Date() > new Date(institution.trialEndsAt);
};

/**
 * Get days remaining in trial
 */
export const getTrialDaysRemaining = (institution) => {
  if (institution.status !== "trial") return null;
  if (!institution.trialEndsAt) return null;
  
  const now = new Date();
  const endsAt = new Date(institution.trialEndsAt);
  const diffTime = endsAt - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

/**
 * Check if institution is in read-only mode
 * Suspended institutions are read-only
 * Active paid institutions (standard/flex) are never read-only
 */
export const isReadOnly = (institution) => {
  // Active paid institutions are never read-only
  if (institution.status === "active" && (institution.plan === "standard" || institution.plan === "flex")) {
    return false;
  }
  
  // Suspended and archived institutions are read-only
  return institution.status === "suspended" || institution.status === "archived";
};

/**
 * Check if institution can be edited
 * Active paid institutions can always edit
 * Trial institutions can edit until expiry
 */
export const canEdit = (institution) => {
  // Active paid institutions can always edit
  if (institution.status === "active" && (institution.plan === "standard" || institution.plan === "flex")) {
    return true;
  }
  
  // Archived institutions cannot edit
  if (institution.status === "archived") return false;
  
  // Suspended institutions cannot edit
  if (institution.status === "suspended") return false;
  
  // Trial institutions can edit (until expiry, which is checked separately)
  if (institution.status === "trial") return true;
  
  // Default: can edit
  return true;
};

/**
 * Auto-update institution status if trial expired
 * Should be called periodically or on access
 */
export const checkAndUpdateTrialStatus = async (institution) => {
  if (institution.status === "trial" && isTrialExpired(institution)) {
    // Import here to avoid circular dependencies
    const Institution = (await import("../models/Institution.js")).default;
    
    institution.status = "suspended";
    await institution.save();
    
    return {
      updated: true,
      newStatus: "suspended",
      message: "Trial period has expired. Account is now suspended.",
    };
  }
  
  return {
    updated: false,
    status: institution.status,
  };
};



