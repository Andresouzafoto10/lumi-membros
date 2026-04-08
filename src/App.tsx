import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import { StudentLayout } from "@/components/layout/StudentLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { CommunityLayout } from "@/components/layout/CommunityLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { applyThemeToCss } from "@/lib/applyTheme";
import { applyFavicon, applyPwaManifest } from "@/lib/generatePwaManifest";

// ---------------------------------------------------------------------------
// Auth pages (NOT lazy — precisam ser rápidas)
// ---------------------------------------------------------------------------
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import InviteRegisterPage from "@/pages/auth/InviteRegisterPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import LandingPage from "@/pages/LandingPage";

// ---------------------------------------------------------------------------
// Lazy-loaded pages (code-splitting)
// ---------------------------------------------------------------------------

// Student
const CoursesPage = lazy(() => import("@/pages/student/CoursesPage"));
const CourseDetailPage = lazy(() => import("@/pages/student/CourseDetailPage"));
const LessonPage = lazy(() => import("@/pages/student/LessonPage"));
const MyProfilePage = lazy(() => import("@/pages/student/MyProfilePage"));
const MyCertificatesPage = lazy(
  () => import("@/pages/student/MyCertificatesPage")
);
const PublicProfilePage = lazy(
  () => import("@/pages/student/PublicProfilePage")
);
const RankingPage = lazy(() => import("@/pages/student/RankingPage"));
const CommunityFeedPage = lazy(
  () => import("@/pages/student/CommunityFeedPage")
);
const CommunityPage = lazy(() => import("@/pages/student/CommunityPage"));

// Admin
const AdminDashboardPage = lazy(
  () => import("@/pages/admin/AdminDashboardPage")
);
const AdminCoursesPage = lazy(
  () => import("@/pages/admin/AdminCoursesPage")
);
const AdminSessionPage = lazy(
  () => import("@/pages/admin/AdminSessionPage")
);
const AdminCourseEditPage = lazy(
  () => import("@/pages/admin/AdminCourseEditPage")
);
const AdminModuleEditPage = lazy(
  () => import("@/pages/admin/AdminModuleEditPage")
);
const AdminBannersPage = lazy(
  () => import("@/pages/admin/AdminBannersPage")
);
const AdminSectionsPage = lazy(
  () => import("@/pages/admin/AdminSectionsPage")
);
const AdminClassesPage = lazy(
  () => import("@/pages/admin/AdminClassesPage")
);
const AdminClassEditPage = lazy(
  () => import("@/pages/admin/AdminClassEditPage")
);
const AdminStudentsPage = lazy(
  () => import("@/pages/admin/AdminStudentsPage")
);
const AdminStudentProfilePage = lazy(
  () => import("@/pages/admin/AdminStudentProfilePage")
);
const AdminSettingsPage = lazy(
  () => import("@/pages/admin/AdminSettingsPage")
);
const AdminAccessProfilesPage = lazy(
  () => import("@/pages/admin/AdminAccessProfilesPage")
);
const AdminGamificationPage = lazy(
  () => import("@/pages/admin/AdminGamificationPage")
);
const AdminCommunitiesPage = lazy(
  () => import("@/pages/admin/AdminCommunitiesPage")
);
const AdminCommunityEditPage = lazy(
  () => import("@/pages/admin/AdminCommunityEditPage")
);
const AdminModerationPage = lazy(
  () => import("@/pages/admin/AdminModerationPage")
);
const AdminEmailsPage = lazy(
  () => import("@/pages/admin/AdminEmailsPage")
);
const InviteLinksPage = lazy(
  () => import("@/pages/admin/InviteLinksPage")
);
const AdminIntegrationsPage = lazy(
  () => import("@/pages/admin/AdminIntegrationsPage")
);
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

// ---------------------------------------------------------------------------
// Loading fallback
// ---------------------------------------------------------------------------

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Theme applicator — applies custom CSS variables on settings load
// ---------------------------------------------------------------------------

function ThemeApplicator() {
  const { settings, loading } = usePlatformSettings();
  const platformName = settings.name || "Lumi Membros";

  useEffect(() => {
    // Skip applying defaults while loading — the cached theme (from
    // localStorage) is already active and correct. Only apply once the
    // real settings arrive from Supabase.
    if (loading) return;
    applyThemeToCss(settings.theme.dark, settings.theme.light);
    applyFavicon(settings.faviconUrl);
    applyPwaManifest(settings);
  }, [settings, loading]);

  return (
    <Helmet
      titleTemplate={`%s | ${platformName}`}
      defaultTitle={platformName}
    />
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ThemeApplicator />
      <Routes>
        {/* Landing / sales page (public) */}
        <Route path="/" element={<LandingPage />} />

        {/* Public auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/convite/:slug" element={<InviteRegisterPage />} />

        {/* Student routes — require authentication */}
        <Route
          element={
            <ProtectedRoute>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/cursos" element={<CoursesPage />} />
          <Route path="/cursos/:courseId" element={<CourseDetailPage />} />
          <Route
            path="/cursos/:courseId/aulas/:lessonId"
            element={<LessonPage />}
          />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/meu-perfil" element={<MyProfilePage />} />
          <Route path="/meus-certificados" element={<MyCertificatesPage />} />
          <Route path="/perfil/:id" element={<PublicProfilePage />} />

          {/* Community routes (nested in CommunityLayout) */}
          <Route element={<CommunityLayout />}>
            <Route
              path="/comunidade"
              element={<Navigate to="/comunidade/feed" replace />}
            />
            <Route path="/comunidade/feed" element={<CommunityFeedPage />} />
            <Route path="/comunidade/:slug" element={<CommunityPage />} />
          </Route>
        </Route>

        {/* Admin routes — require authentication + admin role */}
        <Route
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/cursos" element={<AdminCoursesPage />} />
          <Route
            path="/admin/cursos/sessoes/:sessionId"
            element={<AdminSessionPage />}
          />
          <Route
            path="/admin/cursos/:courseId/edit"
            element={<AdminCourseEditPage />}
          />
          <Route
            path="/admin/cursos/:courseId/modulos/:moduleId"
            element={<AdminModuleEditPage />}
          />
          <Route path="/admin/banners" element={<AdminBannersPage />} />
          <Route path="/admin/secoes" element={<AdminSectionsPage />} />
          <Route path="/admin/turmas" element={<AdminClassesPage />} />
          <Route
            path="/admin/turmas/:classId/edit"
            element={<AdminClassEditPage />}
          />
          <Route path="/admin/convites" element={<InviteLinksPage />} />
          <Route path="/admin/alunos" element={<AdminStudentsPage />} />
          <Route
            path="/admin/alunos/:studentId"
            element={<AdminStudentProfilePage />}
          />
          <Route path="/admin/comunidade" element={<AdminCommunitiesPage />} />
          <Route
            path="/admin/comunidade/:id/edit"
            element={<AdminCommunityEditPage />}
          />
          <Route path="/admin/comentarios" element={<AdminModerationPage />} />
          <Route path="/admin/emails" element={<AdminEmailsPage />} />
          <Route path="/admin/gamificacao" element={<AdminGamificationPage />} />
          <Route path="/admin/integracoes" element={<AdminIntegrationsPage />} />
          <Route path="/admin/configuracoes" element={<AdminSettingsPage />} />
          <Route
            path="/admin/configuracoes/perfis"
            element={<AdminAccessProfilesPage />}
          />
        </Route>

        {/* 404 catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
