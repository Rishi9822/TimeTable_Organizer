import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import API from "@/lib/api";

const TimetableContext = createContext(undefined);

export const useTimetableContext = () => {
  const context = useContext(TimetableContext);
  if (!context) {
    throw new Error("useTimetableContext must be used within a TimetableProvider");
  }
  return context;
};

export const TimetableProvider = ({ children }) => {
  // Store timetables by classId: { periods: {...}, isPublished: boolean, ... }
  const [timetables, setTimetables] = useState(new Map());
  const [loadingTimetables, setLoadingTimetables] = useState(new Set());
  const [savingTimetables, setSavingTimetables] = useState(new Set());
  
  // Use ref to access current timetables in callbacks without dependencies
  const timetablesRef = useRef(timetables);
  useEffect(() => {
    timetablesRef.current = timetables;
  }, [timetables]);

  /**
   * Load timetable for a class from backend
   */
  const loadTimetable = useCallback(async (classId) => {
    if (!classId) return null;

    // Check if already loading and prevent duplicate calls
    let shouldLoad = false;
    setLoadingTimetables((prev) => {
      if (prev.has(classId)) {
        return prev; // Already loading
      }
      shouldLoad = true;
      const updated = new Set(prev);
      updated.add(classId);
      return updated;
    });

    if (!shouldLoad) {
      // Return cached timetable if available
      return timetablesRef.current.get(classId) || null;
    }

    try {
      const { data } = await API.get(`/timetables/${classId}`);
      
      // Ensure classId is normalized in the response
      const normalizedData = {
        ...data,
        classId: String(data.classId || classId),
      };
      
      setTimetables((prev) => {
        const updated = new Map(prev);
        updated.set(String(classId), normalizedData);
        return updated;
      });

      return normalizedData;
    } catch (error) {
      console.error("Failed to load timetable:", error);
      // Return empty timetable structure
      const emptyTimetable = {
        classId: String(classId),
        periods: {},
        isPublished: false,
        isEmpty: true,
      };
      setTimetables((prev) => {
        const updated = new Map(prev);
        updated.set(String(classId), emptyTimetable);
        return updated;
      });
      return emptyTimetable;
    } finally {
      setLoadingTimetables((prev) => {
        const updated = new Set(prev);
        updated.delete(classId);
        return updated;
      });
    }
  }, []); // No dependencies - uses functional updates

  /**
   * Save timetable for a class to backend
   */
  const saveTimetable = useCallback(async (classId, periods, weekStructure) => {
    // Check if already saving using functional update
    let shouldProceed = false;
    setSavingTimetables((prev) => {
      if (prev.has(classId)) {
        return prev; // Already saving
      }
      shouldProceed = true;
      const updated = new Set(prev);
      updated.add(classId);
      return updated;
    });

    if (!shouldProceed) return;

    try {
      const { data } = await API.post(`/timetables/${classId}`, {
        periods,
        weekStructure,
      });

      // Ensure classId is normalized
      const normalizedData = {
        ...data,
        classId: String(data.classId || classId),
      };

      setTimetables((prev) => {
        const updated = new Map(prev);
        updated.set(String(classId), normalizedData);
        return updated;
      });

      return normalizedData;
    } catch (error) {
      console.error("Failed to save timetable:", error);
      throw error;
    } finally {
      setSavingTimetables((prev) => {
        const updated = new Set(prev);
        updated.delete(classId);
        return updated;
      });
    }
  }, []); // No dependencies - uses functional updates

  /**
   * Publish timetable for a class
   */
  const publishTimetable = useCallback(async (classId) => {
    try {
      const { data } = await API.post(`/timetables/${classId}/publish`);
      
      setTimetables((prev) => {
        const updated = new Map(prev);
        const classIdStr = String(classId);
        const timetable = updated.get(classIdStr);
        if (timetable) {
          updated.set(classIdStr, { ...timetable, isPublished: true });
        }
        return updated;
      });

      return data;
    } catch (error) {
      console.error("Failed to publish timetable:", error);
      throw error;
    }
  }, []);

  /**
   * Get timetable for a class (from cache or load)
   * CRITICAL: Normalize classId to string for consistent lookup
   */
  const getTimetable = useCallback((classId) => {
    if (!classId) return null;
    return timetables.get(String(classId)) || null;
  }, [timetables]);

  /**
   * Check if timetable is loading
   */
  const isLoading = useCallback((classId) => {
    return loadingTimetables.has(classId);
  }, [loadingTimetables]);

  /**
   * Check if timetable is saving
   */
  const isSaving = useCallback((classId) => {
    return savingTimetables.has(classId);
  }, [savingTimetables]);

  /**
   * Get all periods for conflict detection across all classes
   */
  const getAllPeriods = useCallback(() => {
    const allPeriods = {};
    for (const [classId, timetable] of timetables) {
      if (timetable.periods) {
        allPeriods[classId] = timetable.periods;
      }
    }
    return allPeriods;
  }, [timetables]);

  /**
   * Load all timetables for the institution (for conflict detection)
   */
  const loadAllTimetables = useCallback(async () => {
    try {
      const { data } = await API.get("/timetables");
      
      setTimetables((prev) => {
        const updated = new Map(prev);
        // Merge all loaded timetables
        if (Array.isArray(data)) {
          data.forEach((timetable) => {
            if (timetable.classId) {
              updated.set(String(timetable.classId), timetable);
            }
          });
        }
        return updated;
      });
    } catch (error) {
      console.error("Failed to load all timetables:", error);
      // Don't throw - this is for conflict detection, not critical
    }
  }, []);

  /**
   * Check if teacher is available at a specific time across all classes
   * CRITICAL: day parameter must be full day name ("Monday"), not short ("Mon")
   */
  const isTeacherAvailable = useCallback(
    (teacherId, dayFull, period, excludeClassId) => {
      // Convert teacherId to string for comparison
      const teacherIdStr = String(teacherId);
      
      for (const [classId, timetable] of timetables) {
        // Skip the excluded class
        if (excludeClassId && String(classId) === String(excludeClassId)) continue;
        
        if (!timetable || !timetable.periods) continue;
        
        // Backend stores periods with full day names ("Monday")
        const dayPeriods = timetable.periods[dayFull];
        if (!dayPeriods || !Array.isArray(dayPeriods)) continue;

        const conflict = dayPeriods.find(
          (p) => p.period === period && String(p.teacherId) === teacherIdStr
        );

        if (conflict) return false;
      }
      return true;
    },
    [timetables]
  );

  /**
   * Get teacher conflict details
   * CRITICAL: day parameter must be full day name ("Monday"), not short ("Mon")
   */
  const getTeacherConflict = useCallback(
    (teacherId, dayFull, period, excludeClassId) => {
      // Convert teacherId to string for comparison
      const teacherIdStr = String(teacherId);
      
      for (const [classId, timetable] of timetables) {
        // Skip the excluded class
        if (excludeClassId && String(classId) === String(excludeClassId)) continue;
        
        if (!timetable || !timetable.periods) continue;
        
        // Backend stores periods with full day names ("Monday")
        const dayPeriods = timetable.periods[dayFull];
        if (!dayPeriods || !Array.isArray(dayPeriods)) continue;

        const conflict = dayPeriods.find(
          (p) => p.period === period && String(p.teacherId) === teacherIdStr
        );

        if (conflict) {
          return {
            classId,
            day: dayFull,
            period,
            teacherId,
            subjectId: conflict.subjectId,
          };
        }
      }
      return null;
    },
    [timetables]
  );

  return (
    <TimetableContext.Provider
      value={{
        loadTimetable,
        loadAllTimetables,
        saveTimetable,
        publishTimetable,
        getTimetable,
        isLoading,
        isSaving,
        getAllPeriods,
        isTeacherAvailable,
        getTeacherConflict,
      }}
    >
      {children}
    </TimetableContext.Provider>
  );
};
