import type { StudentRestriction } from "@/types/student";

export const mockRestrictions: StudentRestriction[] = [
  {
    id: "restriction-001",
    studentId: "aluno-004",
    reason: "Publicou conteudo ofensivo e desrespeitoso com outros alunos na comunidade.",
    appliedBy: "aluno-008",
    startsAt: "2026-03-15T00:00:00Z",
    endsAt: "2026-04-15T00:00:00Z",
    active: true,
  },
  {
    id: "restriction-002",
    studentId: "aluno-006",
    reason: "Spam de links externos nao autorizados.",
    appliedBy: "aluno-008",
    startsAt: "2025-11-01T00:00:00Z",
    endsAt: "2025-11-08T00:00:00Z",
    active: false,
  },
];
