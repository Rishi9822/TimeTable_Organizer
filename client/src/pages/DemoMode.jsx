import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemo } from "@/contexts/DemoContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, AlertTriangle, RefreshCw, ArrowLeft, Play } from "lucide-react";
import TimetableBuilder from "@/pages/TimetableBuilder";

const DemoMode = () => {
  const navigate = useNavigate();
  const { demoClasses, demoTeachers, demoSubjects, resetDemo, maxDemoClasses, createDemoClass } = useDemo();
  const [showBuilder, setShowBuilder] = useState(demoClasses.length > 0);

  const handleStartDemo = () => {
    // Create 2 demo classes to start with
    if (demoClasses.length === 0) {
      createDemoClass({ name: "Class 10-A", grade: "10", section: "A", institution_type: "school" });
      createDemoClass({ name: "Class 10-B", grade: "10", section: "B", institution_type: "school" });
    }
    setShowBuilder(true);
  };

  if (showBuilder && demoClasses.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        {/* Demo Banner */}
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-900/20 m-4 mb-0">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Demo Mode:</strong> This is a demonstration. Your data will not be saved and will reset when you refresh the page.
            <Button
              variant="link"
              className="ml-2 h-auto p-0 text-blue-800 dark:text-blue-200"
              onClick={() => {
                resetDemo();
                setShowBuilder(false);
              }}
            >
              Reset Demo
            </Button>
          </AlertDescription>
        </Alert>

        {/* Render TimetableBuilder in demo mode */}
        <div className="p-4">
          <TimetableBuilder isDemoMode={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-2xl shadow-card">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Try Demo Mode</span>
          </div>
          <CardTitle className="text-2xl">Explore TimetablePro</CardTitle>
          <CardDescription>
            Try the timetable builder without creating an account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Demo Mode Features:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Create up to {maxDemoClasses} demo classes</li>
                <li>Use pre-loaded teachers and subjects</li>
                <li>Build timetables with drag & drop</li>
                <li>See conflict detection in action</li>
                <li>No data will be saved</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Available Demo Data:</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Teachers ({demoTeachers.length})</p>
                  <ul className="text-sm space-y-1">
                    {demoTeachers.slice(0, 3).map((teacher) => (
                      <li key={teacher.id}>• {teacher.name}</li>
                    ))}
                    {demoTeachers.length > 3 && <li className="text-muted-foreground">+ {demoTeachers.length - 3} more</li>}
                  </ul>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Subjects ({demoSubjects.length})</p>
                  <ul className="text-sm space-y-1">
                    {demoSubjects.slice(0, 3).map((subject) => (
                      <li key={subject.id}>• {subject.name}</li>
                    ))}
                    {demoSubjects.length > 3 && <li className="text-muted-foreground">+ {demoSubjects.length - 3} more</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleStartDemo}
              className="w-full"
              size="lg"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Demo
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoMode;









