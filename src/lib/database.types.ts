// Auto-generated Supabase database types for Master Membros
// Reflects the schema in supabase/migrations/001_initial_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // -----------------------------------------------------------------------
      // profiles (extends auth.users)
      // -----------------------------------------------------------------------
      profiles: {
        Row: {
          id: string; // = auth.users.id
          email: string;
          name: string;
          role: string; // 'owner' | 'admin' | 'support' | 'moderator' | 'student'
          status: string; // 'active' | 'inactive' | 'expired'
          username: string;
          display_name: string;
          avatar_url: string;
          cover_url: string;
          cover_position: string;
          bio: string;
          link: string;
          location: string;
          cpf: string;
          social_instagram: string | null;
          social_youtube: string | null;
          social_tiktok: string | null;
          social_twitter: string | null;
          social_linkedin: string | null;
          social_website: string | null;
          signup_source: string | null;
          invite_link_id: string | null;
          followers: string[];
          following: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: string;
          status?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string;
          cover_url?: string;
          cover_position?: string;
          bio?: string;
          link?: string;
          location?: string;
          cpf?: string;
          social_instagram?: string | null;
          social_youtube?: string | null;
          social_tiktok?: string | null;
          social_twitter?: string | null;
          social_linkedin?: string | null;
          social_website?: string | null;
          signup_source?: string | null;
          invite_link_id?: string | null;
          followers?: string[];
          following?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: string;
          status?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string;
          cover_url?: string;
          cover_position?: string;
          bio?: string;
          link?: string;
          location?: string;
          cpf?: string;
          social_instagram?: string | null;
          social_youtube?: string | null;
          social_tiktok?: string | null;
          social_twitter?: string | null;
          social_linkedin?: string | null;
          social_website?: string | null;
          signup_source?: string | null;
          invite_link_id?: string | null;
          followers?: string[];
          following?: string[];
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // course_sessions
      // -----------------------------------------------------------------------
      course_sessions: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          is_active: boolean;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          is_active?: boolean;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          is_active?: boolean;
          order?: number;
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // courses
      // -----------------------------------------------------------------------
      courses: {
        Row: {
          id: string;
          session_id: string;
          title: string;
          description: string;
          banner_url: string;
          order: number;
          is_active: boolean;
          access: Json; // { mode: 'all' } | { mode: 'plans', plans: string[] } | { mode: 'admin' }
          certificate_config: Json | null;
          comments_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          title: string;
          description?: string;
          banner_url?: string;
          order?: number;
          is_active?: boolean;
          access?: Json;
          certificate_config?: Json | null;
          comments_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          title?: string;
          description?: string;
          banner_url?: string;
          order?: number;
          is_active?: boolean;
          access?: Json;
          certificate_config?: Json | null;
          comments_enabled?: boolean;
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // course_modules
      // -----------------------------------------------------------------------
      course_modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // course_lessons
      // -----------------------------------------------------------------------
      course_lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          order: number;
          is_active: boolean;
          video_type: string; // 'youtube' | 'vimeo' | 'embed' | 'none'
          video_url: string | null;
          description: string;
          materials: Json | null;
          quiz: Json | null;
          quiz_passing_score: number | null;
          quiz_required_to_advance: boolean;
          comments_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          order?: number;
          is_active?: boolean;
          video_type?: string;
          video_url?: string | null;
          description?: string;
          materials?: Json | null;
          quiz?: Json | null;
          quiz_passing_score?: number | null;
          quiz_required_to_advance?: boolean;
          comments_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          title?: string;
          order?: number;
          is_active?: boolean;
          video_type?: string;
          video_url?: string | null;
          description?: string;
          materials?: Json | null;
          quiz?: Json | null;
          quiz_passing_score?: number | null;
          quiz_required_to_advance?: boolean;
          comments_enabled?: boolean;
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // course_banners
      // -----------------------------------------------------------------------
      course_banners: {
        Row: {
          id: string;
          title: string | null;
          subtitle: string | null;
          button_label: string | null;
          target_type: string; // 'none' | 'course' | 'url'
          target_course_id: string | null;
          target_url: string | null;
          image_url: string;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title?: string | null;
          subtitle?: string | null;
          button_label?: string | null;
          target_type?: string;
          target_course_id?: string | null;
          target_url?: string | null;
          image_url: string;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string | null;
          subtitle?: string | null;
          button_label?: string | null;
          target_type?: string;
          target_course_id?: string | null;
          target_url?: string | null;
          image_url?: string;
          is_active?: boolean;
          display_order?: number;
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // classes (turmas)
      // -----------------------------------------------------------------------
      classes: {
        Row: {
          id: string;
          name: string;
          course_ids: string[];
          enrollment_type: string; // 'individual' | 'subscription' | 'unlimited'
          access_duration_days: number | null;
          status: string; // 'active' | 'inactive'
          content_schedule: Json; // ContentScheduleRule[]
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          course_ids?: string[];
          enrollment_type?: string;
          access_duration_days?: number | null;
          status?: string;
          content_schedule?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          course_ids?: string[];
          enrollment_type?: string;
          access_duration_days?: number | null;
          status?: string;
          content_schedule?: Json;
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // enrollments
      // -----------------------------------------------------------------------
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          class_id: string;
          type: string; // 'individual' | 'subscription' | 'unlimited'
          expires_at: string | null;
          status: string; // 'active' | 'expired' | 'cancelled'
          enrolled_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          class_id: string;
          type?: string;
          expires_at?: string | null;
          status?: string;
          enrolled_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          class_id?: string;
          type?: string;
          expires_at?: string | null;
          status?: string;
          enrolled_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // communities
      // -----------------------------------------------------------------------
      communities: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          cover_url: string;
          icon_url: string;
          class_ids: string[];
          pinned_post_id: string | null;
          settings: Json; // { allowStudentPosts, requireApproval, allowImages }
          status: string; // 'active' | 'inactive'
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string;
          cover_url?: string;
          icon_url?: string;
          class_ids?: string[];
          pinned_post_id?: string | null;
          settings?: Json;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string;
          cover_url?: string;
          icon_url?: string;
          class_ids?: string[];
          pinned_post_id?: string | null;
          settings?: Json;
          status?: string;
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // community_posts
      // -----------------------------------------------------------------------
      community_posts: {
        Row: {
          id: string;
          community_id: string;
          author_id: string;
          type: string; // 'user' | 'system'
          system_event: Json | null;
          title: string;
          body: string;
          images: string[];
          hashtags: string[];
          mentions: string[];
          likes_count: number;
          comments_count: number;
          liked_by: string[];
          saved_by: string[];
          status: string; // 'published' | 'pending' | 'rejected'
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          author_id: string;
          type?: string;
          system_event?: Json | null;
          title?: string;
          body?: string;
          images?: string[];
          hashtags?: string[];
          mentions?: string[];
          likes_count?: number;
          comments_count?: number;
          liked_by?: string[];
          saved_by?: string[];
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          community_id?: string;
          author_id?: string;
          type?: string;
          system_event?: Json | null;
          title?: string;
          body?: string;
          images?: string[];
          hashtags?: string[];
          mentions?: string[];
          likes_count?: number;
          comments_count?: number;
          liked_by?: string[];
          saved_by?: string[];
          status?: string;
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // post_comments
      // -----------------------------------------------------------------------
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          body: string;
          likes_count: number;
          liked_by: string[];
          parent_comment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          body: string;
          likes_count?: number;
          liked_by?: string[];
          parent_comment_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          body?: string;
          likes_count?: number;
          liked_by?: string[];
          parent_comment_id?: string | null;
        };
      };

      // -----------------------------------------------------------------------
      // notifications
      // -----------------------------------------------------------------------
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          type: string; // 'like' | 'comment' | 'follow' | 'mention' | 'system'
          actor_id: string | null;
          target_id: string;
          target_type: string; // 'post' | 'comment' | 'profile'
          message: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          type: string;
          actor_id?: string | null;
          target_id: string;
          target_type: string;
          message: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          type?: string;
          actor_id?: string | null;
          target_id?: string;
          target_type?: string;
          message?: string;
          read?: boolean;
        };
      };

      // -----------------------------------------------------------------------
      // gamification
      // -----------------------------------------------------------------------
      gamification: {
        Row: {
          id: string;
          student_id: string;
          points: number;
          badges: string[];
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          points?: number;
          badges?: string[];
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          points?: number;
          badges?: string[];
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // missions (replaces achievements)
      // -----------------------------------------------------------------------
      missions: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          condition_type: string;
          condition_action: string | null;
          condition_threshold: number;
          points_reward: number;
          enabled: boolean;
          is_secret: boolean;
          is_default: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          icon?: string;
          condition_type?: string;
          condition_action?: string | null;
          condition_threshold?: number;
          points_reward?: number;
          enabled?: boolean;
          is_secret?: boolean;
          is_default?: boolean;
          sort_order?: number;
        };
        Update: {
          name?: string;
          description?: string;
          icon?: string;
          condition_type?: string;
          condition_action?: string | null;
          condition_threshold?: number;
          points_reward?: number;
          enabled?: boolean;
          is_secret?: boolean;
          sort_order?: number;
        };
      };

      // -----------------------------------------------------------------------
      // student_missions (replaces user_achievements)
      // -----------------------------------------------------------------------
      student_missions: {
        Row: {
          id: string;
          mission_id: string;
          student_id: string;
          progress: number;
          completed: boolean;
          completed_at: string | null;
          granted_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          mission_id: string;
          student_id: string;
          progress?: number;
          completed?: boolean;
          completed_at?: string | null;
          granted_by?: string;
        };
        Update: {
          progress?: number;
          completed?: boolean;
          completed_at?: string | null;
          granted_by?: string;
        };
      };

      // -----------------------------------------------------------------------
      // restrictions
      // -----------------------------------------------------------------------
      restrictions: {
        Row: {
          id: string;
          student_id: string;
          reason: string;
          applied_by: string;
          starts_at: string;
          ends_at: string | null;
          active: boolean;
        };
        Insert: {
          id?: string;
          student_id: string;
          reason: string;
          applied_by: string;
          starts_at?: string;
          ends_at?: string | null;
          active?: boolean;
        };
        Update: {
          id?: string;
          student_id?: string;
          reason?: string;
          applied_by?: string;
          starts_at?: string;
          ends_at?: string | null;
          active?: boolean;
        };
      };

      // -----------------------------------------------------------------------
      // platform_settings (single row, id = 'default')
      // -----------------------------------------------------------------------
      platform_settings: {
        Row: {
          id: string;
          name: string;
          logo_url: string;
          default_theme: string;
          ratings_enabled: boolean;
          certificate_background_url: string;
          certificate_default_text: string;
          theme: Json; // { dark: ThemeColors, light: ThemeColors }
          updated_at: string;
          favicon_url: string | null;
          logo_upload_url: string | null;
          pwa_enabled: boolean;
          pwa_name: string | null;
          pwa_short_name: string | null;
          pwa_icon_url: string | null;
          pwa_theme_color: string | null;
          pwa_background_color: string | null;
        };
        Insert: {
          id?: string;
          name?: string;
          logo_url?: string;
          default_theme?: string;
          ratings_enabled?: boolean;
          certificate_background_url?: string;
          certificate_default_text?: string;
          theme?: Json;
          updated_at?: string;
          favicon_url?: string | null;
          logo_upload_url?: string | null;
          pwa_enabled?: boolean;
          pwa_name?: string | null;
          pwa_short_name?: string | null;
          pwa_icon_url?: string | null;
          pwa_theme_color?: string | null;
          pwa_background_color?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string;
          default_theme?: string;
          ratings_enabled?: boolean;
          certificate_background_url?: string;
          certificate_default_text?: string;
          theme?: Json;
          updated_at?: string;
          favicon_url?: string | null;
          logo_upload_url?: string | null;
          pwa_enabled?: boolean;
          pwa_name?: string | null;
          pwa_short_name?: string | null;
          pwa_icon_url?: string | null;
          pwa_theme_color?: string | null;
          pwa_background_color?: string | null;
        };
      };

      // -----------------------------------------------------------------------
      // access_profiles
      // -----------------------------------------------------------------------
      access_profiles: {
        Row: {
          id: string;
          name: string;
          description: string;
          permissions: Json; // { courses, students, classes, settings, community }
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          permissions?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          permissions?: Json;
        };
      };

      // -----------------------------------------------------------------------
      // sidebar_config
      // -----------------------------------------------------------------------
      sidebar_config: {
        Row: {
          id: string;
          community_id: string;
          emoji: string;
          order: number;
          visible: boolean;
          sales_page_url: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          emoji?: string;
          order?: number;
          visible?: boolean;
          sales_page_url?: string;
        };
        Update: {
          id?: string;
          community_id?: string;
          emoji?: string;
          order?: number;
          visible?: boolean;
          sales_page_url?: string;
        };
      };

      // -----------------------------------------------------------------------
      // lesson_ratings
      // -----------------------------------------------------------------------
      lesson_ratings: {
        Row: {
          id: string;
          lesson_id: string;
          student_id: string;
          rating: string; // 'up' | 'down'
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          student_id: string;
          rating: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          student_id?: string;
          rating?: string;
        };
      };

      // -----------------------------------------------------------------------
      // lesson_notes
      // -----------------------------------------------------------------------
      lesson_notes: {
        Row: {
          id: string;
          lesson_id: string;
          student_id: string;
          content: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          student_id: string;
          content?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          student_id?: string;
          content?: string;
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // certificate_templates
      // -----------------------------------------------------------------------
      certificate_templates: {
        Row: {
          id: string;
          name: string;
          background_url: string;
          background_config: Json; // { fit: "cover"|"contain"|"fill", position: string }
          blocks: Json; // CertificateBlock[]
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          background_url?: string;
          background_config?: Json;
          blocks?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          background_url?: string;
          background_config?: Json;
          blocks?: Json;
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // earned_certificates
      // -----------------------------------------------------------------------
      earned_certificates: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          template_id: string;
          earned_at: string;
          downloaded_at: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_id: string;
          template_id: string;
          earned_at?: string;
          downloaded_at?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          course_id?: string;
          template_id?: string;
          earned_at?: string;
          downloaded_at?: string | null;
        };
      };

      // -----------------------------------------------------------------------
      // quiz_attempts
      // -----------------------------------------------------------------------
      quiz_attempts: {
        Row: {
          id: string;
          student_id: string;
          lesson_id: string;
          answers: Json; // Record<string, string>
          score: number;
          passed: boolean;
          attempted_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          lesson_id: string;
          answers: Json;
          score: number;
          passed: boolean;
          attempted_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          lesson_id?: string;
          answers?: Json;
          score?: number;
          passed?: boolean;
          attempted_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // script_injections
      // -----------------------------------------------------------------------
      script_injections: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          position: string; // 'head' | 'body_start' | 'body_end'
          content: string;
          enabled: boolean;
          apply_to: string; // 'all' | 'admin_only' | 'student_only' | 'specific_pages'
          specific_pages: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          position: string;
          content: string;
          enabled?: boolean;
          apply_to?: string;
          specific_pages?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          position?: string;
          content?: string;
          enabled?: boolean;
          apply_to?: string;
          specific_pages?: string[];
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // nav_menu_items
      // -----------------------------------------------------------------------
      nav_menu_items: {
        Row: {
          id: string;
          label: string;
          url: string | null;
          icon: string | null;
          target: string; // '_self' | '_blank'
          area: string; // 'student' | 'admin'
          is_external: boolean;
          is_default: boolean;
          visible: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          url?: string | null;
          icon?: string | null;
          target?: string;
          area?: string;
          is_external?: boolean;
          is_default?: boolean;
          visible?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          url?: string | null;
          icon?: string | null;
          target?: string;
          area?: string;
          is_external?: boolean;
          is_default?: boolean;
          visible?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // lesson_comments
      // -----------------------------------------------------------------------
      lesson_comments: {
        Row: {
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
        };
        Insert: {
          id?: string;
          lesson_id: string;
          course_id: string;
          author_id: string;
          parent_comment_id?: string | null;
          body: string;
          likes_count?: number;
          liked_by?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          course_id?: string;
          author_id?: string;
          parent_comment_id?: string | null;
          body?: string;
          likes_count?: number;
          liked_by?: string[];
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // last_watched
      // -----------------------------------------------------------------------
      last_watched: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          lesson_id: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_id: string;
          lesson_id: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          course_id?: string;
          lesson_id?: string;
          updated_at?: string;
        };
      };
    };

      // -----------------------------------------------------------------------
      // invite_links
      // -----------------------------------------------------------------------
      invite_links: {
        Row: {
          id: string;
          name: string;
          slug: string;
          class_id: string | null;
          created_by: string | null;
          max_uses: number | null;
          use_count: number;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          class_id?: string | null;
          created_by?: string | null;
          max_uses?: number | null;
          use_count?: number;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          class_id?: string | null;
          created_by?: string | null;
          max_uses?: number | null;
          use_count?: number;
          expires_at?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };

      // -----------------------------------------------------------------------
      // invite_link_uses
      // -----------------------------------------------------------------------
      invite_link_uses: {
        Row: {
          id: string;
          invite_link_id: string;
          student_id: string;
          used_at: string;
        };
        Insert: {
          id?: string;
          invite_link_id: string;
          student_id: string;
          used_at?: string;
        };
        Update: {
          id?: string;
          invite_link_id?: string;
          student_id?: string;
          used_at?: string;
        };
      };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      [_ in never]: never;
    };

    Enums: {
      [_ in never]: never;
    };
  };
}
