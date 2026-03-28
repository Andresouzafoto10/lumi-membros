import type { Course, CourseAccess, CourseBanner, CourseLesson, CourseModule, CourseSession, CourseVideoType } from "./course";

export type AdminCourseFormData = {
  title: string;
  description: string;
  isActive: boolean;
  bannerUrl: string;
  access: CourseAccess;
};

export type AdminModuleFormData = {
  title: string;
  isActive: boolean;
};

export type AdminLessonFormData = {
  id?: string;
  title: string;
  isActive: boolean;
  videoType: CourseVideoType;
  videoUrl: string | null;
  description: string;
  materials: CourseLesson["materials"];
  links: CourseLesson["links"];
  files: CourseLesson["files"];
};

export type AdminSessionFormData = {
  title: string;
  description?: string;
  isActive: boolean;
};

export type AdminBannerFormData = {
  title: string;
  subtitle: string;
  buttonLabel: string;
  targetType: CourseBanner["targetType"];
  targetCourseId: string;
  targetUrl: string;
  imageUrl: string;
  isActive: boolean;
};

export type {
  Course,
  CourseAccess,
  CourseBanner,
  CourseLesson,
  CourseModule,
  CourseSession,
};
