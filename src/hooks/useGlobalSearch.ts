import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface CourseResult {
  id: string;
  title: string;
  sessionTitle: string;
  bannerUrl: string | null;
}

export interface LessonResult {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
}

export interface PostResult {
  id: string;
  title: string;
  body: string;
  communitySlug: string;
  communityName: string;
  authorName: string;
}

export interface GlobalSearchResult {
  courses: CourseResult[];
  lessons: LessonResult[];
  posts: PostResult[];
  loading: boolean;
  total: number;
}

const MIN_QUERY_LEN = 2;
const DEBOUNCE_MS = 300;

const EMPTY: GlobalSearchResult = {
  courses: [],
  lessons: [],
  posts: [],
  loading: false,
  total: 0,
};

/**
 * Global search across courses, lessons and community posts.
 * Debounces input by 300ms and runs queries in parallel.
 */
export function useGlobalSearch(query: string): GlobalSearchResult {
  const [result, setResult] = useState<GlobalSearchResult>(EMPTY);
  const requestIdRef = useRef(0);

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LEN) {
      setResult(EMPTY);
      return;
    }

    const myRequestId = ++requestIdRef.current;
    setResult((prev) => ({ ...prev, loading: true }));

    const timer = setTimeout(async () => {
      const like = `%${trimmed}%`;

      const [coursesRes, lessonsRes, postsRes] = await Promise.all([
        // Courses (with session title)
        supabase
          .from("courses")
          .select("id, title, banner_url, course_sessions(title)")
          .eq("is_active", true)
          .ilike("title", like)
          .limit(5),

        // Lessons (with module + course)
        supabase
          .from("course_lessons")
          .select(
            "id, title, course_modules!inner(title, course_id, courses!inner(id, title, is_active))"
          )
          .eq("is_active", true)
          .or(`title.ilike.${like},description.ilike.${like}`)
          .limit(5),

        // Community posts (with community + author)
        supabase
          .from("community_posts")
          .select(
            "id, title, body, communities!inner(slug, name), profiles!community_posts_author_id_fkey(display_name, name)"
          )
          .eq("status", "published")
          .or(`title.ilike.${like},body.ilike.${like}`)
          .limit(5),
      ]);

      if (myRequestId !== requestIdRef.current) return;

      type CourseRow = {
        id: string;
        title: string;
        banner_url: string | null;
        course_sessions: { title: string } | { title: string }[] | null;
      };
      type LessonRow = {
        id: string;
        title: string;
        course_modules: {
          title: string;
          course_id: string;
          courses: { id: string; title: string; is_active: boolean } | { id: string; title: string; is_active: boolean }[];
        } | {
          title: string;
          course_id: string;
          courses: { id: string; title: string; is_active: boolean } | { id: string; title: string; is_active: boolean }[];
        }[];
      };
      type PostRow = {
        id: string;
        title: string;
        body: string;
        communities: { slug: string; name: string } | { slug: string; name: string }[] | null;
        profiles: { display_name: string | null; name: string | null } | { display_name: string | null; name: string | null }[] | null;
      };

      const first = <T,>(v: T | T[] | null | undefined): T | undefined =>
        Array.isArray(v) ? v[0] : v ?? undefined;

      const courses: CourseResult[] = (coursesRes.data ?? []).map((row: CourseRow) => ({
        id: row.id,
        title: row.title,
        sessionTitle: first(row.course_sessions)?.title ?? "",
        bannerUrl: row.banner_url,
      }));

      const lessons: LessonResult[] = (lessonsRes.data ?? [])
        .map((row: LessonRow) => {
          const mod = first(row.course_modules);
          const course = mod ? first(mod.courses) : undefined;
          if (!course || !course.is_active) return null;
          return {
            id: row.id,
            title: row.title,
            courseId: course.id,
            courseTitle: course.title,
            moduleTitle: mod?.title ?? "",
          };
        })
        .filter((l): l is LessonResult => l !== null);

      const posts: PostResult[] = (postsRes.data ?? []).map((row: PostRow) => {
        const community = first(row.communities);
        const author = first(row.profiles);
        return {
          id: row.id,
          title: row.title || row.body.slice(0, 60),
          body: row.body.length > 80 ? row.body.slice(0, 80) + "…" : row.body,
          communitySlug: community?.slug ?? "",
          communityName: community?.name ?? "",
          authorName: author?.display_name || author?.name || "usuario",
        };
      });

      setResult({
        courses,
        lessons,
        posts,
        loading: false,
        total: courses.length + lessons.length + posts.length,
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed]);

  return useMemo(() => result, [result]);
}
