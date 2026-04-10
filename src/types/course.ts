export interface LessonMaterial {
  id: string;
  lesson_id: string;
  title: string;
  file_path: string;
  file_type: 'pdf' | 'zip' | 'mp3' | 'image' | 'other';
  file_size_bytes?: number;
  drm_enabled: boolean;
  created_at: string;
}

export type CourseVideoType = "youtube" | "vimeo" | "embed" | "none";

export type CourseLessonLink = {
  label: string;
  url: string;
};

export type CourseLessonFile = {
  name: string;
  sizeLabel: string;
};

export type CourseLessonMaterial =
  | { id: string; type: "url"; title: string; url: string }
  | {
      id: string;
      type: "file";
      title: string;
      url: string;
      filename?: string;
      size?: number;
      contentType?: string;
    };

export type QuizQuestionType = "multiple_choice" | "true_false";

export type QuizOption = {
  id: string;
  text: string;
};

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
};

export type CourseLesson = {
  id: string;
  title: string;
  order: number;
  isActive: boolean;
  videoType: CourseVideoType;
  videoUrl: string | null;
  description: string;
  materials?: CourseLessonMaterial[];
  links?: CourseLessonLink[];
  files?: CourseLessonFile[];
  quiz?: QuizQuestion[];
  quizPassingScore?: number;
  quizRequiredToAdvance?: boolean;
  ratingsEnabled: boolean;
  commentsEnabled?: boolean;
};

export type CourseModule = {
  id: string;
  title: string;
  order: number;
  isActive: boolean;
  lessons: CourseLesson[];
};

export type CourseAccessBase = {
  no_access_action?: "nothing" | "redirect";
  no_access_redirect_url?: string;
  no_access_support_url?: string;
};

export type CourseAccess =
  | (CourseAccessBase & { mode: "all" })
  | (CourseAccessBase & { mode: "plans"; plans: string[] })
  | (CourseAccessBase & { mode: "admin" });

export type CertificateRequirementType =
  | "completion"
  | "quiz"
  | "completion_and_quiz";

export type CertificateConfig = {
  templateId: string | null;
  completionThreshold: number;
  hoursLoad: number;
  requirementType: CertificateRequirementType;
  quizThreshold: number;
};

export type LaunchStatus = "upcoming" | "released";

export type Course = {
  id: string;
  title: string;
  description: string;
  bannerUrl: string;
  order: number;
  isActive: boolean;
  access: CourseAccess;
  modules: CourseModule[];
  certificateConfig?: CertificateConfig;
  commentsEnabled?: boolean;
  launchAt?: string | null;
  launchStatus?: LaunchStatus;
};

export interface LessonComment {
  id: string;
  lesson_id: string;
  course_id: string;
  author_id: string;
  parent_comment_id: string | null;
  body: string;
  likes_count: number;
  liked_by: string[];
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
    display_name: string;
    avatar_url: string;
    role: string;
  };
  replies?: LessonComment[];
}

export type CourseSession = {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  order: number;
  courses: Course[];
};

export type CourseBannerTargetType = "none" | "course" | "url";

export type CourseBanner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  buttonLabel: string | null;
  targetType: CourseBannerTargetType;
  targetCourseId: string | null;
  targetUrl: string | null;
  imageUrl: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};
