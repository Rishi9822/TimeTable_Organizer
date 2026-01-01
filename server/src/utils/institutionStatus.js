/**
 * Institution status utilities
 * Handles status checks and trial expiration
 */

export const isTrialExpired = (institution) => {
  if (institution.status !== "trial") return false;
  if (!institution.trialEndsAt) return false;
  return new Date() > new Date(institution.trialEndsAt);
};

export const getTrialDaysRemaining = (institution) => {
  if (institution.status !== "trial") return null;
  if (!institution.trialEndsAt) return null;

  const now = new Date();
  const endsAt = new Date(institution.trialEndsAt);
  const diffTime = endsAt - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

export const isReadOnly = (institution) => {
  return institution.status === "suspended" || institution.status === "archived";
};

export const canEdit = (institution) => {
  return !isReadOnly(institution);
};

export const checkAndUpdateTrialStatus = async (institution) => {
  // Trial expiry applies ONLY when BOTH are true
  if (institution.plan !== "trial") return { updated: false };
  if (institution.status !== "trial") return { updated: false };

  if (isTrialExpired(institution)) {
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

