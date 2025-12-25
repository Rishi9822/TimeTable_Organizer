import { Button } from "@/components/ui/button";
import { Check, Sparkles, Building, Crown } from "lucide-react";

const plans = [
  {
    name: "Free",
    description: "For small institutions getting started",
    price: "₹0",
    period: "forever",
    icon: Sparkles,
    features: [
      "Up to 3 classes",
      "Basic conflict detection",
      "Manual scheduling",
      "1 admin user",
      "Community support",
    ],
    cta: "Get Started",
    variant: "heroOutline",
    popular: false,
  },
  {
    name: "Pro",
    description: "For schools and colleges",
    price: "₹2,999",
    period: "per month",
    icon: Building,
    features: [
      "Unlimited classes",
      "Advanced conflict prevention",
      "Smart slot suggestions",
      "5 admin users",
      "PDF & Excel export",
      "Teacher-wise views",
      "Priority support",
    ],
    cta: "Start Free Trial",
    variant: "hero",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large institutions & SaaS",
    price: "Custom",
    period: "contact us",
    icon: Crown,
    features: [
      "Everything in Pro",
      "AI-powered optimization",
      "Multi-branch support",
      "SSO & advanced security",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
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
            Choose Your Plan
          </h2>

          <p className="text-lg text-muted-foreground">
            Start free and scale as you grow. No hidden fees, cancel anytime.
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
                <h3 className="text-xl font-semibold text-foreground">
                  {plan.name}
                </h3>
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

              <Button variant={plan.variant} size="lg" className="w-full">
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
