import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Play, Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden gradient-hero">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Smart Conflict Prevention Engine</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Create Perfect Timetables
            <span className="block mt-2 text-primary">Without Any Conflicts</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            The intelligent scheduling platform for schools and colleges. 
            Automatically prevents teacher overlaps, manages breaks, and handles 
            multi-class assignments with ease.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Button variant="hero" size="xl" className="w-full sm:w-auto">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="heroOutline" size="xl" className="w-full sm:w-auto">
              <Play className="w-5 h-5" />
              Watch Demo
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>Setup in 5 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Hero Image / Dashboard Preview */}
        <div className="mt-16 lg:mt-20 max-w-5xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/50 bg-card">
            {/* Browser bar */}
            <div className="bg-muted/50 px-4 py-3 border-b border-border/50 flex items-center gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground max-w-xs mx-auto text-center">
                  app.smarttable.io/dashboard
                </div>
              </div>
            </div>
            
            {/* Dashboard Preview */}
            <div className="p-6 bg-gradient-to-b from-background to-muted/30">
              <TimetablePreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const TimetablePreview = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const periods = ['Period 1', 'Period 2', 'Break', 'Period 3', 'Period 4', 'Lunch', 'Period 5', 'Period 6'];
  
const scheduleData = {
    'Mon': [
      { subject: 'Mathematics', teacher: 'Mr. Sharma', color: 'bg-primary/15 border-primary/30 text-primary' },
      { subject: 'Physics', teacher: 'Dr. Patel', color: 'bg-accent/15 border-accent/30 text-accent' },
      { subject: '', teacher: '', color: 'bg-muted' },
      { subject: 'English', teacher: 'Ms. Gupta', color: 'bg-warning/15 border-warning/30 text-warning' },
      { subject: 'Chemistry', teacher: 'Dr. Singh', color: 'bg-success/15 border-success/30 text-success' },
      { subject: '', teacher: '', color: 'bg-muted' },
      { subject: 'Computer Sc.', teacher: 'Mr. Kumar', color: 'bg-primary/15 border-primary/30 text-primary' },
      { subject: 'Biology', teacher: 'Dr. Verma', color: 'bg-accent/15 border-accent/30 text-accent' },
    ],
    'Tue': [
      { subject: 'English', teacher: 'Ms. Gupta', color: 'bg-warning/15 border-warning/30 text-warning' },
      { subject: 'Mathematics', teacher: 'Mr. Sharma', color: 'bg-primary/15 border-primary/30 text-primary' },
      { subject: '', teacher: '', color: 'bg-muted' },
      { subject: 'Physics Lab', teacher: 'Dr. Patel', color: 'bg-accent/15 border-accent/30 text-accent' },
      { subject: 'Physics Lab', teacher: 'Dr. Patel', color: 'bg-accent/15 border-accent/30 text-accent' },
      { subject: '', teacher: '', color: 'bg-muted' },
      { subject: 'History', teacher: 'Ms. Rao', color: 'bg-destructive/15 border-destructive/30 text-destructive' },
      { subject: 'Geography', teacher: 'Mr. Das', color: 'bg-success/15 border-success/30 text-success' },
    ],
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header */}
        <div className="grid grid-cols-6 gap-2 mb-3">
          <div className="p-2 text-xs font-medium text-muted-foreground">Time</div>
          {days.slice(0, 5).map(day => (
            <div key={day} className="p-2 text-xs font-semibold text-foreground text-center bg-muted/50 rounded-lg">
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="space-y-2">
          {periods.map((period, idx) => {
            const isBreak = period === 'Break' || period === 'Lunch';
            return (
              <div key={period} className="grid grid-cols-6 gap-2">
                <div className="p-2 text-xs text-muted-foreground flex items-center">
                  {period}
                </div>
                {days.slice(0, 5).map((day, dayIdx) => {
                  if (isBreak) {
                    return (
                      <div key={`${day}-${idx}`} className="p-2 rounded-lg bg-muted/50 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">{period}</span>
                      </div>
                    );
                  }
                  const data = scheduleData[day]?.[idx];
                  if (!data || !data.subject) {
                    return (
                      <div key={`${day}-${idx}`} className="p-2 rounded-lg bg-muted/30 border border-dashed border-border min-h-[48px]" />
                    );
                  }
                  return (
                    <div 
                      key={`${day}-${idx}`} 
                      className={`p-2 rounded-lg border ${data.color} min-h-[48px] transition-all hover:scale-[1.02] cursor-pointer`}
                    >
                      <div className="text-xs font-medium">{data.subject}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{data.teacher}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;