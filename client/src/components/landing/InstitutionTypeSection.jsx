import { School, GraduationCap, ArrowRight } from "lucide-react";

const InstitutionTypeSection = () => {
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Built for Both
            <span className="text-primary block mt-2">Schools & Colleges</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Different scheduling needs, one intelligent solution. Choose your institution type
            and the system adapts all rules and constraints automatically.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* School Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-primary/40 transition-all duration-500 hover:shadow-xl hover:shadow-primary/10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative p-8 lg:p-10">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <School className="w-8 h-8 text-primary-foreground" />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-4">🏫 School Mode</h3>

              <ul className="space-y-3 mb-8 text-muted-foreground">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Fixed periods per day</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Configurable breaks</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Class divisions (A, B, C...)</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Grade-wise structure (1-12)</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Teacher load balancing</li>
              </ul>

              <button className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                Learn more <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* College Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-accent/40 transition-all duration-500 hover:shadow-xl hover:shadow-accent/10">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative p-8 lg:p-10">
              <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <GraduationCap className="w-8 h-8 text-accent-foreground" />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-4">🎓 College Mode</h3>

              <ul className="space-y-3 mb-8 text-muted-foreground">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" />Flexible lecture durations</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" />Lab sessions (2-3 hours)</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" />Semester & branch structure</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" />Parallel divisions</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" />Room allocation support</li>
              </ul>

              <button className="flex items-center gap-2 text-accent font-medium group-hover:gap-3 transition-all">
                Learn more <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InstitutionTypeSection;
