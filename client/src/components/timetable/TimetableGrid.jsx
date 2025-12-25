import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { useState, useMemo, useEffect } from 'react';
import DroppableSlot from './DroppableSlot';
import DraggableSubject from './DraggableSubjects';
import { DAYS_SHORT, DEFAULT_PERIODS } from '@/lib/timetable-types';
import { detectConflicts, getSlotStatus } from '@/lib/conflict-detection';
import { useTimetableContext } from '@/contexts/TimetableContext';
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

const TimetableGrid = ({ classId, className: classSectionName }) => {
    const [assignments, setAssignments] = useState(new Map());
    const [activeId, setActiveId] = useState(null);
    const [activeDragData, setActiveDragData] = useState(null);


    // Fetch data from database
    const { data: teacherClassAssignments = [], isLoading: isLoadingAssignments } =
        useTeacherClassAssignments();

    const { data: allTeachers = [] } = useTeachers();
    const { data: allSubjects = [] } = useSubjects();

    const {
        addAssignment: addGlobalAssignment,
        removeAssignment: removeGlobalAssignment,
        getTeacherConflict,
        globalAssignments
    } = useTimetableContext();

    // Helper functions to get teacher/subject by id
    const getTeacherById = (teacherId) => allTeachers.find(t => t.id === teacherId);
    const getSubjectById = (subjectId) => allSubjects.find(s => s.id === subjectId);

    // Sync local assignments with global context
    useEffect(() => {
        assignments.forEach((assignment, slotId) => {
            const [day, periodStr] = slotId.split('-');
            addGlobalAssignment(classId, {
                className: classSectionName,
                day,
                period: parseInt(periodStr),
                teacherId: assignment.teacherId,
                subjectId: assignment.subjectId,
            });
        });
    }, []);

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

            globalAssignments.forEach((classAssignmentsArr, otherClassId) => {
                if (otherClassId === classId) return;

                classAssignmentsArr.forEach(assignment => {
                    if (assignment.teacherId === teacher.id) {
                        slots.push({
                            day: assignment.day,
                            period: assignment.period,
                            className: assignment.className,
                        });
                    }
                });
            });

            if (slots.length > 0) {
                result.set(teacher.id, slots);
            }
        });

        return result;
    }, [globalAssignments, classId, allTeachers]);

    // Get unavailable teachers for each slot
    const getUnavailableTeachersForSlot = (day, period) => {
        const unavailable = [];

        allTeachers.forEach(teacher => {
            const conflict = getTeacherConflict(teacher.id, day, period, classId);
            if (conflict) {
                unavailable.push({
                    teacherId: teacher.id,
                    teacherName: teacher.name,
                    className: conflict.className,
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

        // Check for cross-class conflict
        const existingConflict = getTeacherConflict(dragData.teacherId, day, period, classId);
        if (existingConflict) {
            toast.error('Teacher conflict detected!', {
                description: `${dragData.teacherName} is already teaching in ${existingConflict.className} at this time.`,
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

        // Update global state
        addGlobalAssignment(classId, {
            className: classSectionName,
            day,
            period,
            teacherId: dragData.teacherId,
            subjectId: dragData.subjectId,
        });

        toast.success('Period assigned!', {
            description: `${dragData.subjectName} with ${dragData.teacherName}`,
            icon: <CheckCircle className="w-4 h-4" />,
        });
    };

    const handleRemoveAssignment = (slotId) => {
        const [day, periodStr] = slotId.split('-');

        setAssignments(prev => {
            const updated = new Map(prev);
            updated.delete(slotId);
            return updated;
        });

        removeGlobalAssignment(classId, day, parseInt(periodStr));
    };

    // Filter working days (Mon-Fri for now)
    const workingDays = DAYS_SHORT.slice(0, 5);

    // Get periods with proper numbering
    const periods = DEFAULT_PERIODS;

    // Count cross-class conflicts
    const crossClassConflicts = useMemo(() => {
        let count = 0;
        assignments.forEach((assignment, slotId) => {
            const [day, periodStr] = slotId.split('-');
            const conflict = getTeacherConflict(assignment.teacherId, day, parseInt(periodStr), classId);
            if (conflict) count++;
        });
        return count;
    }, [assignments, getTeacherConflict, classId]);

    // Build teacher-subject pairs for the sidebar from database
    const teacherSubjectPairs = useMemo(() => {
        return classTeacherAssignments.map((assignment) => {
            const teacher = getTeacherById(assignment.teacher_id);
            const subject = getSubjectById(assignment.subject_id);

            return {
                id: assignment.id,
                teacherId: assignment.teacher_id,
                subjectId: assignment.subject_id,
                teacherName: teacher?.name || "Unknown Teacher",
                subjectName: subject?.name || "Unknown Subject",
                subjectShortName:
                    subject?.code || subject?.name?.slice(0, 4) || "N/A",
                color: subject?.color || generateTeacherColor(teacher?.name || ""),
                periodsRequired: subject?.periods_per_week || 4,
            };
        });
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

                    {/* Global assignment count */}
                    <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border/50">
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Global Status</h4>
                        <p className="text-sm text-foreground">
                            {Array.from(globalAssignments.values()).reduce((acc, arr) => acc + arr.length, 0)} total assignments across {globalAssignments.size} classes
                        </p>
                    </div>
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
                                        const slotId = `${day}-${periodIndex}`;
                                        const assignment = assignments.get(slotId);
                                        const slotStatus = getSlotStatus(slotId, conflicts);
                                        const unavailableTeachers = getUnavailableTeachersForSlot(day, periodIndex);

                                        // Check for cross-class conflict on this slot
                                        let hasCrossClassConflict = false;
                                        if (assignment) {
                                            const crossConflict = getTeacherConflict(assignment.teacherId, day, periodIndex, classId);
                                            if (crossConflict) {
                                                hasCrossClassConflict = true;
                                                if (!slotStatus.messages.includes(`Teacher busy in ${crossConflict.className}`)) {
                                                    slotStatus.messages.push(`Teacher busy in ${crossConflict.className}`);
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
};

export default TimetableGrid;