import type { Course } from "@/types/course";

export const mockCourses: Course[] = [
  {
    id: "curso-fotografia-iniciante",
    title: "Fotografia para Iniciantes",
    description:
      "Aprenda os fundamentos da fotografia digital: composição, iluminação, câmera e edição básica. Do zero ao seu primeiro ensaio profissional.",
    bannerUrl:
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80",
    order: 1,
    isActive: true,
    access: { mode: "all" },
    modules: [
      {
        id: "mod-intro-foto",
        title: "Introdução à Fotografia",
        order: 1,
        isActive: true,
        lessons: [
          {
            id: "aula-1-1",
            title: "Bem-vindo ao curso",
            order: 1,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Nesta aula de boas-vindas, você vai conhecer o que será abordado ao longo do curso e como aproveitar ao máximo cada módulo.",
          },
          {
            id: "aula-1-2",
            title: "Entendendo sua câmera",
            order: 2,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Conheça os principais controles da sua câmera: ISO, abertura, velocidade do obturador e balanço de branco.",
            links: [
              {
                label: "Guia de referência rápida",
                url: "https://example.com/guia-camera",
              },
            ],
          },
          {
            id: "aula-1-3",
            title: "Modos de disparo",
            order: 3,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Auto, Prioridade de Abertura, Prioridade de Velocidade e Manual — quando usar cada um.",
            quiz: [
              {
                id: "q1-1-3-a",
                type: "multiple_choice",
                question: "Qual modo de disparo dá controle total sobre abertura e velocidade?",
                options: [
                  { id: "q1a", text: "Auto" },
                  { id: "q1b", text: "Prioridade de Abertura" },
                  { id: "q1c", text: "Manual" },
                  { id: "q1d", text: "Prioridade de Velocidade" },
                ],
                correctOptionId: "q1c",
              },
              {
                id: "q1-1-3-b",
                type: "multiple_choice",
                question: "No modo Prioridade de Abertura, o que o fotógrafo controla?",
                options: [
                  { id: "q2a", text: "Velocidade do obturador" },
                  { id: "q2b", text: "Abertura do diafragma" },
                  { id: "q2c", text: "ISO automático" },
                ],
                correctOptionId: "q2b",
              },
              {
                id: "q1-1-3-c",
                type: "true_false",
                question: "O modo Auto é recomendado para situações de iluminação complexa.",
                options: [
                  { id: "q3a", text: "Verdadeiro" },
                  { id: "q3b", text: "Falso" },
                ],
                correctOptionId: "q3b",
              },
            ],
            quizPassingScore: 70,
            quizRequiredToAdvance: true,
          },
        ],
      },
      {
        id: "mod-composicao",
        title: "Composição e Enquadramento",
        order: 2,
        isActive: true,
        lessons: [
          {
            id: "aula-2-1",
            title: "Regra dos terços",
            order: 1,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "A técnica mais fundamental de composição fotográfica. Aprenda a posicionar o sujeito nos pontos de interesse.",
          },
          {
            id: "aula-2-2",
            title: "Linhas guia e simetria",
            order: 2,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Use linhas naturais da cena para guiar o olhar do espectador e criar composições impactantes.",
          },
          {
            id: "aula-2-3",
            title: "Exercício prático",
            order: 3,
            isActive: true,
            ratingsEnabled: true,
            videoType: "none",
            videoUrl: null,
            description:
              "Saia com sua câmera e pratique as técnicas de composição aprendidas. Tire 10 fotos usando regra dos terços e 10 usando linhas guia.",
            files: [
              { name: "checklist-composicao.pdf", sizeLabel: "245 KB" },
            ],
            quiz: [
              {
                id: "q2-2-3-a",
                type: "true_false",
                question: "A regra dos terços divide a imagem em 9 partes iguais.",
                options: [
                  { id: "q4a", text: "Verdadeiro" },
                  { id: "q4b", text: "Falso" },
                ],
                correctOptionId: "q4a",
              },
              {
                id: "q2-2-3-b",
                type: "true_false",
                question: "Linhas guia devem sempre ser horizontais para ter efeito.",
                options: [
                  { id: "q5a", text: "Verdadeiro" },
                  { id: "q5b", text: "Falso" },
                ],
                correctOptionId: "q5b",
              },
            ],
            quizPassingScore: 70,
            quizRequiredToAdvance: false,
          },
        ],
      },
    ],
  },
  {
    id: "curso-edicao-lightroom",
    title: "Edição Profissional no Lightroom",
    description:
      "Domine o Adobe Lightroom Classic: fluxo de trabalho, revelação RAW, presets e exportação para diferentes mídias.",
    bannerUrl:
      "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80",
    order: 2,
    isActive: true,
    access: { mode: "all" },
    modules: [
      {
        id: "mod-lr-basico",
        title: "Primeiros passos no Lightroom",
        order: 1,
        isActive: true,
        lessons: [
          {
            id: "aula-lr-1-1",
            title: "Importação e organização",
            order: 1,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Como importar fotos, criar catálogos, usar coleções e palavras-chave para manter tudo organizado.",
          },
          {
            id: "aula-lr-1-2",
            title: "Painel básico de revelação",
            order: 2,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Exposição, contraste, highlights, shadows, whites, blacks — entenda cada slider.",
          },
          {
            id: "aula-lr-1-3",
            title: "Perfis e calibração",
            order: 3,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Escolha o perfil de cor certo e calibre para resultados consistentes.",
          },
        ],
      },
      {
        id: "mod-lr-avancado",
        title: "Técnicas Avançadas",
        order: 2,
        isActive: true,
        lessons: [
          {
            id: "aula-lr-2-1",
            title: "Máscaras e ajustes locais",
            order: 1,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Use máscaras lineares, radiais e de pincel para ajustes seletivos em áreas específicas da foto.",
          },
          {
            id: "aula-lr-2-2",
            title: "Criando presets profissionais",
            order: 2,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Crie seus próprios presets e agilize seu fluxo de edição.",
            materials: [
              {
                id: "mat-presets",
                type: "url" as const,
                title: "Pack de Presets Exemplo",
                url: "https://example.com/presets-pack",
              },
            ],
          },
          {
            id: "aula-lr-2-3",
            title: "Exportação para web e impressão",
            order: 3,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Configurações ideais de exportação para Instagram, portfólio online e impressão em alta qualidade.",
          },
        ],
      },
    ],
  },
  {
    id: "curso-ensaio-externo",
    title: "Ensaio Fotográfico Externo",
    description:
      "Aprenda a planejar, executar e entregar ensaios fotográficos em locações externas com luz natural.",
    bannerUrl:
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    order: 3,
    isActive: true,
    access: { mode: "plans", plans: ["pro", "max"] },
    modules: [
      {
        id: "mod-planejamento",
        title: "Planejamento do Ensaio",
        order: 1,
        isActive: true,
        lessons: [
          {
            id: "aula-ext-1-1",
            title: "Briefing com o cliente",
            order: 1,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Como conduzir uma conversa de briefing eficiente para alinhar expectativas, estilo e locação.",
          },
          {
            id: "aula-ext-1-2",
            title: "Escolha da locação",
            order: 2,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Critérios para escolher locações: luz, fundo, acessibilidade e permissões necessárias.",
          },
          {
            id: "aula-ext-1-3",
            title: "Equipamento essencial",
            order: 3,
            isActive: true,
            ratingsEnabled: true,
            videoType: "none",
            videoUrl: null,
            description:
              "Lista completa de equipamentos para ensaios externos: câmera, lentes, refletor, flash portátil e acessórios.",
          },
        ],
      },
      {
        id: "mod-execucao",
        title: "Execução e Direção",
        order: 2,
        isActive: true,
        lessons: [
          {
            id: "aula-ext-2-1",
            title: "Direção de modelo",
            order: 1,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Técnicas para dirigir modelos não profissionais e extrair expressões naturais.",
          },
          {
            id: "aula-ext-2-2",
            title: "Aproveitando a luz natural",
            order: 2,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Golden hour, blue hour, luz dura e luz difusa — como usar cada tipo de luz natural.",
          },
          {
            id: "aula-ext-2-3",
            title: "Entrega e pós-produção",
            order: 3,
            isActive: true,
            ratingsEnabled: true,
            videoType: "youtube",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            description:
              "Fluxo completo de seleção, edição e entrega das fotos ao cliente.",
          },
        ],
      },
    ],
  },
];
