import type { Community } from "@/types/student";

export const mockCommunities: Community[] = [
  {
    id: "community-001",
    slug: "fotografia-iniciante",
    name: "Fotografia Iniciante",
    description:
      "Comunidade para alunos do curso de Fotografia Iniciante. Compartilhe suas fotos, tire duvidas e troque experiencias!",
    coverUrl: "https://picsum.photos/seed/comm-foto/1200/400",
    iconUrl: "https://picsum.photos/seed/comm-foto-icon/100/100",
    classIds: ["turma-001"],
    pinnedPostId: "post-001",
    settings: {
      allowStudentPosts: true,
      requireApproval: false,
      allowImages: true,
    },
    status: "active",
    createdAt: "2025-12-01T00:00:00Z",
  },
  {
    id: "community-002",
    slug: "lightroom-pro",
    name: "Lightroom Pro",
    description:
      "Espaco exclusivo para alunos de edicao no Lightroom. Poste seus antes/depois e receba feedback da turma.",
    coverUrl: "https://picsum.photos/seed/comm-lr/1200/400",
    iconUrl: "https://picsum.photos/seed/comm-lr-icon/100/100",
    classIds: ["turma-002"],
    pinnedPostId: null,
    settings: {
      allowStudentPosts: true,
      requireApproval: false,
      allowImages: true,
    },
    status: "active",
    createdAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "community-003",
    slug: "ensaio-externo",
    name: "Ensaio Externo",
    description:
      "Comunidade para alunos de ensaio fotografico externo. Compartilhe locacoes, dicas de iluminacao natural e seus melhores cliques!",
    coverUrl: "https://picsum.photos/seed/comm-ensaio/1200/400",
    iconUrl: "https://picsum.photos/seed/comm-ensaio-icon/100/100",
    classIds: ["turma-003"],
    pinnedPostId: null,
    settings: {
      allowStudentPosts: true,
      requireApproval: true,
      allowImages: true,
    },
    status: "active",
    createdAt: "2026-01-20T00:00:00Z",
  },
];
