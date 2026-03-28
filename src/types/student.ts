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

// ---------------------------------------------------------------------------
// Student Profile
// ---------------------------------------------------------------------------

export type StudentProfile = {
  id: string;
  studentId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  coverUrl: string;
  bio: string;
  link: string;
  location: string;
  createdAt: string;
  followers: string[];
  following: string[];
};

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

export type CommunitySettings = {
  allowStudentPosts: boolean;
  requireApproval: boolean;
  allowImages: boolean;
};

export type Community = {
  id: string;
  slug: string;
  name: string;
  description: string;
  coverUrl: string;
  iconUrl: string;
  classIds: string[];
  pinnedPostId: string | null;
  settings: CommunitySettings;
  status: "active" | "inactive";
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Community Posts
// ---------------------------------------------------------------------------

export type CommunityPostType = "user" | "system";

export type SystemEvent = {
  event: "module_complete" | "course_complete";
  courseId: string;
  moduleId?: string;
};

export type CommunityPost = {
  id: string;
  communityId: string;
  authorId: string;
  type: CommunityPostType;
  systemEvent?: SystemEvent;
  title: string;
  body: string;
  images: string[];
  hashtags: string[];
  mentions: string[];
  likesCount: number;
  commentsCount: number;
  likedBy: string[];
  savedBy: string[];
  status: "published" | "pending" | "rejected";
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Post Comments
// ---------------------------------------------------------------------------

export type PostComment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  likesCount: number;
  likedBy: string[];
  parentCommentId: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Student Restrictions
// ---------------------------------------------------------------------------

export type StudentRestriction = {
  id: string;
  studentId: string;
  reason: string;
  appliedBy: string;
  startsAt: string;
  endsAt: string | null;
  active: boolean;
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "system";

export type NotificationTargetType = "post" | "comment" | "profile";

export type AppNotification = {
  id: string;
  recipientId: string;
  type: NotificationType;
  actorId: string | null;
  targetId: string;
  targetType: NotificationTargetType;
  message: string;
  read: boolean;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Gamification
// ---------------------------------------------------------------------------

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
};

export type GamificationData = {
  studentId: string;
  points: number;
  badges: string[];
};
