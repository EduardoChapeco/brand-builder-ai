import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import AdminPage from '@/pages/AdminPage';
import AgentsPage from '@/pages/AgentsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import AuthPage from '@/pages/AuthPage';
import BillingPage from '@/pages/BillingPage';
import BioLinkAnalyticsPage from '@/pages/BioLinkAnalyticsPage';
import BioLinkCRMPage from '@/pages/BioLinkCRMPage';
import BioLinkPage from '@/pages/BioLinkPage';
import BioLinkSettingsPage from '@/pages/BioLinkSettingsPage';
import BioLinkThemesPage from '@/pages/BioLinkThemesPage';
import BlogManagerPage from '@/pages/BlogManagerPage';
import BrandKitPage from '@/pages/BrandKitPage';
import BriefingPage from '@/pages/BriefingPage';
import CRMPage from '@/pages/CRMPage';
import DashboardPage from '@/pages/DashboardPage';
import GeneratorPage from '@/pages/GeneratorPage';
import HelpPage from '@/pages/HelpPage';
import HubPage from '@/pages/HubPage';
import LibraryPage from '@/pages/LibraryPage';
import NewsPortalPage from '@/pages/NewsPortalPage';
import NotFound from '@/pages/NotFound';
import OnboardingPage from '@/pages/OnboardingPage';
import PublicBioLink from '@/pages/PublicBioLink';
import SettingsPage from '@/pages/SettingsPage';
import SiteBuilderPage from '@/pages/SiteBuilderPage';
import SiteEditorPage from '@/pages/SiteEditorPage';
import SupportPage from '@/pages/SupportPage';
import VideoStudioEditorPage from '@/pages/VideoStudioEditorPage';
import VideoStudioGeneratePage from '@/pages/VideoStudioGeneratePage';
import VideoStudioMotionPage from '@/pages/VideoStudioMotionPage';
import VideoStudioPage from '@/pages/VideoStudioPage';
import WorkspacesPage from '@/pages/WorkspacesPage';
import BioLinkModuleLayout from '@/components/biolink/BioLinkModuleLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<Navigate to="/workspaces" replace />} />
          <Route path="/auth/login" element={<AuthPage />} />
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/b/:slug" element={<PublicBioLink />} />
          <Route path="/l/:slug" element={<PublicBioLink />} />
          <Route path="/admin" element={<AdminPage />} />

          {/* Workspace — shell autenticado */}
          <Route
            path="/workspace/:workspaceId/*"
            element={(
              <WorkspaceProvider>
                <AppShell />
              </WorkspaceProvider>
            )}
          >
            <Route index element={<Navigate to="painel" replace />} />

            {/* === OPERACIONAL === */}
            <Route path="painel" element={<DashboardPage />} />
            <Route path="hub" element={<HubPage />} />

            {/* === CRIADORES === */}
            <Route path="sites" element={<SiteBuilderPage />} />
            <Route path="sites/:siteId" element={<SiteEditorPage />} />

            <Route path="biolinks" element={<BioLinkModuleLayout />}>
              <Route index element={<BioLinkPage />} />
              <Route path="temas" element={<BioLinkThemesPage />} />
              <Route path="crm" element={<BioLinkCRMPage />} />
              <Route path="analytics" element={<BioLinkAnalyticsPage />} />
              <Route path="config" element={<BioLinkSettingsPage />} />
            </Route>

            <Route path="blog" element={<BlogManagerPage />} />
            <Route path="noticias" element={<NewsPortalPage />} />
            <Route path="posts" element={<GeneratorPage />} />

            <Route path="video" element={<VideoStudioPage />} />
            <Route path="video/editor/:projectId" element={<VideoStudioEditorPage />} />
            <Route path="video/gerar" element={<VideoStudioGeneratePage />} />
            <Route path="video/motion" element={<VideoStudioMotionPage />} />

            <Route path="agents" element={<AgentsPage />} />
            {/* simlab absorvido por agents */}
            <Route path="simlab" element={<Navigate to="../agents" replace />} />

            {/* === DADOS === */}
            <Route path="crm" element={<CRMPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />

            {/* === WORKSPACE === */}
            <Route path="brand-kit" element={<BrandKitPage />} />
            <Route path="briefing" element={<BriefingPage />} />
            <Route path="assets" element={<LibraryPage />} />
            <Route path="cobranca" element={<BillingPage />} />
            <Route path="config" element={<SettingsPage />} />
            <Route path="ajuda" element={<HelpPage />} />
            <Route path="suporte" element={<SupportPage />} />

            {/* === REDIRECTS LEGADOS (URLs antigas → PT-BR) === */}
            <Route path="dashboard" element={<Navigate to="../painel" replace />} />
            <Route path="site-builder" element={<Navigate to="../sites" replace />} />
            <Route path="video-studio" element={<Navigate to="../video" replace />} />
            <Route path="blog-manager" element={<Navigate to="../blog" replace />} />
            <Route path="news-portal" element={<Navigate to="../noticias" replace />} />
            <Route path="settings" element={<Navigate to="../config" replace />} />
            <Route path="library" element={<Navigate to="../assets" replace />} />
            <Route path="billing" element={<Navigate to="../cobranca" replace />} />
            <Route path="help" element={<Navigate to="../ajuda" replace />} />
            <Route path="support" element={<Navigate to="../suporte" replace />} />

            {/* === FORA DO ESCOPO SIMWORK → redirect ao painel === */}
            <Route path="squads" element={<Navigate to="../painel" replace />} />
            <Route path="web-cloner" element={<Navigate to="../painel" replace />} />
            <Route path="vibe-coder" element={<Navigate to="../painel" replace />} />

            {/* Fallback interno */}
            <Route path="*" element={<Navigate to="painel" replace />} />
          </Route>

          {/* 404 global */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
