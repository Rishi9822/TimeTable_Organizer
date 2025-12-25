import React, { createContext, useContext, useState, useCallback } from "react";

const TimetableContext = createContext(undefined);

export const useTimetableContext = () => {
  const context = useContext(TimetableContext);
  if (!context) {
    throw new Error("useTimetableContext must be used within a TimetableProvider");
  }
  return context;
};

export const TimetableProvider = ({ children }) => {
  const [globalAssignments, setGlobalAssignments] = useState(new Map());

  const addAssignment = useCallback((classId, assignment) => {
    setGlobalAssignments((prev) => {
      const updated = new Map(prev);
      const classAssignments = updated.get(classId) || [];

      const filtered = classAssignments.filter(
        (a) => !(a.day === assignment.day && a.period === assignment.period)
      );

      filtered.push({ ...assignment, classId });
      updated.set(classId, filtered);
      return updated;
    });
  }, []);

  const removeAssignment = useCallback((classId, day, period) => {
    setGlobalAssignments((prev) => {
      const updated = new Map(prev);
      const classAssignments = updated.get(classId) || [];
      const filtered = classAssignments.filter(
        (a) => !(a.day === day && a.period === period)
      );
      updated.set(classId, filtered);
      return updated;
    });
  }, []);

  const clearClassAssignments = useCallback((classId) => {
    setGlobalAssignments((prev) => {
      const updated = new Map(prev);
      updated.delete(classId);
      return updated;
    });
  }, []);

  const isTeacherAvailable = useCallback(
    (teacherId, day, period, excludeClassId) => {
      for (const [classId, assignments] of globalAssignments) {
        if (excludeClassId && classId === excludeClassId) continue;

        const conflict = assignments.find(
          (a) =>
            a.teacherId === teacherId &&
            a.day === day &&
            a.period === period
        );

        if (conflict) return false;
      }
      return true;
    },
    [globalAssignments]
  );

  const getTeacherConflict = useCallback(
    (teacherId, day, period, excludeClassId) => {
      for (const [classId, assignments] of globalAssignments) {
        if (excludeClassId && classId === excludeClassId) continue;

        const conflict = assignments.find(
          (a) =>
            a.teacherId === teacherId &&
            a.day === day &&
            a.period === period
        );

        if (conflict) return conflict;
      }
      return null;
    },
    [globalAssignments]
  );

  const getTeacherAssignments = useCallback(
    (teacherId) => {
      const allAssignments = [];
      for (const assignments of globalAssignments.values()) {
        allAssignments.push(
          ...assignments.filter((a) => a.teacherId === teacherId)
        );
      }
      return allAssignments;
    },
    [globalAssignments]
  );

  return (
    <TimetableContext.Provider
      value={{
        globalAssignments,
        addAssignment,
        removeAssignment,
        clearClassAssignments,
        isTeacherAvailable,
        getTeacherConflict,
        getTeacherAssignments,
      }}
    >
      {children}
    </TimetableContext.Provider>
  );
};
