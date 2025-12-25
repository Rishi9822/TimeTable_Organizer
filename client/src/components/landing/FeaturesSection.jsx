import { 
  Shield, 
  Users, 
  Zap, 
  Building2, 
  GraduationCap, 
  Calendar,
  AlertTriangle,
  Puzzle,
  BarChart3
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Smart Conflict Prevention",
    description: "Automatically detects and prevents teacher overlaps, break violations, and scheduling conflicts in real-time.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Users,
    title: "Multi-Class Teacher Support",
    description: "Teachers can be assigned to multiple classes and sections. The system ensures they're never double-booked.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Zap,
    title: "Visual Drag & Drop Builder",
    description: "Intuitive grid-based interface with real-time validation. Drag, drop, and see conflicts highlighted instantly.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: Building2,
    title: "School Mode",
    description: "Configure periods, breaks, class divisions, and working days. Perfect for K-12 institutions.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: GraduationCap,
    title: "College Mode",
    description: "Support for lectures, labs (2-3 hour blocks), semesters, branches, and parallel divisions.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Calendar,
    title: "Flexible Scheduling Rules",
    description: "Define your institution's unique rules once. The system adapts all scheduling logic automatically.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: AlertTriangle,
    title: "Real-time Validation",
    description: "Every action is validated instantly. Invalid moves are blocked with clear explanations.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    icon: Puzzle,
    title: "Multi-Tenant SaaS Ready",
    description: "Complete data isolation per institution. Perfect for managing multiple schools or selling as a service.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: BarChart3,
    title: "Smart Suggestions",
    description: "Get AI-powered slot suggestions when conflicts occur. The system helps you find the best alternatives.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Powerful Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Everything You Need for
            <span className="text-primary block mt-2">Conflict-Free Scheduling</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Built from the ground up to handle the complexity of real-world academic scheduling. 
            No more spreadsheets, no more manual checks.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 lg:p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;