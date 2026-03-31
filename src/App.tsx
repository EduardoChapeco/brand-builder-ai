import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import AppShell from "@/components/AppShell";
import WorkspacesPage from "@/pages/WorkspacesPage";
import OnboardingPage from "@/pages/OnboardingPage";
import GeneratorPage from "@/pages/GeneratorPage";
import LibraryPage from "@/pages/LibraryPage";
import BrandKitPage from "@/pages/BrandKitPage";
import BriefingPage from "@/pages/BriefingPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import BrandDNAPage from "@/pages/BrandDNAPage";
import ApiKeysPage from "@/pages/ApiKeysPage";
import SlidesPage from "@/pages/SlidesPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/workspaces" replace />} />
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route
            path="/workspace/:workspaceId/*"
            element={
              <WorkspaceProvider>
                <AppShell />
              </WorkspaceProvider>
            }
          >
            <Route index element={<Navigate to="generator" replace />} />
            <Route path="generator" element={<GeneratorPage />} />
            <Route path="slides" element={<SlidesPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="brand-kit" element={<BrandKitPage />} />
            <Route path="briefing" element={<BriefingPage />} />
            <Route path="brand-dna" element={<BrandDNAPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
