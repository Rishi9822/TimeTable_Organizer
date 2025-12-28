import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { TimetableProvider } from "@/contexts/TimetableContext";
import { InstitutionProvider } from "@/contexts/InstitutionContext";
import { AuthProvider } from "@/contexts/AuthContext";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import Index from "@/pages/Index";
import TimetableBuilder from "@/pages/TimetableBuilder";
import SetupWizard from "@/pages/SetupWizard";
import TeacherManagement from "@/pages/TeacherManagement";
import AdminDashboard from "@/pages/AdminDashboard";
import UserDashboard from "@/pages/UserDashboard";
import JoinInstitution from "@/pages/JoinInstitution";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <InstitutionProvider>
            <TimetableProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Public */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />

                  {/* Admin */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requiredRoles={["admin"]}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/setup"
                    element={
                      <ProtectedRoute requiredRoles={["admin"]}>
                        <SetupWizard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Scheduler join */}
                  <Route
                    path="/join"
                    element={
                      <ProtectedRoute requiredRoles={["scheduler"]}>
                        <JoinInstitution />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin + Scheduler */}
                  <Route
                    path="/builder"
                    element={
                      <ProtectedRoute requiredRoles={["admin", "scheduler"]}>
                        <TimetableBuilder />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/teachers"
                    element={
                      <ProtectedRoute requiredRoles={["admin", "scheduler"]}>
                        <TeacherManagement />
                      </ProtectedRoute>
                    }
                  />

                  {/* Teacher / Student */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <UserDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TimetableProvider>
          </InstitutionProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
