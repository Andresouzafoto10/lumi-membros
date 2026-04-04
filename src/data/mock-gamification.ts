import type { GamificationData } from "@/types/student";

/** @deprecated Mock data kept for backwards compat — missions now come from Supabase */
export const BADGES = [] as const;

export const mockGamification: GamificationData[] = [
  {
    studentId: "aluno-001",
    points: 285,
    badges: [],
  },
  {
    studentId: "aluno-002",
    points: 120,
    badges: [],
  },
  {
    studentId: "aluno-003",
    points: 95,
    badges: [],
  },
  {
    studentId: "aluno-004",
    points: 30,
    badges: [],
  },
  {
    studentId: "aluno-005",
    points: 75,
    badges: [],
  },
  {
    studentId: "aluno-006",
    points: 150,
    badges: [],
  },
  {
    studentId: "aluno-007",
    points: 340,
    badges: [],
  },
  {
    studentId: "aluno-008",
    points: 500,
    badges: [],
  },
];
