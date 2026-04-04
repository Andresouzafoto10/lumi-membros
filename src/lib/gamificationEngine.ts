import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Award points for an action (reads config from DB)
// ---------------------------------------------------------------------------

export async function awardPoints(
  studentId: string,
  actionType: string,
  referenceId?: string
): Promise<number> {
  // 1. Look up action in points_config
  const { data: config } = await supabase
    .from("points_config")
    .select("points, max_times, enabled")
    .eq("action_type", actionType)
    .single();

  if (!config) return 0;
  if (config.enabled === false) return 0;

  const points = config.points as number;
  if (points <= 0) return 0;

  // 2. Check daily limit if applicable
  if (config.max_times) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("points_log")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("action_type", actionType)
      .gte("created_at", todayStart.toISOString());
    if ((count ?? 0) >= (config.max_times as number)) return 0;
  }

  // 3. Log the transaction
  await supabase.from("points_log").insert({
    student_id: studentId,
    action_type: actionType,
    points,
    reference_id: referenceId ?? null,
  });

  // 4. Update total points in gamification
  const { data: gam } = await supabase
    .from("gamification")
    .select("points")
    .eq("student_id", studentId)
    .maybeSingle();

  const currentPoints = (gam?.points as number) ?? 0;
  const newTotal = currentPoints + points;

  // 5. Recalculate level
  const { data: levels } = await supabase
    .from("levels")
    .select("level_number, points_required")
    .order("points_required", { ascending: false });

  const newLevel =
    (levels ?? []).find((l) => newTotal >= (l.points_required as number))?.level_number as number ?? 1;

  await supabase.from("gamification").upsert(
    {
      student_id: studentId,
      points: newTotal,
      current_level: newLevel,
    },
    { onConflict: "student_id" }
  );

  // 6. Check missions (unified system)
  await checkMissions(studentId, newTotal, actionType);

  return points;
}

// ---------------------------------------------------------------------------
// Check missions — unified system replacing old achievements + badges
// ---------------------------------------------------------------------------

async function checkMissions(
  studentId: string,
  totalPoints: number,
  lastActionType?: string
): Promise<void> {
  // Get all enabled missions
  const { data: missions } = await supabase
    .from("missions")
    .select("*")
    .eq("enabled", true);

  if (!missions || missions.length === 0) return;

  // Get already completed missions for this student
  const { data: studentMissions } = await supabase
    .from("student_missions")
    .select("mission_id, completed")
    .eq("student_id", studentId);

  const completedSet = new Set(
    (studentMissions ?? [])
      .filter((sm) => sm.completed)
      .map((sm) => sm.mission_id as string)
  );

  for (const mission of missions) {
    const missionId = mission.id as string;
    if (completedSet.has(missionId)) continue;

    let progress = 0;
    const conditionType = mission.condition_type as string;
    const conditionAction = mission.condition_action as string | null;
    const threshold = mission.condition_threshold as number;

    switch (conditionType) {
      case "action_count": {
        if (!conditionAction) break;
        const { count } = await supabase
          .from("points_log")
          .select("*", { count: "exact", head: true })
          .eq("student_id", studentId)
          .eq("action_type", conditionAction);
        progress = count ?? 0;
        break;
      }

      case "lesson_complete": {
        const { count } = await supabase
          .from("lesson_progress")
          .select("*", { count: "exact", head: true })
          .eq("student_id", studentId)
          .eq("completed", true);
        progress = count ?? 0;
        break;
      }

      case "course_complete": {
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("course_id")
          .eq("student_id", studentId)
          .eq("completed", true);
        const uniqueCourses = new Set(
          (progressData ?? []).map((p) => p.course_id as string)
        );
        progress = uniqueCourses.size;
        break;
      }

      case "points_total": {
        progress = totalPoints;
        break;
      }

      case "streak_days": {
        // Read from localStorage-synced streak data via points_log
        const streakKey = `lumi-streak:${studentId}`;
        try {
          const stored = JSON.parse(
            localStorage.getItem(streakKey) ?? '{"streak":0}'
          );
          progress = stored.streak ?? 0;
        } catch {
          progress = 0;
        }
        break;
      }

      // manual missions are only granted by admin, skip auto-check
      case "manual":
        continue;
    }

    // Upsert progress
    await supabase.from("student_missions").upsert(
      {
        mission_id: missionId,
        student_id: studentId,
        progress: Math.min(progress, threshold),
        completed: progress >= threshold,
        completed_at: progress >= threshold ? new Date().toISOString() : null,
        granted_by: "system",
      },
      { onConflict: "mission_id,student_id" }
    );

    // If just completed, award bonus points and notify
    if (progress >= threshold && !completedSet.has(missionId)) {
      const pointsReward = mission.points_reward as number;

      // Also add to legacy gamification.badges array for backwards compat
      const { data: gamBadges } = await supabase
        .from("gamification")
        .select("badges")
        .eq("student_id", studentId)
        .maybeSingle();
      const currentBadges: string[] = (gamBadges?.badges as string[]) ?? [];
      if (!currentBadges.includes(missionId)) {
        await supabase.from("gamification").upsert(
          { student_id: studentId, badges: [...currentBadges, missionId] },
          { onConflict: "student_id" }
        );
      }

      // Award bonus points if configured (avoid infinite loop — don't re-check missions)
      if (pointsReward > 0) {
        await supabase.from("points_log").insert({
          student_id: studentId,
          action_type: "mission_complete",
          points: pointsReward,
          reference_id: missionId,
        });

        const { data: gam } = await supabase
          .from("gamification")
          .select("points")
          .eq("student_id", studentId)
          .maybeSingle();
        const currentPts = (gam?.points as number) ?? 0;
        await supabase.from("gamification").upsert(
          { student_id: studentId, points: currentPts + pointsReward },
          { onConflict: "student_id" }
        );
      }

      // Notify
      await supabase.from("notifications").insert({
        recipient_id: studentId,
        type: "system",
        actor_id: null,
        target_id: studentId,
        target_type: "profile",
        message: `${mission.icon} Missão concluída: "${mission.name}"!`,
        read: false,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience functions called by hooks
// ---------------------------------------------------------------------------

export async function onLessonCompleted(studentId: string): Promise<void> {
  await awardPoints(studentId, "complete_lesson");
}

export async function onPostLiked(postAuthorId: string): Promise<void> {
  await awardPoints(postAuthorId, "like_post");
}

export async function onPostCreated(authorId: string): Promise<void> {
  await awardPoints(authorId, "create_post");
}

export async function onCommentCreated(authorId: string): Promise<void> {
  await awardPoints(authorId, "comment");
}

export async function onCertificateEarned(studentId: string): Promise<void> {
  await awardPoints(studentId, "earn_certificate");
}

export async function onLessonRated(studentId: string, lessonId?: string): Promise<void> {
  await awardPoints(studentId, "rate_lesson", lessonId);
}

export async function onLessonNotes(studentId: string, lessonId?: string): Promise<void> {
  await awardPoints(studentId, "lesson_notes", lessonId);
}

export async function onPollAnswered(studentId: string, postId?: string): Promise<void> {
  await awardPoints(studentId, "poll_answered", postId);
}

export async function onCommentLiked(commentAuthorId: string, commentId?: string): Promise<void> {
  await awardPoints(commentAuthorId, "like_comment", commentId);
}

export async function onDailyLogin(studentId: string): Promise<void> {
  await awardPoints(studentId, "daily_login");
}

export async function onProfileComplete(studentId: string): Promise<void> {
  await awardPoints(studentId, "profile_complete");
}

export async function onFirstPost(studentId: string, postId?: string): Promise<void> {
  await awardPoints(studentId, "first_post", postId);
}

export async function onStreak7Days(studentId: string): Promise<void> {
  await awardPoints(studentId, "streak_7days");
}

export async function onStreak30Days(studentId: string): Promise<void> {
  await awardPoints(studentId, "streak_30days");
}
