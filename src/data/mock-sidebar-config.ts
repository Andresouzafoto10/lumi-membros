import type { CommunitySidebarItem } from "@/types/student";

export const mockSidebarConfig: CommunitySidebarItem[] = [
  {
    id: "sidebar-001",
    communityId: "community-001",
    emoji: "📸",
    order: 0,
    visible: true,
    salesPageUrl: "",
  },
  {
    id: "sidebar-002",
    communityId: "community-002",
    emoji: "🎨",
    order: 1,
    visible: true,
    salesPageUrl: "",
  },
  {
    id: "sidebar-003",
    communityId: "community-003",
    emoji: "🌿",
    order: 2,
    visible: true,
    salesPageUrl: "https://exemplo.com/ensaio-externo",
  },
];
