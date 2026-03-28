import type { Class } from "@/types/student";

export const mockClasses: Class[] = [
  {
    id: "turma-001",
    name: "Fotografia Iniciante — Turma Jan/2026",
    courseIds: ["curso-fotografia-iniciante"],
    enrollmentType: "individual",
    accessDurationDays: 365,
    status: "active",
    contentSchedule: [],
  },
  {
    id: "turma-002",
    name: "Lightroom Pro — Turma Fev/2026",
    courseIds: ["curso-edicao-lightroom"],
    enrollmentType: "subscription",
    accessDurationDays: 30,
    status: "active",
    contentSchedule: [],
  },
  {
    id: "turma-003",
    name: "Ensaio Externo — Acesso Ilimitado",
    courseIds: ["curso-ensaio-externo"],
    enrollmentType: "unlimited",
    accessDurationDays: null,
    status: "active",
    contentSchedule: [],
  },
];
