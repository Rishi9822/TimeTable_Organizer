import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { useState, useMemo, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import DroppableSlot from './DroppableSlot';
import DraggableSubject from './DraggableSubjects';
import { DAYS, DAYS_SHORT, DEFAULT_PERIODS } from '@/lib/timetable-types';
import { detectConflicts, getSlotStatus } from '@/lib/conflict-detection';
import { useTimetableContext } from '@/contexts/TimetableContext';
import { useDemo } from '@/contexts/DemoContext';
import {
    useTeacherClassAssignments,
    useTeachers,
    useSubjects
} from '@/hooks/useTeachers';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';



// Generate a color based on teacher name for consistent coloring
const generateTeacherColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${Math.abs(hue)}, 70%, 50%)`;
};

const RealTimetableGrid = forwardRef(({ classId, className: classSectionName, onChange, hasUnsavedChanges }, ref) => {
    const [assignments, setAssignments] = useState(new Map());
    const [activeId, setActiveId] = useState(null);
    const [activeDragData, setActiveDragData] = useState(null);

    // Fetch data from database
    const { data: teacherClassAssignments = [], isLoading: isLoadingAssignments } =
        useTeacherClassAssignments();

    const { data: allTeachers = [] } = useTeachers();
    const { data: allSubjects = [] } = useSubjects();

    const {
        getTimetable,
        isTeacherAvailable,
        getTeacherConflict,
    } = useTimetableContext();

    // Helper functions to get teacher/subject by id
    const getTeacherById = (teacherId) => allTeachers.find(t => t.id === teacherId);
    const getSubjectById = (subjectId) => allSubjects.find(s => s.id === subjectId);

    // Track previous classId to ensure proper reset
    const previousClassIdRef = useRef(classId);

    // Load timetable when classId changes
    useEffect(() => {
        // CRITICAL: Reset assignments immediately when classId changes
        if (previousClassIdRef.current !== classId) {
            setAssignments(new Map());
            previousClassIdRef.current = classId;
        }

        if (!classId) {
            return;
        }

        // Only update if we have teachers and subjects loaded
        if (!allTeachers.length || !allSubjects.length) {
            // Wait for data to load
            return;
        }

        const timetable = getTimetable(classId);
        
        if (timetable && timetable.periods) {
            // Convert periods object to Map structure for UI
            // CRITICAL: Backend uses full day names ("Monday"), UI uses short names ("Mon")
            const newAssignments = new Map();
            const periods = timetable.periods;

            for (const [dayFull, dayPeriods] of Object.entries(periods)) {
                if (!Array.isArray(dayPeriods)) continue;

                // Convert full day name to short name for slotId
                const dayIndex = DAYS.indexOf(dayFull);
                if (dayIndex === -1) continue; // Skip invalid day names
                const dayShort = DAYS_SHORT[dayIndex];

                for (const periodData of dayPeriods) {
                    const { period, subjectId, teacherId } = periodData;
                    // CRITICAL: Use short day name for slotId (UI format)
                    const slotId = `${dayShort}-${period}`;
                    
                    const teacher = getTeacherById(teacherId);
                    const subject = getSubjectById(subjectId);

                    if (teacher && subject) {
                        newAssignments.set(slotId, {
                            teacherSubjectId: `${teacherId}-${subjectId}`,
                            teacherId,
                            subjectId,
                            teacherName: teacher.name,
                            subjectName: subject.name,
                            subjectShortName: subject.code || subject.name?.slice(0, 4) || "N/A",
                            color: subject.color || generateTeacherColor(teacher.name),
                        });
                    }
                }
            }

            setAssignments(newAssignments);
        } else {
            // Empty timetable - ensure it's cleared
            setAssignments(new Map());
        }
    }, [classId, getTimetable, allTeachers.length, allSubjects.length]); // Only depend on lengths, not arrays

    // Expose getPeriods method to parent
    useImperativeHandle(ref, () => ({
        getPeriods: () => {
            // Convert Map to periods object structure
            const periods = {};
            const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

            assignments.forEach((assignment, slotId) => {
                const [dayShort, periodStr] = slotId.split('-');
                const dayIndex = DAYS_SHORT.indexOf(dayShort);
                if (dayIndex === -1) return;

                const day = DAYS[dayIndex];
                const period = parseInt(periodStr);

                if (!periods[day]) {
                    periods[day] = [];
                }

                periods[day].push({
                    period,
                    subjectId: assignment.subjectId,
                    teacherId: assignment.teacherId,
                });
            });

            return periods;
        },
    }));

    const classTeacherAssignments = useMemo(() => {
        return teacherClassAssignments.filter(
            (a) => a.class_id === classId
        );
    }, [teacherClassAssignments, classId]);




    // Calculate entries for conflict detection
    const entries = useMemo(() => {
        const result = [];
        assignments.forEach((assignment, slotId) => {
            const [day, periodStr] = slotId.split('-');
            result.push({
                slotId,
                day,
                period: parseInt(periodStr),
                teacherId: assignment.teacherId,
                subjectId: assignment.subjectId,
            });
        });
        return result;
    }, [assignments]);


    // Detect all conflicts (within same class)
    const conflicts = useMemo(() => detectConflicts(entries, classId, allTeachers, allSubjects), [entries, classId, allTeachers, allSubjects]);

    // Calculate periods assigned per subject
    const periodsAssigned = useMemo(() => {
        const counts = new Map();
        assignments.forEach(assignment => {
            const current = counts.get(assignment.subjectId) || 0;
            counts.set(assignment.subjectId, current + 1);
        });
        return counts;
    }, [assignments]);

    // Calculate unavailable slots for each teacher (from other classes)
    const teacherUnavailableSlots = useMemo(() => {
        const result = new Map();

        allTeachers.forEach(teacher => {
            const slots = [];

            // Check all periods across all days
            // CRITICAL: Use full day names for conflict detection
            DAYS.forEach((dayFull, dayIndex) => {
                const dayShort = DAYS_SHORT[dayIndex];
                for (let period = 1; period <= 8; period++) {
                    if (!isTeacherAvailable(teacher.id, dayFull, period, classId)) {
                        slots.push({
                            day: dayShort, // Store short name for UI display
                            period,
                        });
                    }
                }
            });

            if (slots.length > 0) {
                result.set(teacher.id, slots);
            }
        });

        return result;
    }, [isTeacherAvailable, classId, allTeachers]);

    // Get unavailable teachers for each slot
    const getUnavailableTeachersForSlot = (dayShort, period) => {
        const unavailable = [];
        
        // CRITICAL: Convert short day name to full name for conflict detection
        const dayIndex = DAYS_SHORT.indexOf(dayShort);
        if (dayIndex === -1) return unavailable;
        const dayFull = DAYS[dayIndex];

        allTeachers.forEach(teacher => {
            if (!isTeacherAvailable(teacher.id, dayFull, period, classId)) {
                unavailable.push({
                    teacherId: teacher.id,
                    teacherName: teacher.name,
                });
            }
        });

        return unavailable;
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
        setActiveDragData(event.active.data.current);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        setActiveId(null);
        setActiveDragData(null);

        if (!over || !active.data.current) return;

        const dragData = active.data.current;
        const slotId = over.id;
        const [day, periodStr] = slotId.split('-');
        const period = parseInt(periodStr);

        // Don't allow dropping on breaks
        if (over.data.current?.isBreak) return;

        // CRITICAL: Convert short day name to full name for conflict detection
        // Backend stores full names ("Monday"), conflict detection needs full names
        const dayIndex = DAYS_SHORT.indexOf(day);
        if (dayIndex === -1) return;
        const dayFull = DAYS[dayIndex];

        // Check for cross-class conflict using backend-aware check
        if (!isTeacherAvailable(dragData.teacherId, dayFull, period, classId)) {
            const conflict = getTeacherConflict(dragData.teacherId, dayFull, period, classId);
            toast.error('Teacher conflict detected!', {
                description: conflict 
                    ? `${dragData.teacherName} is already teaching in another class at this time.`
                    : `${dragData.teacherName} is not available at this time.`,
                icon: <AlertCircle className="w-4 h-4" />,
            });
            return;
        }

        const newAssignment = {
            teacherSubjectId: active.id,
            teacherId: dragData.teacherId,
            subjectId: dragData.subjectId,
            teacherName: dragData.teacherName,
            subjectName: dragData.subjectName,
            subjectShortName: dragData.subjectShortName,
            color: dragData.color,
        };

        // Update local state
        setAssignments(prev => {
            const updated = new Map(prev);
            updated.set(slotId, newAssignment);
            return updated;
        });

        // Notify parent of change
        if (onChange) {
            onChange();
        }

        toast.success('Period assigned!', {
            description: `${dragData.subjectName} with ${dragData.teacherName}`,
            icon: <CheckCircle className="w-4 h-4" />,
        });
    };

    const handleRemoveAssignment = (slotId) => {
        setAssignments(prev => {
            const updated = new Map(prev);
            updated.delete(slotId);
            return updated;
        });

        // Notify parent of change
        if (onChange) {
            onChange();
        }
    };

    // Filter working days (Mon-Fri for now)
    const workingDays = DAYS_SHORT.slice(0, 5);

    // Get periods with proper numbering
    const periods = DEFAULT_PERIODS;

    // Count cross-class conflicts
    const crossClassConflicts = useMemo(() => {
        let count = 0;
        assignments.forEach((assignment, slotId) => {
            const [dayShort, periodStr] = slotId.split('-');
            const dayIndex = DAYS_SHORT.indexOf(dayShort);
            if (dayIndex === -1) return;
            const dayFull = DAYS[dayIndex];
            const period = parseInt(periodStr);
            if (!isTeacherAvailable(assignment.teacherId, dayFull, period, classId)) {
                count++;
            }
        });
        return count;
    }, [assignments, isTeacherAvailable, classId]);

    // Build teacher-subject pairs for the sidebar from database
    const teacherSubjectPairs = useMemo(() => {
        return classTeacherAssignments.map((assignment) => {
            const teacher = getTeacherById(assignment.teacher_id);
            const subject = getSubjectById(assignment.subject_id);

            // DATA INTEGRITY GUARD: Skip assignments with invalid teacher or subject IDs
            // This prevents "Unknown Teacher" from appearing when a teacher is deleted
            if (!teacher || !subject) {
                console.warn(
                    `Skipping assignment with invalid IDs: teacherId=${assignment.teacher_id}, subjectId=${assignment.subject_id}`
                );
                return null;
            }

            return {
                id: assignment.id,
                teacherId: assignment.teacher_id,
                subjectId: assignment.subject_id,
                teacherName: teacher.name,
                subjectName: subject.name,
                subjectShortName: subject.code || subject.name.slice(0, 4) || "N/A",
                color: subject.color || generateTeacherColor(teacher.name),
                periodsRequired: subject.periods_per_week || 4,
            };
        })
        .filter(Boolean); // Remove null entries from invalid assignments
    }, [classTeacherAssignments, allTeachers, allSubjects]);


    if (isLoadingAssignments) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <DndContext
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-6 h-full">
                {/* Sidebar - Subjects to drag */}
                <div className="w-72 shrink-0 bg-card rounded-2xl border border-border/50 p-4 overflow-y-auto">
                    <div className="mb-4">
                        <h3 className="font-semibold text-foreground">Subjects & Teachers</h3>
                        <p className="text-xs text-muted-foreground mt-1">Drag to assign to timetable</p>
                    </div>

                    {teacherSubjectPairs.length === 0 ? (
                        <div className="text-center py-8">
                            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No teachers assigned to this class yet.</p>
                            <p className="text-xs text-muted-foreground mt-1">Go to Teacher Management to assign teachers.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {teacherSubjectPairs.map(ts => {
                                const unavailable = teacherUnavailableSlots.get(ts.teacherId) || [];

                                return (
                                    <DraggableSubject
                                        key={ts.id}
                                        id={ts.id}
                                        teacherId={ts.teacherId}
                                        subjectId={ts.subjectId}
                                        teacherName={ts.teacherName}
                                        subjectName={ts.subjectName}
                                        subjectShortName={ts.subjectShortName}
                                        color={ts.color}
                                        periodsAssigned={periodsAssigned.get(ts.subjectId) || 0}
                                        periodsRequired={ts.periodsRequired}
                                        unavailableSlots={unavailable}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Conflict Summary */}
                    {(conflicts.length > 0 || crossClassConflicts > 0) && (
                        <div className="mt-6 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                            <h4 className="text-sm font-medium text-destructive mb-2">
                                {conflicts.filter(c => c.severity === 'error').length + crossClassConflicts} Conflicts
                            </h4>
                            <div className="space-y-1">
                                {crossClassConflicts > 0 && (
                                    <p className="text-xs text-destructive/80">
                                        {crossClassConflicts} cross-class teacher conflicts
                                    </p>
                                )}
                                {conflicts.filter(c => c.severity === 'error').slice(0, 3).map((conflict, i) => (
                                    <p key={i} className="text-xs text-destructive/80">{conflict.message}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Save status */}
                    {hasUnsavedChanges && (
                        <div className="mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20">
                            <p className="text-xs text-warning-foreground">
                                ⚠️ You have unsaved changes
                            </p>
                        </div>
                    )}
                </div>

                {/* Main Grid */}
                <div className="flex-1 overflow-auto">
                    <div className="bg-card rounded-2xl border border-border/50 p-4 min-w-[800px]">
                        {/* Header with class info */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">{classSectionName}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {assignments.size} periods assigned • {conflicts.filter(c => c.severity === 'error').length + crossClassConflicts} conflicts
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="w-3 h-3 rounded-full bg-destructive/50" />
                                    <span>Conflict</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="w-3 h-3 rounded-full bg-warning/50" />
                                    <span>Warning</span>
                                </div>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid gap-2" style={{ gridTemplateColumns: `80px repeat(${workingDays.length}, 1fr)` }}>
                            {/* Header row */}
                            <div className="h-10" /> {/* Empty corner */}
                            {workingDays.map(day => (
                                <div
                                    key={day}
                                    className="h-10 flex items-center justify-center font-semibold text-sm text-foreground bg-muted/50 rounded-lg"
                                >
                                    {day}
                                </div>
                            ))}

                            {/* Period rows */}
                            {periods.map((period, periodIndex) => (
                                <div key={`row-${periodIndex}`} className="contents">

                                    {/* Time column */}
                                    <div
                                        key={`time-${periodIndex}`}
                                        className={cn(
                                            'flex flex-col items-center justify-center text-xs',
                                            period.isBreak ? 'text-muted-foreground' : 'text-foreground'
                                        )}
                                    >
                                        {period.isBreak ? (
                                            <span className="font-medium">{period.label}</span>
                                        ) : (
                                            <>
                                                <span className="font-semibold">P{period.number}</span>
                                                <span className="text-muted-foreground">{period.start}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Day cells */}
                                    {workingDays.map(day => {
                                        // Use period number, not index (for breaks, period.number is 0)
                                        const periodNum = period.number || periodIndex;
                                        const slotId = `${day}-${periodNum}`;
                                        const assignment = assignments.get(slotId);
                                        const slotStatus = getSlotStatus(slotId, conflicts);
                                        const unavailableTeachers = getUnavailableTeachersForSlot(day, periodNum);

                                        // Check for cross-class conflict on this slot
                                        let hasCrossClassConflict = false;
                                        if (assignment && !period.isBreak) {
                                            // CRITICAL: Convert short day name to full name
                                            const dayIndex = DAYS_SHORT.indexOf(day);
                                            if (dayIndex !== -1) {
                                                const dayFull = DAYS[dayIndex];
                                                if (!isTeacherAvailable(assignment.teacherId, dayFull, periodNum, classId)) {
                                                    hasCrossClassConflict = true;
                                                    if (!slotStatus.messages.includes('Teacher busy in another class')) {
                                                        slotStatus.messages.push('Teacher busy in another class');
                                                    }
                                                }
                                            }
                                        }

                                        return (
                                            <DroppableSlot
                                                key={slotId}
                                                id={slotId}
                                                day={day}
                                                period={periodIndex}
                                                isBreak={period.isBreak}
                                                breakLabel={period.label}
                                                data={assignment}
                                                hasError={slotStatus.hasError || hasCrossClassConflict}
                                                hasWarning={slotStatus.hasWarning}
                                                conflictMessages={slotStatus.messages}
                                                unavailableTeachers={unavailableTeachers}
                                                onRemove={() => handleRemoveAssignment(slotId)}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeId && activeDragData && (
                    <div
                        className="px-4 py-2 rounded-lg shadow-xl border-2 flex items-center gap-2"
                        style={{
                            backgroundColor: `${activeDragData.color}20`,
                            borderColor: activeDragData.color
                        }}
                    >
                        <div
                            className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-primary-foreground"
                            style={{ backgroundColor: activeDragData.color }}
                        >
                            {activeDragData.subjectShortName?.slice(0, 2)}
                        </div>
                        <div>
                            <div className="text-sm font-medium" style={{ color: activeDragData.color }}>
                                {activeDragData.subjectName}
                            </div>
                            <div className="text-xs text-muted-foreground">{activeDragData.teacherName}</div>
                        </div>
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
});

RealTimetableGrid.displayName = 'RealTimetableGrid';

// Demo-only grid implementation that is fully in-memory and never calls the backend
const DemoTimetableGrid = forwardRef(({ classId, className: classSectionName, onChange, hasUnsavedChanges }, ref) => {
    const { demoTeachers, demoSubjects } = useDemo();

    const [assignments, setAssignments] = useState(new Map());
    const [activeId, setActiveId] = useState(null);
    const [activeDragData, setActiveDragData] = useState(null);

    // Expose getPeriods method to parent (same shape as real grid)
    useImperativeHandle(ref, () => ({
        getPeriods: () => {
            const periods = {};
            const daysFull = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

            assignments.forEach((assignment, slotId) => {
                const [dayShort, periodStr] = slotId.split('-');
                const dayIndex = DAYS_SHORT.indexOf(dayShort);
                if (dayIndex === -1) return;

                const day = daysFull[dayIndex];
                const period = parseInt(periodStr);

                if (!periods[day]) {
                    periods[day] = [];
                }

                periods[day].push({
                    period,
                    subjectId: assignment.subjectId,
                    teacherId: assignment.teacherId,
                });
            });

            return periods;
        },
    }));

    // Build simple teacher-subject pairs from demo data (round-robin assignment)
    const teacherSubjectPairs = useMemo(() => {
        if (!demoTeachers.length || !demoSubjects.length) return [];

        return demoSubjects.map((subject, idx) => {
            const teacher = demoTeachers[idx % demoTeachers.length];

            return {
                id: `${teacher.id}-${subject.id}`,
                teacherId: teacher.id,
                subjectId: subject.id,
                teacherName: teacher.name,
                subjectName: subject.name,
                subjectShortName: subject.code || subject.name.slice(0, 4) || "N/A",
                color: generateTeacherColor(teacher.name),
                periodsRequired: subject.periods_per_week || 4,
            };
        });
    }, [demoTeachers, demoSubjects]);

    // Calculate entries and conflicts using client-side helper only (no backend)
    const entries = useMemo(() => {
        const result = [];
        assignments.forEach((assignment, slotId) => {
            const [day, periodStr] = slotId.split('-');
            result.push({
                slotId,
                day,
                period: parseInt(periodStr),
                teacherId: assignment.teacherId,
                subjectId: assignment.subjectId,
            });
        });
        return result;
    }, [assignments]);

    const conflicts = useMemo(
        () => detectConflicts(entries, classId, demoTeachers, demoSubjects),
        [entries, classId, demoTeachers, demoSubjects]
    );

    const periodsAssigned = useMemo(() => {
        const counts = new Map();
        assignments.forEach((assignment) => {
            const current = counts.get(assignment.subjectId) || 0;
            counts.set(assignment.subjectId, current + 1);
        });
        return counts;
    }, [assignments]);

    const workingDays = DAYS_SHORT.slice(0, 5);
    const periods = DEFAULT_PERIODS;

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
        setActiveDragData(event.active.data.current);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        setActiveId(null);
        setActiveDragData(null);

        if (!over || !active.data.current) return;

        const dragData = active.data.current;
        const slotId = over.id;
        const [day, periodStr] = slotId.split('-');
        const period = parseInt(periodStr);

        if (over.data.current?.isBreak) return;

        const newAssignment = {
            teacherSubjectId: active.id,
            teacherId: dragData.teacherId,
            subjectId: dragData.subjectId,
            teacherName: dragData.teacherName,
            subjectName: dragData.subjectName,
            subjectShortName: dragData.subjectShortName,
            color: dragData.color,
        };

        setAssignments((prev) => {
            const updated = new Map(prev);
            updated.set(slotId, newAssignment);
            return updated;
        });

        if (onChange) {
            onChange();
        }

        toast.success('Period assigned (demo only)', {
            description: `${dragData.subjectName} with ${dragData.teacherName}`,
            icon: <CheckCircle className="w-4 h-4" />,
        });
    };

    const handleRemoveAssignment = (slotId) => {
        setAssignments((prev) => {
            const updated = new Map(prev);
            updated.delete(slotId);
            return updated;
        });

        if (onChange) {
            onChange();
        }
    };

    if (!demoTeachers.length || !demoSubjects.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Demo data not available</h2>
                <p className="text-muted-foreground">Please refresh the page to reset demo mode.</p>
            </div>
        );
    }

    return (
        <DndContext
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-6 h-full">
                {/* Sidebar - Subjects to drag */}
                <div className="w-72 shrink-0 bg-card rounded-2xl border border-border/50 p-4 overflow-y-auto">
                    <div className="mb-4">
                        <h3 className="font-semibold text-foreground">Demo Subjects & Teachers</h3>
                        <p className="text-xs text-muted-foreground mt-1">Drag to assign to timetable (demo only)</p>
                    </div>

                    {teacherSubjectPairs.length === 0 ? (
                        <div className="text-center py-8">
                            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No demo subjects configured.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {teacherSubjectPairs.map((ts) => (
                                <DraggableSubject
                                    key={ts.id}
                                    id={ts.id}
                                    teacherId={ts.teacherId}
                                    subjectId={ts.subjectId}
                                    teacherName={ts.teacherName}
                                    subjectName={ts.subjectName}
                                    subjectShortName={ts.subjectShortName}
                                    color={ts.color}
                                    periodsAssigned={periodsAssigned.get(ts.subjectId) || 0}
                                    periodsRequired={ts.periodsRequired}
                                    unavailableSlots={[]}
                                />
                            ))}
                        </div>
                    )}

                    {/* Conflict Summary (same UI but demo-only counts) */}
                    {conflicts.length > 0 && (
                        <div className="mt-6 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                            <h4 className="text-sm font-medium text-destructive mb-2">
                                {conflicts.filter((c) => c.severity === 'error').length} Conflicts
                            </h4>
                            <div className="space-y-1">
                                {conflicts
                                    .filter((c) => c.severity === 'error')
                                    .slice(0, 3)
                                    .map((conflict, i) => (
                                        <p key={i} className="text-xs text-destructive/80">
                                            {conflict.message}
                                        </p>
                                    ))}
                            </div>
                        </div>
                    )}

                    {hasUnsavedChanges && (
                        <div className="mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20">
                            <p className="text-xs text-warning-foreground">
                                ⚠️ You have unsaved changes (demo only)
                            </p>
                        </div>
                    )}
                </div>

                {/* Main Grid */}
                <div className="flex-1 overflow-auto">
                    <div className="bg-card rounded-2xl border border-border/50 p-4 min-w-[800px]">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">{classSectionName}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {assignments.size} periods assigned • {conflicts.filter((c) => c.severity === 'error').length} conflicts
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="w-3 h-3 rounded-full bg-destructive/50" />
                                    <span>Conflict</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="w-3 h-3 rounded-full bg-warning/50" />
                                    <span>Warning</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2" style={{ gridTemplateColumns: `80px repeat(${workingDays.length}, 1fr)` }}>
                            <div className="h-10" />
                            {workingDays.map((day) => (
                                <div
                                    key={day}
                                    className="h-10 flex items-center justify-center font-semibold text-sm text-foreground bg-muted/50 rounded-lg"
                                >
                                    {day}
                                </div>
                            ))}

                            {periods.map((period, periodIndex) => (
                                <div key={`row-${periodIndex}`} className="contents">
                                    <div
                                        key={`time-${periodIndex}`}
                                        className={cn(
                                            'flex flex-col items-center justify-center text-xs',
                                            period.isBreak ? 'text-muted-foreground' : 'text-foreground'
                                        )}
                                    >
                                        {period.isBreak ? (
                                            <span className="font-medium">{period.label}</span>
                                        ) : (
                                            <>
                                                <span className="font-semibold">P{period.number}</span>
                                                <span className="text-muted-foreground">{period.start}</span>
                                            </>
                                        )}
                                    </div>

                                    {workingDays.map((day) => {
                                        const periodNum = period.number || periodIndex;
                                        const slotId = `${day}-${periodNum}`;
                                        const assignment = assignments.get(slotId);
                                        const slotStatus = getSlotStatus(slotId, conflicts);

                                        return (
                                            <DroppableSlot
                                                key={slotId}
                                                id={slotId}
                                                day={day}
                                                period={periodIndex}
                                                isBreak={period.isBreak}
                                                breakLabel={period.label}
                                                data={assignment}
                                                hasError={slotStatus.hasError}
                                                hasWarning={slotStatus.hasWarning}
                                                conflictMessages={slotStatus.messages}
                                                unavailableTeachers={[]}
                                                onRemove={() => handleRemoveAssignment(slotId)}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <DragOverlay>
                {activeId && activeDragData && (
                    <div
                        className="px-4 py-2 rounded-lg shadow-xl border-2 flex items-center gap-2"
                        style={{
                            backgroundColor: `${activeDragData.color}20`,
                            borderColor: activeDragData.color,
                        }}
                    >
                        <div
                            className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-primary-foreground"
                            style={{ backgroundColor: activeDragData.color }}
                        >
                            {activeDragData.subjectShortName?.slice(0, 2)}
                        </div>
                        <div>
                            <div className="text-sm font-medium" style={{ color: activeDragData.color }}>
                                {activeDragData.subjectName}
                            </div>
                            <div className="text-xs text-muted-foreground">{activeDragData.teacherName}</div>
                        </div>
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
});

DemoTimetableGrid.displayName = 'DemoTimetableGrid';

// Wrapper that selects real or demo grid based on isDemoMode flag
const TimetableGrid = forwardRef(({ isDemoMode = false, ...props }, ref) => {
    if (isDemoMode) {
        return <DemoTimetableGrid ref={ref} {...props} />;
    }
    return <RealTimetableGrid ref={ref} {...props} />;
});

TimetableGrid.displayName = 'TimetableGrid';

export default TimetableGrid;
