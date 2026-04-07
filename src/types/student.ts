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
  emailNotificationsEnabled: boolean;
  certificateBackgroundUrl: string;
  certificateDefaultText: string;
  theme: {
    dark: ThemeColors;
    light: ThemeColors;
  };
  faviconUrl?: string | null;
  logoUploadUrl?: string | null;
  pwaEnabled?: boolean;
  pwaName?: string | null;
  pwaShortName?: string | null;
  pwaIconUrl?: string | null;
  pwaThemeColor?: string | null;
  pwaBackgroundColor?: string | null;
  loginCoverUrl?: string | null;
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
  coverPosition: string;
  bio: string;
  link: string;
  location: string;
  cpf: string;
  socialInstagram: string;
  socialYoutube: string;
  socialTiktok: string;
  socialTwitter: string;
  socialLinkedin: string;
  socialWebsite: string;
  createdAt: string;
  followers: string[];
  following: string[];
  role: StudentRole;
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

/** A community is public if it has no classIds (empty array) */
export function isCommunityPublic(community: Community): boolean {
  return community.classIds.length === 0;
}

// ---------------------------------------------------------------------------
// Community Posts
// ---------------------------------------------------------------------------

export type CommunityPostType = "user" | "system";

export type SystemEvent = {
  event: "module_complete" | "course_complete";
  courseId: string;
  moduleId?: string;
};

export type PostAttachment = {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
};

export type PollOption = {
  id: string;
  text: string;
  votedBy: string[];
};

export type PostPoll = {
  question: string;
  options: PollOption[];
  duration: "1d" | "3d" | "7d" | "14d";
  endsAt: string;
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
  attachments: PostAttachment[];
  hashtags: string[];
  mentions: string[];
  likesCount: number;
  commentsCount: number;
  likedBy: string[];
  savedBy: string[];
  poll?: PostPoll | null;
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

/** @deprecated Use Mission instead */
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

// ---------------------------------------------------------------------------
// Missões (unified mission system — replaces badges + achievements)
// ---------------------------------------------------------------------------

export type MissionConditionType =
  | "action_count"     // fez X vezes uma ação (ex: curtiu 10 posts)
  | "points_total"     // acumulou X pontos
  | "streak_days"      // acessou X dias seguidos
  | "course_complete"  // completou X cursos
  | "lesson_complete"  // completou X aulas
  | "manual";          // concedida manualmente pelo admin

export type Mission = {
  id: string;
  name: string;
  description: string;
  icon: string;
  conditionType: MissionConditionType;
  conditionAction: string | null;
  conditionThreshold: number;
  pointsReward: number;
  enabled: boolean;
  isSecret: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
};

export type StudentMission = {
  id: string;
  missionId: string;
  studentId: string;
  progress: number;
  completed: boolean;
  completedAt: string | null;
  grantedBy: string;
  createdAt: string;
};

export type CommunitySidebarItem = {
  id: string;
  communityId: string;
  emoji: string;
  order: number;
  visible: boolean;
  salesPageUrl: string;
};

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

export type CertificateBlockType =
  | "platform_name"
  | "student_name"
  | "course_name"
  | "completion_date"
  | "course_hours"
  | "custom_text"
  | "certificate_title";

export type CertificateBlock = {
  id: string;
  type: CertificateBlockType;
  content?: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  color: string;
  textAlign: "left" | "center" | "right";
  top: number;
  left: number;
  width: number;
};

export type BackgroundFit = "cover" | "contain" | "fill";

export type BackgroundConfig = {
  fit: BackgroundFit;
  position: string; // e.g. "50% 50%"
};

export type CertificateTemplate = {
  id: string;
  name: string;
  backgroundUrl: string;
  backgroundConfig: BackgroundConfig;
  blocks: CertificateBlock[];
  createdAt: string;
  updatedAt: string;
};

export type EarnedCertificate = {
  id: string;
  studentId: string;
  courseId: string;
  templateId: string;
  earnedAt: string;
  downloadedAt?: string;
};

// ---------------------------------------------------------------------------
// Quiz Attempts
// ---------------------------------------------------------------------------

export type QuizAttempt = {
  id: string;
  studentId: string;
  lessonId: string;
  answers: Record<string, string>;
  score: number;
  passed: boolean;
  attemptedAt: string;
};
