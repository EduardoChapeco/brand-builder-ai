import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { MCPProvider } from "@/contexts/MCPContext";
import AppShell from "@/components/AppShell";
import WorkspacesPage from "@/pages/WorkspacesPage";
import OnboardingPage from "@/pages/OnboardingPage";
import AuthPage from "@/pages/AuthPage";
import GeneratorPage from "@/pages/GeneratorPage";
import LibraryPage from "@/pages/LibraryPage";
import BrandKitPage from "@/pages/BrandKitPage";
import BriefingPage from "@/pages/BriefingPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import BrandDNAPage from "@/pages/BrandDNAPage";
import SlidesPage from "@/pages/SlidesPage";
import DashboardPage from "@/pages/DashboardPage";
import SquadsPage from "@/pages/SquadsPage";

// Phase 4 New Modules
import ViralAnalyzer from "@/pages/ViralAnalyzer";
import PromptStudio from "@/pages/PromptStudio";
import CarouselBuilder from "@/pages/CarouselBuilder";
import ProductShots from "@/pages/ProductShots";
import BrandCharacter from "@/pages/BrandCharacter";
import ChatPage from "@/pages/ChatPage";
import FeedSimulatorPage from "@/pages/FeedSimulatorPage";
import BioLinkModuleLayout from "@/components/biolink/BioLinkModuleLayout";
import BioLinkPage from "@/pages/BioLinkPage";
import BioLinkThemesPage from "@/pages/BioLinkThemesPage";
import BioLinkCRMPage from "@/pages/BioLinkCRMPage";
import BioLinkAnalyticsPage from "@/pages/BioLinkAnalyticsPage";
import BioLinkSettingsPage from "@/pages/BioLinkSettingsPage";
import BioLinkVersionsPage from "@/pages/BioLinkVersionsPage";
import PublicBioLink from "@/pages/PublicBioLink";
import NewsPortalPage from "@/pages/NewsPortalPage";
import BlogManagerPage from "@/pages/BlogManagerPage";
import WebClonerPage from "@/pages/WebClonerPage";
import VibeCoderPage from "@/pages/VibeCoderPage";
import SiteBuilderPage from "@/pages/SiteBuilderPage";
import SiteEditorPage from "@/pages/SiteEditorPage";
import SimLabPage from "@/pages/SimLabPage";
import VideoStudioPage from "@/pages/VideoStudioPage";
import VideoStudioEditorPage from "@/pages/VideoStudioEditorPage";
import VideoStudioGeneratePage from "@/pages/VideoStudioGeneratePage";
import VideoStudioMotionPage from "@/pages/VideoStudioMotionPage";
import VideoStudioMotionStudioPage from "@/pages/VideoStudioMotionStudioPage";

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
          <Route path="/auth/login" element={<AuthPage />} />
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/b/:slug" element={<PublicBioLink />} />
          <Route path="/:slug" element={<PublicBioLink />} />
          <Route
            path="/workspace/:workspaceId/*"
            element={
              <WorkspaceProvider>
                <MCPProvider>
                  <AppShell />
                </MCPProvider>
              </WorkspaceProvider>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"       element={<DashboardPage />} />
            <Route path="squads"          element={<SquadsPage />} />
            <Route path="site-builder"    element={<SiteBuilderPage />} />
            <Route path="site-builder/:siteId" element={<SiteEditorPage />} />
            <Route path="video-studio"    element={<VideoStudioPage />} />
            <Route path="video-studio/editor/:projectId" element={<VideoStudioEditorPage />} />
            <Route path="video-studio/generate" element={<VideoStudioGeneratePage />} />
            <Route path="video-studio/motion-studio" element={<VideoStudioMotionStudioPage />} />
            <Route path="video-studio/motion" element={<VideoStudioMotionPage />} />
            <Route path="generator"       element={<GeneratorPage />} />
            <Route path="carousel-builder" element={<CarouselBuilder />} />
            <Route path="image-prompts"   element={<PromptStudio />} />
            <Route path="product-shots"   element={<ProductShots />} />
            <Route path="viral-analyzer"  element={<ViralAnalyzer />} />
            <Route path="simlab"          element={<SimLabPage />} />
            <Route path="news-portal"     element={<NewsPortalPage />} />
            <Route path="blog-manager"    element={<BlogManagerPage />} />
            <Route path="web-cloner"      element={<WebClonerPage />} />
            <Route path="vibe-coder"      element={<VibeCoderPage />} />
            <Route path="brand-character" element={<BrandCharacter />} />
            <Route path="chat"            element={<ChatPage />} />
            <Route path="feed-preview"    element={<FeedSimulatorPage />} />
            <Route path="biolink"         element={<BioLinkModuleLayout />}>
              <Route index element={<BioLinkPage />} />
              <Route path="themes" element={<BioLinkThemesPage />} />
              <Route path="crm" element={<BioLinkCRMPage />} />
              <Route path="analytics" element={<BioLinkAnalyticsPage />} />
              <Route path="settings" element={<BioLinkSettingsPage />} />
              <Route path="versions" element={<BioLinkVersionsPage />} />
            </Route>
            <Route path="slides"          element={<SlidesPage />} />
            <Route path="library"         element={<LibraryPage />} />
            <Route path="brand-kit"       element={<BrandKitPage />} />
            <Route path="briefing"        element={<BriefingPage />} />
            <Route path="brand-dna"       element={<BrandDNAPage />} />
            <Route path="api-keys"        element={<Navigate to="../settings?tab=keys" replace />} />
            <Route path="settings"        element={<SettingsPage />} />
            <Route path="*"               element={<Navigate to="dashboard" replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
