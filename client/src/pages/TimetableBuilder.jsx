import { useState, useEffect } from 'react';
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
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import ClassSelector from '@/components/timetable/ClassSelector';
import { UserMenu } from '@/components/auth/UserMenu';
import { useClasses } from '@/hooks/useTeachers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TimetableBuilder = () => {
  const { hasRole } = useAuth();
  const { data: classes = [] } = useClasses();
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-select first class when data loads
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      const firstClass = classes[0];
      setSelectedClassId(firstClass.id);
      setSelectedClassName(firstClass.section ? `${firstClass.name} - ${firstClass.section}` : firstClass.name);
    }
  }, [classes, selectedClassId]);

const handleSelectClass = (classId, className) => {
    setSelectedClassId(classId);
    setSelectedClassName(className);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success('Timetable saved successfully!', {
      description: `Changes for ${selectedClassName} have been saved.`,
      icon: <CheckCircle className="w-4 h-4" />,
    });
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
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
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
        {selectedClassId ? (
          <TimetableGrid 
            classId={selectedClassId}
            className={selectedClassName}
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
    </div>
  );
};

export default TimetableBuilder;