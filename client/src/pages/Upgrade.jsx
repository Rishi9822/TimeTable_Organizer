import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useToast } from '@/hooks/useToast';
import API from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar, Check, Lock, Sparkles, ArrowLeftRight, ArrowLeft, School, GraduationCap, Loader2
} from 'lucide-react';

const Upgrade = () => {
  const { user, role } = useAuth();
  const { plan, isTrialExpired, trialDaysRemaining, activeMode } = useSubscription();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState(null);

  // Only admins can upgrade
  if (role && role !== 'admin' && role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Already on a paid plan
  if (plan === 'standard' || plan === 'flex') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold">You're on the {plan === 'standard' ? 'Standard' : 'Flex'} Plan</h2>
            <p className="text-sm text-muted-foreground">
              Your subscription is active. Enjoy all features!
            </p>
            <Link to="/admin">
              <Button variant="outline" className="gap-2 mt-2">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUpgrade = async (selectedPlan) => {
    setLoadingPlan(selectedPlan);
    try {
      const { data } = await API.post('/stripe/create-checkout', { plan: selectedPlan });
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: 'Error', description: 'Could not create checkout session', variant: 'destructive' });
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to start checkout';
      toast({ title: 'Upgrade Error', description: msg, variant: 'destructive' });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">TimetablePro</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Trial Status */}
        <div className="text-center mb-10 space-y-3">
          {isTrialExpired ? (
            <>
              <Badge variant="destructive" className="mb-2">Trial Expired</Badge>
              <h1 className="text-3xl font-bold text-foreground">Your Free Trial Has Ended</h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Upgrade now to continue using TimetablePro. All your data is safe and will be available
                immediately after upgrading.
              </p>
            </>
          ) : (
            <>
              <Badge variant="secondary" className="mb-2">
                {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in trial
              </Badge>
              <h1 className="text-3xl font-bold text-foreground">Upgrade Your Plan</h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Choose the plan that best fits your institution's needs.
              </p>
            </>
          )}
        </div>

        {/* Current mode badge */}
        <div className="flex justify-center mb-8">
          <Badge variant="outline" className="gap-2 px-4 py-2 text-sm">
            {activeMode === 'school' ? <School className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
            Currently in {activeMode === 'school' ? 'School' : 'College'} mode
          </Badge>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Standard Plan */}
          <Card className="relative border-2 hover:border-primary/30 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-xl">Standard</CardTitle>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$29</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <CardDescription className="mt-2">
                Single mode — locked to your current institution type forever.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2.5 text-sm">
                {[
                  'Unlimited classes & teachers',
                  'Advanced conflict detection',
                  'Smart scheduling suggestions',
                  'Up to 5 admin users',
                  'Export & print timetables',
                  'Teacher & student portals',
                  'Priority support',
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                Locked to {activeMode === 'school' ? 'School' : 'College'} mode forever
              </div>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => handleUpgrade('standard')}
                disabled={!!loadingPlan}
              >
                {loadingPlan === 'standard' ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                ) : (
                  'Choose Standard'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Flex Plan — Recommended */}
          <Card className="relative border-2 border-primary shadow-xl shadow-primary/10 scale-[1.02]">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="gradient-primary text-primary-foreground px-4 py-1 text-sm font-medium">
                Recommended
              </Badge>
            </div>
            <CardHeader className="pb-4 pt-8">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Flex</CardTitle>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$49</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <CardDescription className="mt-2">
                Dual mode — switch between School & College anytime.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2.5 text-sm">
                {[
                  'Everything in Standard',
                  'School + College dual mode',
                  'Instant mode switching',
                  'Separate data per mode',
                  'Up to 10 admin users',
                  'Advanced analytics & reporting',
                  'Dedicated account manager',
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <ArrowLeftRight className="h-3 w-3" />
                Switch between School & College freely
              </div>
              <Button
                className="w-full gradient-primary text-primary-foreground shadow-lg"
                size="lg"
                onClick={() => handleUpgrade('flex')}
                disabled={!!loadingPlan}
              >
                {loadingPlan === 'flex' ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                ) : (
                  <>Start Flex Plan <Sparkles className="h-4 w-4 ml-2" /></>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-10 space-y-2">
          <p className="text-xs text-muted-foreground">
            30-day money-back guarantee • Cancel anytime
          </p>
          <p className="text-xs text-muted-foreground">
            Need help? Contact <a href="mailto:support@timetable.app" className="text-primary hover:underline">support@timetable.app</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;
