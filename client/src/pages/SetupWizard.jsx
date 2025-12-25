import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  School,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  Clock,
  Calendar,
  Coffee,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInstitutionContext } from "@/contexts/InstitutionContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const SetupWizard = () => {
  const navigate = useNavigate();
  const { config, updateConfig, completeSetup } =
    useInstitutionContext();

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      await completeSetup();
      toast.success("Institution setup complete!", {
        description: "You can now start creating timetables.",
        icon: <CheckCircle className="w-4 h-4" />,
      });
      navigate("/builder");
    } catch {
      toast.error("Failed to save settings", {
        description: "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectType = (type) => {
    updateConfig({ institutionType: type });

    if (type === "school") {
      updateConfig({
        periodsPerDay: 8,
        periodDuration: 45,
        breaks: [
          { afterPeriod: 3, duration: 15, label: "Short Break" },
          { afterPeriod: 5, duration: 45, label: "Lunch Break" },
        ],
      });
    } else if (type === "college") {
      updateConfig({
        periodsPerDay: 6,
        periodDuration: 60,
        labDuration: 120,
        breaks: [
          { afterPeriod: 2, duration: 15, label: "Short Break" },
          { afterPeriod: 4, duration: 60, label: "Lunch Break" },
        ],
      });
    }
  };

  const toggleDay = (day) => {
    const currentDays = config.workingDays;
    updateConfig({
      workingDays: currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day],
    });
  };

  const updateBreak = (index, field, value) => {
    const newBreaks = [...config.breaks];
    newBreaks[index] = { ...newBreaks[index], [field]: value };
    updateConfig({ breaks: newBreaks });
  };

  const addBreak = () => {
    updateConfig({
      breaks: [
        ...config.breaks,
        {
          afterPeriod: config.periodsPerDay,
          duration: 15,
          label: "Break",
        },
      ],
    });
  };

  const removeBreak = (index) => {
    updateConfig({
      breaks: config.breaks.filter((_, i) => i !== index),
    });
  };

  return (
    /* JSX UNCHANGED — omitted here for brevity */
    /* YOUR UI REMAINS EXACTLY THE SAME */
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all',
                  s === step && 'gradient-primary text-primary-foreground shadow-glow',
                  s < step && 'bg-success text-success-foreground',
                  s > step && 'bg-muted text-muted-foreground'
                )}>
                  {s < step ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div className={cn(
                    'w-16 sm:w-24 h-1 mx-2 rounded-full transition-all',
                    s < step ? 'bg-success' : 'bg-muted'
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-2">
            <span>Type</span>
            <span>Schedule</span>
            <span>Breaks</span>
            <span>Review</span>
          </div>
        </div>

        {/* Card container */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-xl p-6 sm:p-8">
          {/* Step 1: Institution Type */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Select Institution Type</h2>
                <p className="text-muted-foreground">Choose the type that best describes your institution</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  onClick={() => handleSelectType('school')}
                  className={cn(
                    'p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg group',
                    config.institutionType === 'school'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all',
                    config.institutionType === 'school' ? 'gradient-primary' : 'bg-muted group-hover:bg-primary/10'
                  )}>
                    <School className={cn(
                      'w-7 h-7',
                      config.institutionType === 'school' ? 'text-primary-foreground' : 'text-foreground'
                    )} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">🏫 School</h3>
                  <p className="text-sm text-muted-foreground">
                    Fixed periods, class divisions, K-12 structure
                  </p>
                </button>

                <button
                  onClick={() => handleSelectType('college')}
                  className={cn(
                    'p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg group',
                    config.institutionType === 'college'
                      ? 'border-accent bg-accent/5 shadow-md'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  <div className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all',
                    config.institutionType === 'college' ? 'gradient-accent' : 'bg-muted group-hover:bg-accent/10'
                  )}>
                    <GraduationCap className={cn(
                      'w-7 h-7',
                      config.institutionType === 'college' ? 'text-accent-foreground' : 'text-foreground'
                    )} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">🎓 College</h3>
                  <p className="text-sm text-muted-foreground">
                    Flexible lectures, lab sessions, semester structure
                  </p>
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="name">Institution Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your institution name"
                    value={config.institutionName}
                    onChange={(e) => updateConfig({ institutionName: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Schedule Configuration */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Configure Schedule</h2>
                <p className="text-muted-foreground">Set up your periods and working days</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="startTime" className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Start Time
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={config.startTime}
                      onChange={(e) => updateConfig({ startTime: e.target.value })}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="periods">
                      {config.institutionType === 'college' ? 'Lectures' : 'Periods'} per Day
                    </Label>
                    <Input
                      id="periods"
                      type="number"
                      min={4}
                      max={12}
                      value={config.periodsPerDay}
                      onChange={(e) => updateConfig({ periodsPerDay: parseInt(e.target.value) || 8 })}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="duration">
                      {config.institutionType === 'college' ? 'Lecture' : 'Period'} Duration (minutes)
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      min={30}
                      max={90}
                      value={config.periodDuration}
                      onChange={(e) => updateConfig({ periodDuration: parseInt(e.target.value) || 45 })}
                      className="mt-2"
                    />
                  </div>

                  {config.institutionType === 'college' && (
                    <div>
                      <Label htmlFor="labDuration">Lab Duration (minutes)</Label>
                      <Input
                        id="labDuration"
                        type="number"
                        min={60}
                        max={180}
                        value={config.labDuration}
                        onChange={(e) => updateConfig({ labDuration: parseInt(e.target.value) || 120 })}
                        className="mt-2"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Working Days
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={cn(
                          'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                          config.workingDays.includes(day)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                        )}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Break Configuration */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Configure Breaks</h2>
                <p className="text-muted-foreground">Set up breaks between periods</p>
              </div>

              <div className="space-y-4">
                {config.breaks.map((breakConfig, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                      <Coffee className="w-5 h-5 text-warning" />
                    </div>
                    
                    <div className="flex-1 grid sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={breakConfig.label}
                          onChange={(e) => updateBreak(index, 'label', e.target.value)}
                          placeholder="Break name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">After Period</Label>
                        <Input
                          type="number"
                          min={1}
                          max={config.periodsPerDay}
                          value={breakConfig.afterPeriod}
                          onChange={(e) => updateBreak(index, 'afterPeriod', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Duration (min)</Label>
                        <Input
                          type="number"
                          min={5}
                          max={60}
                          value={breakConfig.duration}
                          onChange={(e) => updateBreak(index, 'duration', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBreak(index)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Remove
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={addBreak}
                  className="w-full border-dashed"
                >
                  + Add Break
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Ready to Go!</h2>
                <p className="text-muted-foreground">Review your configuration and start scheduling</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <h4 className="font-semibold text-foreground mb-3">Institution Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Name:</div>
                    <div className="text-foreground">{config.institutionName || 'Not set'}</div>
                    <div className="text-muted-foreground">Type:</div>
                    <div className="text-foreground capitalize">{config.institutionType}</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <h4 className="font-semibold text-foreground mb-3">Schedule</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Start Time:</div>
                    <div className="text-foreground">{config.startTime}</div>
                    <div className="text-muted-foreground">Periods:</div>
                    <div className="text-foreground">{config.periodsPerDay} × {config.periodDuration} min</div>
                    <div className="text-muted-foreground">Working Days:</div>
                    <div className="text-foreground">{config.workingDays.length} days</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <h4 className="font-semibold text-foreground mb-3">Breaks</h4>
                  <div className="space-y-1 text-sm">
                    {config.breaks.map((b, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-muted-foreground">{b.label}:</span>
                        <span className="text-foreground">After P{b.afterPeriod}, {b.duration} min</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            {step < totalSteps ? (
              <Button
                variant="hero"
                onClick={handleNext}
                disabled={step === 1 && !config.institutionType}
                className="gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="hero"
                onClick={handleComplete}
                disabled={isSaving}
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
