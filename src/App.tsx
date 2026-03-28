import { Routes, Route, Navigate } from "react-router-dom";

import { StudentLayout } from "@/components/layout/StudentLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { CommunityLayout } from "@/components/layout/CommunityLayout";

import CoursesPage from "@/pages/student/CoursesPage";
import CourseDetailPage from "@/pages/student/CourseDetailPage";
import LessonPage from "@/pages/student/LessonPage";
import MyProfilePage from "@/pages/student/MyProfilePage";
import PublicProfilePage from "@/pages/student/PublicProfilePage";
import CommunityFeedPage from "@/pages/student/CommunityFeedPage";
import CommunityPage from "@/pages/student/CommunityPage";

import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminCoursesPage from "@/pages/admin/AdminCoursesPage";
import AdminSessionPage from "@/pages/admin/AdminSessionPage";
import AdminCourseEditPage from "@/pages/admin/AdminCourseEditPage";
import AdminModuleEditPage from "@/pages/admin/AdminModuleEditPage";
import AdminBannersPage from "@/pages/admin/AdminBannersPage";
import AdminSectionsPage from "@/pages/admin/AdminSectionsPage";
import AdminClassesPage from "@/pages/admin/AdminClassesPage";
import AdminClassEditPage from "@/pages/admin/AdminClassEditPage";
import AdminStudentsPage from "@/pages/admin/AdminStudentsPage";
import AdminStudentProfilePage from "@/pages/admin/AdminStudentProfilePage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminAccessProfilesPage from "@/pages/admin/AdminAccessProfilesPage";
import AdminCommunitiesPage from "@/pages/admin/AdminCommunitiesPage";
import AdminCommunityEditPage from "@/pages/admin/AdminCommunityEditPage";
import AdminModerationPage from "@/pages/admin/AdminModerationPage";

export default function App() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/cursos" replace />} />

      {/* Student routes */}
      <Route element={<StudentLayout />}>
        <Route path="/cursos" element={<CoursesPage />} />
        <Route path="/cursos/:courseId" element={<CourseDetailPage />} />
        <Route
          path="/cursos/:courseId/aulas/:lessonId"
          element={<LessonPage />}
        />
        <Route path="/meu-perfil" element={<MyProfilePage />} />
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

      {/* Admin routes */}
      <Route element={<AdminLayout />}>
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
        <Route path="/admin/configuracoes" element={<AdminSettingsPage />} />
        <Route
          path="/admin/configuracoes/perfis"
          element={<AdminAccessProfilesPage />}
        />
      </Route>
    </Routes>
  );
}
