import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Download,
  Undo2,
  Redo2,
  Settings,
  CheckCircle,
  AlertCircle,
  Users,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import ClassSelector from '@/components/timetable/ClassSelector';
import { UserMenu } from '@/components/auth/UserMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useClasses } from '@/hooks/useTeachers';
import { useAuth } from '@/contexts/AuthContext';
import { useTimetableContext } from '@/contexts/TimetableContext';
import { useDemo } from '@/contexts/DemoContext';
import { useToast } from '@/hooks/useToast';
import { DashboardLayout } from '@/components/DashboardLayout';

const RealTimetableBuilder = () => {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const { data: classes = [] } = useClasses();
  const { loadTimetable, loadAllTimetables, saveTimetable, isLoading, isSaving } = useTimetableContext();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingClassSwitch, setPendingClassSwitch] = useState(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const timetableRef = useRef(null); // Reference to get current periods from TimetableGrid

  // Load all timetables on mount for conflict detection
  useEffect(() => {
    loadAllTimetables();
  }, [loadAllTimetables]);

  // Auto-select first class when data loads
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      const firstClass = classes[0];
      handleSelectClass(firstClass.id, firstClass.section ? `${firstClass.name} - ${firstClass.section}` : firstClass.name, true);
    }
  }, [classes, selectedClassId]);

  // Load timetable when class changes
  useEffect(() => {
    if (selectedClassId) {
      loadTimetable(selectedClassId);
      setHasUnsavedChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]); // Only depend on selectedClassId, loadTimetable is stable

  const handleSelectClass = async (classId, className, skipCheck = false) => {
    // Check for unsaved changes
    if (!skipCheck && hasUnsavedChanges) {
      setPendingClassSwitch({ classId, className });
      setShowUnsavedDialog(true);
      return;
    }

    setSelectedClassId(classId);
    setSelectedClassName(className);
    setHasUnsavedChanges(false);
  };

  const handleConfirmSwitch = () => {
    if (pendingClassSwitch) {
      setSelectedClassId(pendingClassSwitch.classId);
      setSelectedClassName(pendingClassSwitch.className);
      setHasUnsavedChanges(false);
      setPendingClassSwitch(null);
    }
    setShowUnsavedDialog(false);
  };

  const handleCancelSwitch = () => {
    setPendingClassSwitch(null);
    setShowUnsavedDialog(false);
  };

  const handleSave = async (periods) => {
    if (!selectedClassId) return;

    try {
      await saveTimetable(selectedClassId, periods || timetableRef.current?.getPeriods?.());
      setHasUnsavedChanges(false);
      toast({
        title: 'Timetable saved successfully!',
        description: `Changes for ${selectedClassName} have been saved.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to save timetable',
        description: error.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleTimetableChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleExport = () => {
    toast({
      title: 'Export feature coming soon!',
      description: 'PDF and Excel exports will be available in the next update.',
    });
  };

  return (
    <DashboardLayout
      title="Timetable Builder"
      subtitle="Drag and drop to create schedules"
      headerActions={
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1 bg-muted rounded-md p-0.5 mr-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => timetableRef.current?.undo()}
              disabled={!timetableRef.current?.canUndo}
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => timetableRef.current?.redo()}
              disabled={!timetableRef.current?.canRedo}
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="hidden md:block">
            <ClassSelector
              selectedClassId={selectedClassId}
              onSelectClass={handleSelectClass}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2 hidden sm:flex"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>

          <Button
            variant="hero"
            size="sm"
            onClick={() => handleSave()}
            disabled={isSaving(selectedClassId) || !hasUnsavedChanges}
            className="gap-2"
          >
            {isSaving(selectedClassId) ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="md:hidden mb-4">
        <ClassSelector
          selectedClassId={selectedClassId}
          onSelectClass={handleSelectClass}
        />
      </div>
      {isLoading(selectedClassId) ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading timetable...</p>
        </div>
      ) : selectedClassId ? (
        <TimetableGrid
          ref={timetableRef}
          classId={selectedClassId}
          className={selectedClassName}
          onSave={handleSave}
          onChange={handleTimetableChange}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Classes Available</h2>
          <p className="text-muted-foreground mb-4">Add a class to start building your timetable</p>
          <Link to="/teachers">
            <Button className="gap-2">
              <Users className="w-4 h-4" />
              Go to Teacher Management
            </Button>
          </Link>
        </div>
      )}
      {selectedClassId && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-card border border-border/50 rounded-xl p-4 shadow-lg max-w-xs animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">Quick Tips</h4>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                  <li>• Drag subjects from the sidebar</li>
                  <li>• Drop on any empty period slot</li>
                  <li>• Red = conflict, Yellow = warning</li>
                  <li>• Click X to remove an assignment</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to the timetable for {selectedClassName}.
              Do you want to save before switching classes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSwitch}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwitch}>
              Switch Without Saving
            </AlertDialogAction>
            <AlertDialogAction
              onClick={async () => {
                await handleSave();
                handleConfirmSwitch();
              }}
              className="bg-primary text-primary-foreground"
            >
              Save & Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

// Demo variant: uses DemoContext classes and fully in-memory TimetableGrid (no backend writes)
const DemoTimetableBuilder = () => {
  const { toast } = useToast();
  const { demoClasses, maxDemoClasses } = useDemo();
  const [selectedClassId, setSelectedClassId] = useState(
    demoClasses[0]?.id || ''
  );
  const [selectedClassName, setSelectedClassName] = useState(
    demoClasses[0]?.name || ''
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingClassSwitch, setPendingClassSwitch] = useState(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const timetableRef = useRef(null);

  useEffect(() => {
    if (demoClasses.length > 0 && !selectedClassId) {
      const first = demoClasses[0];
      setSelectedClassId(first.id);
      setSelectedClassName(first.name);
    }
  }, [demoClasses, selectedClassId]);

  const handleSelectClass = (classId, className, skipCheck = false) => {
    if (!skipCheck && hasUnsavedChanges) {
      setPendingClassSwitch({ classId, className });
      setShowUnsavedDialog(true);
      return;
    }
    setSelectedClassId(classId);
    setSelectedClassName(className);
    setHasUnsavedChanges(false);
  };

  const handleConfirmSwitch = () => {
    if (pendingClassSwitch) {
      setSelectedClassId(pendingClassSwitch.classId);
      setSelectedClassName(pendingClassSwitch.className);
      setHasUnsavedChanges(false);
      setPendingClassSwitch(null);
    }
    setShowUnsavedDialog(false);
  };

  const handleCancelSwitch = () => {
    setPendingClassSwitch(null);
    setShowUnsavedDialog(false);
  };

  const handleTimetableChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleSaveDemo = async () => {
    // No backend writes in demo; just clear unsaved flag
    setHasUnsavedChanges(false);
    toast({
      title: 'Session saved',
      description: 'Changes are kept only for this session in demo mode.',
    });
  };

  const selectedClass = demoClasses.find((c) => c.id === selectedClassId);

  return (
    <DashboardLayout
      title="Timetable Builder (Demo)"
      subtitle="Drag and drop to explore the experience. Changes are not saved."
      headerActions={
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1 bg-muted rounded-md p-0.5 mr-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => timetableRef.current?.undo()}
              disabled={!timetableRef.current?.canUndo}
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => timetableRef.current?.redo()}
              disabled={!timetableRef.current?.canRedo}
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDemo}
            className="hidden sm:flex gap-2"
          >
            <Download className="w-4 h-4" />
            Export (demo)
          </Button>

          <Button
            variant="hero"
            size="sm"
            onClick={handleSaveDemo}
            disabled={!hasUnsavedChanges}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save (Session)
          </Button>
        </div>
      }
    >
      {selectedClassId ? (
        <TimetableGrid
          ref={timetableRef}
          isDemoMode={true}
          classId={selectedClassId}
          className={selectedClass?.name || selectedClassId}
          onSave={handleSaveDemo}
          onChange={handleTimetableChange}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No demo classes available</h2>
          <p className="text-muted-foreground">
            Use the demo start screen to create sample classes.
          </p>
        </div>
      )}

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to the timetable for {selectedClassName}.
              Do you want to discard them and switch classes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSwitch}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwitch}>
              Switch Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

const TimetableBuilder = ({ isDemoMode = false }) => {
  if (isDemoMode) {
    return <DemoTimetableBuilder />;
  }
  return <RealTimetableBuilder />;
};

export default TimetableBuilder;
