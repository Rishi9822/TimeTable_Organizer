import React, { createContext, useContext, useState, useCallback } from "react";

const DemoContext = createContext(null);

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within DemoProvider");
  }
  return context;
};

// Hardcoded demo data
const DEMO_TEACHERS = [
  { id: "demo-teacher-1", name: "Dr. Sarah Johnson", email: "sarah@demo.com", department: "Mathematics" },
  { id: "demo-teacher-2", name: "Prof. Michael Chen", email: "michael@demo.com", department: "Science" },
  { id: "demo-teacher-3", name: "Ms. Emily Williams", email: "emily@demo.com", department: "English" },
  { id: "demo-teacher-4", name: "Mr. David Brown", email: "david@demo.com", department: "History" },
  { id: "demo-teacher-5", name: "Dr. Lisa Anderson", email: "lisa@demo.com", department: "Physics" },
];

const DEMO_SUBJECTS = [
  { id: "demo-subject-1", name: "Mathematics", code: "MATH101" },
  { id: "demo-subject-2", name: "Science", code: "SCI101" },
  { id: "demo-subject-3", name: "English", code: "ENG101" },
  { id: "demo-subject-4", name: "History", code: "HIS101" },
  { id: "demo-subject-5", name: "Physics", code: "PHY101" },
];

const MAX_DEMO_CLASSES = 2;

export const DemoProvider = ({ children }) => {
  const [demoClasses, setDemoClasses] = useState([]);
  const [demoTimetable, setDemoTimetable] = useState(null);

  // Demo teachers and subjects are fixed
  const demoTeachers = DEMO_TEACHERS;
  const demoSubjects = DEMO_SUBJECTS;

  const createDemoClass = useCallback((classData) => {
    if (demoClasses.length >= MAX_DEMO_CLASSES) {
      throw new Error(`Demo mode is limited to ${MAX_DEMO_CLASSES} classes. Reset the demo to create more.`);
    }

    const newClass = {
      id: `demo-class-${Date.now()}`,
      name: classData.name,
      grade: classData.grade || null,
      section: classData.section || null,
      institution_type: classData.institution_type || "school",
      capacity: classData.capacity || 40,
      createdAt: new Date().toISOString(),
    };

    setDemoClasses((prev) => [...prev, newClass]);
    return newClass;
  }, [demoClasses.length]);

  const deleteDemoClass = useCallback((classId) => {
    setDemoClasses((prev) => prev.filter((cls) => cls.id !== classId));
    // Also remove from timetable if it exists
    if (demoTimetable && demoTimetable.classId === classId) {
      setDemoTimetable(null);
    }
  }, [demoTimetable]);

  const resetDemo = useCallback(() => {
    setDemoClasses([]);
    setDemoTimetable(null);
  }, []);

  const updateDemoTimetable = useCallback((timetableData) => {
    setDemoTimetable(timetableData);
  }, []);

  return (
    <DemoContext.Provider
      value={{
        // Data
        demoClasses,
        demoTeachers,
        demoSubjects,
        demoTimetable,
        
        // Actions
        createDemoClass,
        deleteDemoClass,
        resetDemo,
        updateDemoTimetable,
        
        // Constants
        maxDemoClasses: MAX_DEMO_CLASSES,
        isDemoMode: true,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};









