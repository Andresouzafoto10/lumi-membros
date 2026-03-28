import type { CourseSession } from "@/types/course";
import { mockCourses } from "./mock-courses";

export const mockSessions: CourseSession[] = [
  {
    id: "sessao-destaques",
    title: "Em Destaque",
    description: "Os cursos mais populares da plataforma",
    isActive: true,
    order: 1,
    courses: [mockCourses[0], mockCourses[1]],
  },
  {
    id: "sessao-iniciantes",
    title: "Começar do Zero",
    description: "Ideal para quem está começando na fotografia",
    isActive: true,
    order: 2,
    courses: [mockCourses[0], mockCourses[2]],
  },
];
