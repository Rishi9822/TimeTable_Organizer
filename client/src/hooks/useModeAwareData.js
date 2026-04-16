import { useTeachers, useClasses, useSubjects } from "@/hooks/useTeachers";
import { useSubscription } from "@/contexts/SubscriptionContext";

/**
 * Mode-aware data hooks that filter based on the active Flex mode.
 * For Standard/Trial plans, returns all data unfiltered.
 */

export function useModeAwareTeachers() {
  const { activeMode, plan } = useSubscription();
  const query = useTeachers();

  if (plan !== "flex" || !activeMode) return query;

  return {
    ...query,
    data: query.data?.filter(
      (t) => !t.modeType || t.modeType === activeMode
    ),
  };
}

export function useModeAwareClasses() {
  const { activeMode, plan } = useSubscription();
  const query = useClasses();

  if (plan !== "flex" || !activeMode) return query;

  return {
    ...query,
    data: query.data?.filter(
      (c) => !c.modeType || c.modeType === activeMode
    ),
  };
}

export function useModeAwareSubjects() {
  const { activeMode, plan } = useSubscription();
  const query = useSubjects();

  if (plan !== "flex" || !activeMode) return query;

  return {
    ...query,
    data: query.data?.filter(
      (s) => !s.modeType || s.modeType === activeMode
    ),
  };
}
