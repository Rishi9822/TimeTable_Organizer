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
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 minute
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
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />

                  <Route
                    path="/setup"
                    element={
                      <ProtectedRoute requiredRoles={["admin", "scheduler"]}>
                        <SetupWizard />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/builder"
                    element={
                      <ProtectedRoute>
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
