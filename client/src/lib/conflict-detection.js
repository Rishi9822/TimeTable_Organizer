// =====================
// Conflict Detection Logic (JS version)
// =====================

// Shape reference (for understanding only):
// TimetableEntry = {
//   slotId: string,
//   day: string,
//   period: number,
//   teacherId: string,
//   subjectId: string
// }

// Conflict = {
//   type: "teacher-overlap" | "subject-duplicate" | "break-violation",
//   message: string,
//   slotIds: string[],
//   severity: "error" | "warning"
// }

export function detectConflicts(
  entries,
  currentClassId,
  teachers = [],
  subjects = []
) {
  const conflicts = [];

  // Helpers
  const getTeacherById = (teacherId) =>
    teachers.find((t) => t.id === teacherId);

  const getSubjectById = (subjectId) =>
    subjects.find((s) => s.id === subjectId);

  // =====================
  // Group entries by slot (day-period)
  // =====================
  const slotMap = new Map();

  entries.forEach((entry) => {
    const key = `${entry.day}-${entry.period}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, []);
    }
    slotMap.get(key).push(entry);
  });

  // =====================
  // Teacher overlap detection
  // =====================
  slotMap.forEach((slotEntries) => {
    const teacherCounts = new Map();

    slotEntries.forEach((entry) => {
      if (!teacherCounts.has(entry.teacherId)) {
        teacherCounts.set(entry.teacherId, []);
      }
      teacherCounts.get(entry.teacherId).push(entry);
    });

    teacherCounts.forEach((teacherEntries, teacherId) => {
      if (teacherEntries.length > 1) {
        const teacher = getTeacherById(teacherId);
        conflicts.push({
          type: "teacher-overlap",
          message: `${
            teacher?.name || "Teacher"
          } is assigned to multiple classes at the same time`,
          slotIds: teacherEntries.map((e) => e.slotId),
          severity: "error",
        });
      }
    });
  });

  // =====================
  // Subject repetition per day
  // =====================
  const daySubjectMap = new Map();

  entries.forEach((entry) => {
    if (!daySubjectMap.has(entry.day)) {
      daySubjectMap.set(entry.day, new Map());
    }

    const dayMap = daySubjectMap.get(entry.day);

    if (!dayMap.has(entry.subjectId)) {
      dayMap.set(entry.subjectId, []);
    }

    dayMap.get(entry.subjectId).push(entry);
  });

  daySubjectMap.forEach((subjectMap, day) => {
    subjectMap.forEach((subjectEntries, subjectId) => {
      if (subjectEntries.length > 2) {
        const subject = getSubjectById(subjectId);
        conflicts.push({
          type: "subject-duplicate",
          message: `${
            subject?.name || "Subject"
          } appears ${subjectEntries.length} times on ${day} (max 2 recommended)`,
          slotIds: subjectEntries.map((e) => e.slotId),
          severity: "warning",
        });
      }
    });
  });

  return conflicts;
}

// =====================
// Single-slot conflict check
// =====================
export function checkSlotConflict(
  day,
  period,
  teacherId,
  existingEntries,
  teachers = [],
  excludeSlotId
) {
  const getTeacherById = (tid) =>
    teachers.find((t) => t.id === tid);

  const conflictingEntry = existingEntries.find(
    (e) =>
      e.day === day &&
      e.period === period &&
      e.teacherId === teacherId &&
      e.slotId !== excludeSlotId
  );

  if (conflictingEntry) {
    const teacher = getTeacherById(teacherId);
    return {
      type: "teacher-overlap",
      message: `${
        teacher?.name || "Teacher"
      } is already teaching at this time`,
      slotIds: [conflictingEntry.slotId],
      severity: "error",
    };
  }

  return null;
}

// =====================
// Slot status helper
// =====================
export function getSlotStatus(slotId, conflicts) {
  const slotConflicts = conflicts.filter((c) =>
    c.slotIds.includes(slotId)
  );

  return {
    hasError: slotConflicts.some((c) => c.severity === "error"),
    hasWarning: slotConflicts.some((c) => c.severity === "warning"),
    messages: slotConflicts.map((c) => c.message),
  };
}
