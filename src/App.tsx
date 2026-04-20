import { Suspense, useEffect } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
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
const CoursesPage = lazyWithRetry(() => import("@/pages/student/CoursesPage"));
const CourseDetailPage = lazyWithRetry(() => import("@/pages/student/CourseDetailPage"));
const LessonPage = lazyWithRetry(() => import("@/pages/student/LessonPage"));
const MyProfilePage = lazyWithRetry(() => import("@/pages/student/MyProfilePage"));
const MyCertificatesPage = lazyWithRetry(
  () => import("@/pages/student/MyCertificatesPage")
);
const PublicProfilePage = lazyWithRetry(
  () => import("@/pages/student/PublicProfilePage")
);
const RankingPage = lazyWithRetry(() => import("@/pages/student/RankingPage"));
const CommunityFeedPage = lazyWithRetry(
  () => import("@/pages/student/CommunityFeedPage")
);
const CommunityPage = lazyWithRetry(() => import("@/pages/student/CommunityPage"));
const LiveLessonsPage = lazyWithRetry(() => import("@/pages/student/LiveLessonsPage"));
const LearningPathsPage = lazyWithRetry(() => import("@/pages/student/LearningPathsPage"));
const LearningPathDetailPage = lazyWithRetry(() => import("@/pages/student/LearningPathDetailPage"));

// Admin
const AdminDashboardPage = lazyWithRetry(
  () => import("@/pages/admin/AdminDashboardPage")
);
const AdminCoursesPage = lazyWithRetry(
  () => import("@/pages/admin/AdminCoursesPage")
);
const AdminSessionPage = lazyWithRetry(
  () => import("@/pages/admin/AdminSessionPage")
);
const AdminCourseEditPage = lazyWithRetry(
  () => import("@/pages/admin/AdminCourseEditPage")
);
const AdminModuleEditPage = lazyWithRetry(
  () => import("@/pages/admin/AdminModuleEditPage")
);
const AdminBannersPage = lazyWithRetry(
  () => import("@/pages/admin/AdminBannersPage")
);
const AdminSectionsPage = lazyWithRetry(
  () => import("@/pages/admin/AdminSectionsPage")
);
const AdminClassesPage = lazyWithRetry(
  () => import("@/pages/admin/AdminClassesPage")
);
const AdminClassEditPage = lazyWithRetry(
  () => import("@/pages/admin/AdminClassEditPage")
);
const AdminStudentsPage = lazyWithRetry(
  () => import("@/pages/admin/AdminStudentsPage")
);
const AdminStudentProfilePage = lazyWithRetry(
  () => import("@/pages/admin/AdminStudentProfilePage")
);
const AdminSettingsPage = lazyWithRetry(
  () => import("@/pages/admin/AdminSettingsPage")
);
const AdminAccessProfilesPage = lazyWithRetry(
  () => import("@/pages/admin/AdminAccessProfilesPage")
);
const AdminGamificationPage = lazyWithRetry(
  () => import("@/pages/admin/AdminGamificationPage")
);
const AdminCommunitiesPage = lazyWithRetry(
  () => import("@/pages/admin/AdminCommunitiesPage")
);
const AdminCommunityEditPage = lazyWithRetry(
  () => import("@/pages/admin/AdminCommunityEditPage")
);
const AdminModerationPage = lazyWithRetry(
  () => import("@/pages/admin/AdminModerationPage")
);
const AdminEmailsPage = lazyWithRetry(
  () => import("@/pages/admin/AdminEmailsPage")
);
const InviteLinksPage = lazyWithRetry(
  () => import("@/pages/admin/InviteLinksPage")
);
const AdminIntegrationsPage = lazyWithRetry(
  () => import("@/pages/admin/AdminIntegrationsPage")
);
const AdminLiveLessonsPage = lazyWithRetry(
  () => import("@/pages/admin/AdminLiveLessonsPage")
);
const AdminLearningPathsPage = lazyWithRetry(
  () => import("@/pages/admin/AdminLearningPathsPage")
);
const AdminLearningPathEditPage = lazyWithRetry(
  () => import("@/pages/admin/AdminLearningPathEditPage")
);
const NotFoundPage = lazyWithRetry(() => import("@/pages/NotFoundPage"));

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
  const platformName = settings.name || "Master Membros";

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
          <Route path="/aulas-ao-vivo" element={<LiveLessonsPage />} />
          <Route path="/trilhas" element={<LearningPathsPage />} />
          <Route path="/trilhas/:pathId" element={<LearningPathDetailPage />} />
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
          <Route path="/admin/aulas-ao-vivo" element={<AdminLiveLessonsPage />} />
          <Route path="/admin/trilhas" element={<AdminLearningPathsPage />} />
          <Route path="/admin/trilhas/:pathId/edit" element={<AdminLearningPathEditPage />} />
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
