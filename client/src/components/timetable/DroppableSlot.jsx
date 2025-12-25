import { useDroppable } from '@dnd-kit/core';
import { X, AlertTriangle, AlertCircle, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


const DroppableSlot = ({
  id,
  day,
  period,
  isBreak,
  breakLabel,
  data,
  hasError,
  hasWarning,
  conflictMessages = [],
  unavailableTeachers = [],
  onRemove,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { day, period },
    disabled: isBreak,
  });

  if (isBreak) {
    return (
      <div className="h-14 bg-muted/50 rounded-lg flex items-center justify-center border border-dashed border-border">
        <span className="text-xs text-muted-foreground font-medium">{breakLabel || 'Break'}</span>
      </div>
    );
  }

  const hasData = data?.teacherSubjectId;
  const showConflict = hasError || hasWarning;
  const hasUnavailable = unavailableTeachers.length > 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative h-14 rounded-lg border-2 transition-all duration-200 group',
        !hasData && 'border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5',
        hasData && 'border-transparent',
        isOver && !hasData && 'border-primary bg-primary/10 scale-[1.02]',
        hasError && 'ring-2 ring-destructive/50 ring-offset-1',
        hasWarning && !hasError && 'ring-2 ring-warning/50 ring-offset-1'
      )}
    >
      {hasData ? (
        <div 
          className="h-full rounded-lg p-2 flex items-center gap-2 relative overflow-hidden"
          style={{ backgroundColor: `${data.color}15`, borderColor: `${data.color}40` }}
        >
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
            style={{ backgroundColor: data.color }}
          />
          <div className="flex-1 min-w-0 pl-2">
            <div 
              className="text-xs font-semibold truncate"
              style={{ color: data.color }}
            >
              {data.subjectShortName}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {data.teacherName}
            </div>
          </div>
          
          {showConflict && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  'shrink-0',
                  hasError ? 'text-destructive' : 'text-warning'
                )}>
                  {hasError ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  {conflictMessages.map((msg, i) => (
                    <p key={i} className="text-xs">{msg}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className="shrink-0 w-5 h-5 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center relative">
          {hasUnavailable && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute top-1 right-1">
                  <UserX className="w-3 h-3 text-muted-foreground/50" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs font-medium mb-1">Teachers busy at this time:</p>
                <ul className="text-xs space-y-0.5">
                  {unavailableTeachers.slice(0, 5).map((t, i) => (
                    <li key={i}>• {t.teacherName} → {t.className}</li>
                  ))}
                  {unavailableTeachers.length > 5 && (
                    <li>...and {unavailableTeachers.length - 5} more</li>
                  )}
                </ul>
              </TooltipContent>
            </Tooltip>
          )}
          <span className="text-xs text-muted-foreground/50">
            {isOver ? 'Drop here' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

export default DroppableSlot;