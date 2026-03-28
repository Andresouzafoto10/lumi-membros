import type { Badge, GamificationData } from "@/types/student";

export const BADGES: Badge[] = [
  {
    id: "badge-primeiro-passo",
    name: "Primeiro Passo",
    description: "Completou a primeira aula.",
    icon: "footprints",
    condition: "Completar 1 aula",
  },
  {
    id: "badge-engajado",
    name: "Engajado",
    description: "Publicou 5 ou mais posts na comunidade.",
    icon: "message-circle",
    condition: "Publicar 5+ posts",
  },
  {
    id: "badge-popular",
    name: "Popular",
    description: "Recebeu 20 ou mais curtidas em posts.",
    icon: "heart",
    condition: "Receber 20+ curtidas",
  },
  {
    id: "badge-maratonista",
    name: "Maratonista",
    description: "Completou 3 ou mais cursos.",
    icon: "trophy",
    condition: "Completar 3+ cursos",
  },
  {
    id: "badge-veterano",
    name: "Veterano",
    description: "Membro da plataforma ha mais de 6 meses.",
    icon: "shield",
    condition: "6+ meses na plataforma",
  },
];

export const mockGamification: GamificationData[] = [
  {
    studentId: "aluno-001",
    points: 285,
    badges: ["badge-primeiro-passo", "badge-engajado", "badge-popular"],
  },
  {
    studentId: "aluno-002",
    points: 120,
    badges: ["badge-primeiro-passo"],
  },
  {
    studentId: "aluno-003",
    points: 95,
    badges: ["badge-primeiro-passo"],
  },
  {
    studentId: "aluno-004",
    points: 30,
    badges: [],
  },
  {
    studentId: "aluno-005",
    points: 75,
    badges: ["badge-primeiro-passo"],
  },
  {
    studentId: "aluno-006",
    points: 150,
    badges: ["badge-primeiro-passo", "badge-veterano"],
  },
  {
    studentId: "aluno-007",
    points: 340,
    badges: ["badge-primeiro-passo", "badge-engajado", "badge-popular", "badge-maratonista"],
  },
  {
    studentId: "aluno-008",
    points: 500,
    badges: ["badge-primeiro-passo", "badge-veterano", "badge-maratonista"],
  },
];
