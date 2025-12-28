import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  useInstitutionSettings,
  useUpsertInstitutionSettings,
} from "@/hooks/useTeachers";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";


const defaultConfig = {
  institutionName: "",
  institutionType: null,
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  periodsPerDay: 8,
  periodDuration: 45,
  breaks: [
    { afterPeriod: 3, duration: 15, label: "Short Break" },
    { afterPeriod: 5, duration: 45, label: "Lunch Break" },
  ],
  startTime: "08:00",
  labDuration: 120,
  periods: [],
  isSetupComplete: false,
};

const InstitutionContext = createContext(undefined);

export const useInstitutionContext = () => {
  const context = useContext(InstitutionContext);
  if (!context) {
    throw new Error(
      "useInstitutionContext must be used within an InstitutionProvider"
    );
  }
  return context;
};

// Helper to add minutes to time string
const addMinutes = (time, minutes) => {
  const [hours, mins] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(
    2,
    "0"
  )}`;
};

export const InstitutionProvider = ({ children }) => {
  const [config, setConfig] = useState(defaultConfig);
  const { user, institutionId, refreshUserData } = useAuth();

  const { data: dbSettings, isLoading } = useInstitutionSettings({
    enabled: Boolean(user && institutionId),
  });


  const upsertSettings = useUpsertInstitutionSettings();

  useEffect(() => {
    if (dbSettings) {
      setConfig({
        institutionName: dbSettings.institution_name || "",
        institutionType: dbSettings.institution_type,
        workingDays:
          dbSettings.working_days || defaultConfig.workingDays,
        periodsPerDay:
          dbSettings.periods_per_day || defaultConfig.periodsPerDay,
        periodDuration:
          dbSettings.period_duration || defaultConfig.periodDuration,
        breaks: dbSettings.breaks || defaultConfig.breaks,
        startTime: dbSettings.start_time || defaultConfig.startTime,
        labDuration: dbSettings.lab_duration || defaultConfig.labDuration,
        periods: [],
        isSetupComplete: dbSettings.is_setup_complete || false,
      });
    }
  }, [dbSettings]);

  const updateConfig = useCallback((updates) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  const generatePeriods = useCallback(() => {
    const periods = [];
    let currentTime = config.startTime;
    let periodNumber = 1;

    for (let i = 0; i < config.periodsPerDay; i++) {
      const breakConfig = config.breaks.find(
        (b) => b.afterPeriod === periodNumber
      );

      const periodEnd = addMinutes(
        currentTime,
        config.periodDuration
      );

      periods.push({
        id: `p-${periodNumber}`,
        number: periodNumber,
        startTime: currentTime,
        endTime: periodEnd,
        duration: config.periodDuration,
        isBreak: false,
      });

      currentTime = periodEnd;

      if (breakConfig) {
        const breakEnd = addMinutes(
          currentTime,
          breakConfig.duration
        );

        periods.push({
          id: `break-${periodNumber}`,
          number: 0,
          startTime: currentTime,
          endTime: breakEnd,
          duration: breakConfig.duration,
          isBreak: true,
          label: breakConfig.label,
        });

        currentTime = breakEnd;
      }

      periodNumber++;
    }

    setConfig((prev) => ({ ...prev, periods }));
  }, [
    config.startTime,
    config.periodsPerDay,
    config.periodDuration,
    config.breaks,
  ]);

  const completeSetup = useCallback(async () => {
  if (!user) throw new Error("User not authenticated");

  generatePeriods();

  let finalInstitutionId = institutionId;

  if (!institutionId) {
    const res = await api.post("/institutions", {
      institutionName: config.institutionName || "My Institution",
    });

    finalInstitutionId = res.data.institutionId;
  }

  await upsertSettings.mutateAsync({
    institution_id: finalInstitutionId,
    institution_name: config.institutionName,
    institution_type: config.institutionType,
    working_days: config.workingDays,
    periods_per_day: config.periodsPerDay,
    period_duration: config.periodDuration,
    start_time: config.startTime,
    lab_duration: config.labDuration,
    breaks: config.breaks,
  });

  return true;
}, [
  user,
  institutionId,
  config,
  generatePeriods,
  upsertSettings,
]);


  return (
    <InstitutionContext.Provider
      value={{
        config,
        updateConfig,
        resetConfig,
        generatePeriods,
        completeSetup,
        isLoading,
      }}
    >
      {children}
    </InstitutionContext.Provider>
  );
};
