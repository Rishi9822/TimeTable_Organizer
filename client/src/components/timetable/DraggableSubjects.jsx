import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const DraggableSubject = ({
  id,
  teacherId,
  subjectId,
  teacherName,
  subjectName,
  subjectShortName,
  color,
  periodsAssigned,
  periodsRequired,
  unavailableSlots = [],
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data: {
        type: 'teacher-subject',
        teacherId,
        subjectId,
        teacherName,
        subjectName,
        subjectShortName,
        color,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    '--subject-color': color,
  };

  const isComplete = periodsAssigned >= periodsRequired;
  const hasConflicts = unavailableSlots.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'group flex items-center gap-3 p-3 rounded-xl border-2 cursor-grab active:cursor-grabbing transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        isDragging && 'opacity-50 shadow-lg scale-105 z-50',
        isComplete
          ? 'bg-success/10 border-success/30'
          : 'bg-card border-border/50 hover:border-primary/30'
      )}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0 relative"
        style={{ backgroundColor: color }}
      >
        {subjectShortName.slice(0, 2)}
        {hasConflicts && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full flex items-center justify-center">
            <span className="text-[10px] font-bold text-warning-foreground">
              {unavailableSlots.length}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground text-sm truncate">
          {subjectName}
        </div>
        <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
          {teacherName}
          {hasConflicts && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="w-3 h-3 text-warning inline" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs font-medium mb-1">
                  Busy in other classes:
                </p>
                <ul className="text-xs space-y-0.5">
                  {unavailableSlots.slice(0, 5).map((slot, i) => (
                    <li key={i}>
                      • {slot.day} P{slot.period + 1}: {slot.className}
                    </li>
                  ))}
                  {unavailableSlots.length > 5 && (
                    <li>
                      ...and {unavailableSlots.length - 5} more
                    </li>
                  )}
                </ul>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            isComplete
              ? 'bg-success/20 text-success'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {periodsAssigned}/{periodsRequired}
        </div>
        <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      </div>
    </div>
  );
};

export default DraggableSubject;
