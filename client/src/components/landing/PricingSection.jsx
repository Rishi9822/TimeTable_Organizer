import { Button } from "@/components/ui/button";
import { Check, Sparkles, Building, Crown } from "lucide-react";
import { Link } from "react-router-dom";

// Pricing is purely illustrative; backend remains source of truth for plans.
// Plans here mirror the SaaS rules: Demo, Trial, Standard, Flex.
const plans = [
  {
    name: "Demo",
    badge: "No signup",
    description: "Try the timetable builder instantly with sample data.",
    price: "Free",
    period: "in-browser",
    icon: Sparkles,
    features: [
      "No signup required",
      "In-memory only (no database writes)",
      "Up to 2 demo classes",
      "Hardcoded demo teachers & subjects",
      "Drag & drop builder with conflicts",
    ],
    cta: "Try Demo",
    to: "/demo",
    variant: "heroOutline",
    popular: false,
  },
  {
    name: "Trial",
    badge: "After signup",
    description: "Evaluate TimetablePro with your own institution.",
    price: "Free",
    period: "7–14 days",
    icon: Building,
    features: [
      "Limited classes & teachers",
      "No exports",
      "Institution setup wizard",
      "Institution type locked (School OR College)",
      "Upgrade-ready to paid plans",
    ],
    cta: "Start Free Trial",
    to: "/auth",
    variant: "hero",
    popular: true,
  },
  {
    name: "Standard",
    badge: "Paid",
    description: "For single-mode schools or colleges.",
    price: "Unlimited",
    period: "usage",
    icon: Crown,
    features: [
      "Unlimited classes & teachers",
      "All core features enabled",
      "Institution locked to School OR College",
      "PDF / Excel exports (when enabled)",
      "Priority support",
    ],
    cta: "Upgrade inside app",
    to: "/auth",
    variant: "heroOutline",
    popular: false,
  },
  {
    name: "Flex",
    badge: "Paid",
    description: "For hybrid institutions that switch modes.",
    price: "Unlimited",
    period: "usage",
    icon: Crown,
    features: [
      "Everything in Standard",
      "Switch School 304 College",
      "Maintain multiple configs",
      "Ideal for coaching & hybrid setups",
      "Best for multi-branch SaaS",
    ],
    cta: "Upgrade inside app",
    to: "/auth",
    variant: "heroOutline",
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Simple Pricing
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Plans for every stage
          </h2>

          <p className="text-lg text-muted-foreground">
            Start in demo, move to trial after signup, and upgrade to Standard or Flex when you are ready.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 transition-all duration-300 animate-fade-in-up ${
                plan.popular
                  ? "bg-card border-2 border-primary shadow-xl shadow-primary/10 scale-105 lg:scale-110"
                  : "bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="gradient-primary text-primary-foreground text-sm font-medium px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.popular ? "gradient-primary" : "bg-muted"
                  }`}
                >
                  <plan.icon
                    className={`w-5 h-5 ${
                      plan.popular
                        ? "text-primary-foreground"
                        : "text-foreground"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  {plan.badge && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {plan.badge}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-muted-foreground mb-6">
                {plan.description}
              </p>

              <div className="mb-8">
                <span className="text-4xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-muted-foreground ml-2">
                  /{plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success mt-0.5" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button variant={plan.variant} size="lg" className="w-full" asChild>
                <Link to={plan.to}>
                  {plan.cta}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
