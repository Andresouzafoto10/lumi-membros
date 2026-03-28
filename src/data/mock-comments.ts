import type { PostComment } from "@/types/student";

export const mockComments: PostComment[] = [
  // ---- Comments on post-001 (boas-vindas) ----
  {
    id: "comment-001",
    postId: "post-001",
    authorId: "aluno-001",
    body: "Obrigada pelas regras! Ansiosa para compartilhar minhas fotos aqui.",
    likesCount: 2,
    likedBy: ["aluno-002", "aluno-008"],
    parentCommentId: null,
    createdAt: "2025-12-02T11:00:00Z",
  },
  {
    id: "comment-002",
    postId: "post-001",
    authorId: "aluno-002",
    body: "Boa! Vamos trocar muita ideia aqui.",
    likesCount: 1,
    likedBy: ["aluno-001"],
    parentCommentId: null,
    createdAt: "2025-12-02T12:30:00Z",
  },

  // ---- Comments on post-002 (regra dos tercos) ----
  {
    id: "comment-003",
    postId: "post-002",
    authorId: "aluno-002",
    body: "Ficou otimo, Ana! A composicao esta bem equilibrada. Tenta abaixar um pouco a linha do horizonte na proxima.",
    likesCount: 3,
    likedBy: ["aluno-001", "aluno-005", "aluno-007"],
    parentCommentId: null,
    createdAt: "2025-12-20T15:00:00Z",
  },
  {
    id: "comment-004",
    postId: "post-002",
    authorId: "aluno-001",
    body: "Obrigada @bruno.carvalho! Vou testar isso no proximo ensaio.",
    likesCount: 1,
    likedBy: ["aluno-002"],
    parentCommentId: "comment-003",
    createdAt: "2025-12-20T15:30:00Z",
  },
  {
    id: "comment-005",
    postId: "post-002",
    authorId: "aluno-007",
    body: "Linda foto! Adorei as cores.",
    likesCount: 1,
    likedBy: ["aluno-001"],
    parentCommentId: null,
    createdAt: "2025-12-20T16:00:00Z",
  },

  // ---- Comments on post-003 (duvida ISO) ----
  {
    id: "comment-006",
    postId: "post-003",
    authorId: "aluno-001",
    body: "Eu entendi sim! A dica e pensar assim: ISO alto = mais luz mas mais ruido. Abertura grande (f/1.8) = mais luz e fundo desfocado.",
    likesCount: 3,
    likedBy: ["aluno-002", "aluno-003", "aluno-005"],
    parentCommentId: null,
    createdAt: "2026-01-05T10:00:00Z",
  },
  {
    id: "comment-007",
    postId: "post-003",
    authorId: "aluno-002",
    body: "Muito obrigado! Agora fez sentido. Vou rever a aula com essa perspectiva.",
    likesCount: 1,
    likedBy: ["aluno-001"],
    parentCommentId: "comment-006",
    createdAt: "2026-01-05T10:30:00Z",
  },

  // ---- Comments on post-004 (foto fim de semana) ----
  {
    id: "comment-008",
    postId: "post-004",
    authorId: "aluno-001",
    body: "O desfoque ficou muito bom! Qual abertura voce usou?",
    likesCount: 1,
    likedBy: ["aluno-005"],
    parentCommentId: null,
    createdAt: "2026-01-15T19:00:00Z",
  },

  // ---- Comments on post-005 (ensaio urbano) ----
  {
    id: "comment-009",
    postId: "post-005",
    authorId: "aluno-001",
    body: "Gabriela, ficou INCRIVEL! A luz da golden hour fez toda a diferenca. Parabens!",
    likesCount: 2,
    likedBy: ["aluno-007", "aluno-005"],
    parentCommentId: null,
    createdAt: "2026-02-10T17:00:00Z",
  },
  {
    id: "comment-010",
    postId: "post-005",
    authorId: "aluno-008",
    body: "Excelente trabalho! A composicao e o enquadramento estao otimos. Continue assim!",
    likesCount: 3,
    likedBy: ["aluno-007", "aluno-001", "aluno-002"],
    parentCommentId: null,
    createdAt: "2026-02-10T18:00:00Z",
  },
  {
    id: "comment-011",
    postId: "post-005",
    authorId: "aluno-007",
    body: "Obrigada pessoal! Vou continuar praticando e postando aqui.",
    likesCount: 1,
    likedBy: ["aluno-001"],
    parentCommentId: "comment-009",
    createdAt: "2026-02-10T19:00:00Z",
  },

  // ---- Comments on post-008 (antes/depois LR) ----
  {
    id: "comment-012",
    postId: "post-008",
    authorId: "aluno-005",
    body: "O tom de pele ficou natural! So tomaria cuidado com a saturacao nos tons quentes.",
    likesCount: 1,
    likedBy: ["aluno-001"],
    parentCommentId: null,
    createdAt: "2026-02-20T16:00:00Z",
  },

  // ---- Comments on post-009 (presets paisagem) ----
  {
    id: "comment-013",
    postId: "post-009",
    authorId: "aluno-001",
    body: "Eu ajustei o preset do curso com +10 na temperatura e ficou mais quente. Testa!",
    likesCount: 1,
    likedBy: ["aluno-005"],
    parentCommentId: null,
    createdAt: "2026-03-05T11:00:00Z",
  },

  // ---- Comments on post-010 (locacao Curitiba) ----
  {
    id: "comment-014",
    postId: "post-010",
    authorId: "aluno-007",
    body: "Que lindo! Preciso visitar Curitiba so para fotografar nesse jardim.",
    likesCount: 2,
    likedBy: ["aluno-003", "aluno-001"],
    parentCommentId: null,
    createdAt: "2026-02-25T09:00:00Z",
  },
  {
    id: "comment-015",
    postId: "post-010",
    authorId: "aluno-003",
    body: "Se vier, me avisa! Posso te guiar pelos melhores pontos.",
    likesCount: 2,
    likedBy: ["aluno-007", "aluno-001"],
    parentCommentId: "comment-014",
    createdAt: "2026-02-25T09:30:00Z",
  },

  // ---- Comments on post-011 (ensaio praia) ----
  {
    id: "comment-016",
    postId: "post-011",
    authorId: "aluno-003",
    body: "LINDAS! O vento realmente deu um efeito incrivel. Amei a segunda foto!",
    likesCount: 2,
    likedBy: ["aluno-007", "aluno-001"],
    parentCommentId: null,
    createdAt: "2026-03-10T18:00:00Z",
  },
  {
    id: "comment-017",
    postId: "post-011",
    authorId: "aluno-001",
    body: "Jurere e perfeito pra ensaio! As cores do por do sol ficaram fantasticas.",
    likesCount: 1,
    likedBy: ["aluno-007"],
    parentCommentId: null,
    createdAt: "2026-03-10T18:30:00Z",
  },
];
