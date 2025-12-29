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
import { useClasses } from '@/hooks/useTeachers';
import { useAuth } from '@/contexts/AuthContext';
import { useTimetableContext } from '@/contexts/TimetableContext';
import { toast } from 'sonner';

const TimetableBuilder = () => {
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
      toast.success('Timetable saved successfully!', {
        description: `Changes for ${selectedClassName} have been saved.`,
        icon: <CheckCircle className="w-4 h-4" />,
      });
    } catch (error) {
      toast.error('Failed to save timetable', {
        description: error.response?.data?.message || 'Please try again.',
        icon: <AlertCircle className="w-4 h-4" />,
      });
    }
  };

  const handleTimetableChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleExport = () => {
    toast.info('Export feature coming soon!', {
      description: 'PDF and Excel exports will be available in the next update.',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left section */}
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">Timetable Builder</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Drag and drop to create schedules</p>
              </div>
            </div>

            {/* Center - Class Selector */}
            <div className="hidden md:block">
              <ClassSelector 
                selectedClassId={selectedClassId}
                onSelectClass={handleSelectClass}
              />
            </div>

            {/* Right section */}
            <div className="flex items-center gap-2">
              {hasRole(['admin', 'scheduler']) && (
                <Link to="/teachers">
                  <Button variant="ghost" size="icon" title="Manage Teachers">
                    <Users className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Redo2 className="w-4 h-4" />
              </Button>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <Link to="/setup">
                <Button variant="ghost" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex gap-2">
                <Download className="w-4 h-4" />
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
              <UserMenu />
            </div>
          </div>

          {/* Mobile class selector */}
          <div className="md:hidden pb-3">
            <ClassSelector 
              selectedClassId={selectedClassId}
              onSelectClass={handleSelectClass}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
      </main>

      {/* Quick help tooltip */}
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
    </div>
  );
};

export default TimetableBuilder;