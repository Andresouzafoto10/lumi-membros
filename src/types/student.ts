export type StudentRole =
  | "owner"
  | "admin"
  | "support"
  | "moderator"
  | "student"
  | string;

export type StudentStatus = "active" | "inactive" | "expired";

export type EnrollmentType = "individual" | "subscription" | "unlimited";

export type EnrollmentStatus = "active" | "expired" | "cancelled";

export type ContentScheduleRule = {
  targetId: string;
  targetType: "module" | "lesson";
  rule:
    | "free"
    | "scheduled_date"
    | "days_after_enrollment"
    | "blocked"
    | "hidden"
    | "course_complete"
    | "module_complete"
    | "lesson_complete";
  releaseDate?: string;
  closeDate?: string;
  daysAfter?: number;
  referenceId?: string;
};

export type Enrollment = {
  id: string;
  studentId: string;
  classId: string;
  type: EnrollmentType;
  expiresAt: string | null;
  status: EnrollmentStatus;
  enrolledAt: string;
};

export type Class = {
  id: string;
  name: string;
  courseIds: string[];
  enrollmentType: EnrollmentType;
  accessDurationDays: number | null;
  status: "active" | "inactive";
  contentSchedule: ContentScheduleRule[];
};

export type Student = {
  id: string;
  name: string;
  email: string;
  role: StudentRole;
  status: StudentStatus;
  createdAt: string;
  enrollments: Enrollment[];
};

export type AccessProfile = {
  id: string;
  name: string;
  description: string;
  permissions: {
    courses: boolean;
    students: boolean;
    classes: boolean;
    settings: boolean;
    community: boolean;
  };
};

export type ThemeColors = {
  primary: string;
  background: string;
  card: string;
  foreground: string;
};

export type PlatformSettings = {
  name: string;
  logoUrl: string;
  defaultTheme: "dark" | "light";
  ratingsEnabled: boolean;
  certificateBackgroundUrl: string;
  certificateDefaultText: string;
  theme: {
    dark: ThemeColors;
    light: ThemeColors;
  };
};
