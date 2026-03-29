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
};

export type CourseModule = {
  id: string;
  title: string;
  order: number;
  isActive: boolean;
  lessons: CourseLesson[];
};

export type CourseAccess =
  | { mode: "all" }
  | { mode: "plans"; plans: string[] }
  | { mode: "admin" };

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
};

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
