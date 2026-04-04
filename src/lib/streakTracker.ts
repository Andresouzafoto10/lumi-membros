/**
 * Track daily login streaks per student using localStorage.
 * Returns whether to award streak badges (7-day, 30-day).
 */
export function recordLoginStreak(userId: string): {
  streak: number;
  awardStreak7: boolean;
  awardStreak30: boolean;
} {
  const key = `lumi-streak:${userId}`;
  const stored = JSON.parse(
    localStorage.getItem(key) ?? '{"streak":0,"lastDate":""}'
  );

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (stored.lastDate === today) {
    return { streak: stored.streak, awardStreak7: false, awardStreak30: false };
  }

  const newStreak = stored.lastDate === yesterday ? stored.streak + 1 : 1;
  localStorage.setItem(key, JSON.stringify({ streak: newStreak, lastDate: today }));

  return {
    streak: newStreak,
    awardStreak7: newStreak === 7,
    awardStreak30: newStreak === 30,
  };
}
