import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "lumi-membros:lesson-ratings";

/**
 * Rating per lesson: "like" | "dislike" | null (no vote).
 * Stored as Record<lessonId, "like" | "dislike">.
 */
type RatingValue = "like" | "dislike";
type RatingsMap = Record<string, RatingValue>;

let cached: RatingsMap = load();
const listeners = new Set<() => void>();

function load(): RatingsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(value: RatingsMap) {
  cached = value;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return cached;
}

export function useLessonRatings() {
  const ratings = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setRating = useCallback(
    (lessonId: string, rating: RatingValue | null) => {
      const next = { ...cached };
      if (rating === null) {
        delete next[lessonId];
      } else {
        next[lessonId] = rating;
      }
      save(next);
    },
    []
  );

  const getRating = useCallback(
    (lessonId: string): RatingValue | null => {
      return ratings[lessonId] ?? null;
    },
    [ratings]
  );

  return { ratings, getRating, setRating };
}

/**
 * Utility to compute aggregated rating counts for a list of lesson IDs.
 * Useful for admin views.
 */
export function getLessonRatingCounts(lessonId: string): {
  likes: number;
  dislikes: number;
} {
  // In a real app this would come from a backend.
  // For now, since we only have one user (localStorage), counts are 0 or 1.
  const ratings = load();
  const rating = ratings[lessonId];
  return {
    likes: rating === "like" ? 1 : 0,
    dislikes: rating === "dislike" ? 1 : 0,
  };
}

/**
 * Returns all ratings map (for admin usage).
 */
export function getAllLessonRatings(): RatingsMap {
  return load();
}
