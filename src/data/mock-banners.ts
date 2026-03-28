import type { CourseBanner } from "@/types/course";

export const mockBanners: CourseBanner[] = [
  {
    id: "banner-1",
    title: "Domine a Fotografia",
    subtitle:
      "Aprenda do zero ao avançado com cursos práticos e aulas em vídeo de alta qualidade.",
    buttonLabel: "Começar agora",
    targetType: "course",
    targetCourseId: "curso-fotografia-iniciante",
    targetUrl: null,
    imageUrl:
      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&q=80",
    isActive: true,
    displayOrder: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "banner-2",
    title: "Novo: Edição no Lightroom",
    subtitle:
      "Transforme suas fotos com técnicas profissionais de edição e presets exclusivos.",
    buttonLabel: "Ver curso",
    targetType: "course",
    targetCourseId: "curso-edicao-lightroom",
    targetUrl: null,
    imageUrl:
      "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200&q=80",
    isActive: true,
    displayOrder: 2,
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];
