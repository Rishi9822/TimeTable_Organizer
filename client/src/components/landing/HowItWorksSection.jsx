import { Building2, Settings, Users, Calendar, CheckCircle2 } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Building2,
    title: "Create Your Institution",
    description:
      "Sign up and choose your institution type — School or College. Your data stays completely isolated and secure.",
    color: "from-primary to-primary/70",
  },
  {
    number: "02",
    icon: Settings,
    title: "Configure Your Rules",
    description:
      "Set up periods, breaks, working days, and special rules like lab durations. Do this once, use forever.",
    color: "from-accent to-accent/70",
  },
  {
    number: "03",
    icon: Users,
    title: "Add Teachers & Subjects",
    description:
      "Map teachers to subjects and classes. The system tracks who teaches what and where — globally.",
    color: "from-warning to-warning/60",
  },
  {
    number: "04",
    icon: Calendar,
    title: "Build Your Timetable",
    description:
      "Use the visual drag-and-drop builder. Conflicts are blocked in real-time with helpful suggestions.",
    color: "from-success to-success/70",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 mb-6">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-success">
              Simple Process
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Get Started in
            <span className="text-primary block mt-2">
              Four Simple Steps
            </span>
          </h2>

          <p className="text-lg text-muted-foreground">
            From signup to a complete, conflict-free timetable in minutes.
            No training required.
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute left-8 lg:left-1/2 lg:-translate-x-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-success hidden sm:block" />

          <div className="space-y-8 lg:space-y-12">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`relative flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-12 animate-fade-in-up ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Icon */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
                  >
                    <step.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center text-xs font-bold text-foreground">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <div
                  className={`flex-1 lg:max-w-md ${
                    index % 2 === 1 ? "lg:text-right" : ""
                  }`}
                >
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
