import { Routes, Route, Navigate } from "react-router-dom";

import { StudentLayout } from "@/components/layout/StudentLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

import CoursesPage from "@/pages/student/CoursesPage";
import CourseDetailPage from "@/pages/student/CourseDetailPage";
import LessonPage from "@/pages/student/LessonPage";

import AdminCoursesPage from "@/pages/admin/AdminCoursesPage";
import AdminSessionPage from "@/pages/admin/AdminSessionPage";
import AdminCourseEditPage from "@/pages/admin/AdminCourseEditPage";
import AdminModuleEditPage from "@/pages/admin/AdminModuleEditPage";
import AdminBannersPage from "@/pages/admin/AdminBannersPage";
import AdminSectionsPage from "@/pages/admin/AdminSectionsPage";

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
      </Route>

      {/* Admin routes */}
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Navigate to="/admin/cursos" replace />} />
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
      </Route>
    </Routes>
  );
}
