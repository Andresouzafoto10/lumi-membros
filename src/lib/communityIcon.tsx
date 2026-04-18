import {
  Camera, Image, Users, MessageCircle, Heart, Star, Trophy, Zap,
  BookOpen, Music, Globe, Palette, Code, Dumbbell, Coffee, Flame,
  Diamond, Crown, Rocket, Target, Shield, Leaf, Sun, Moon,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { getProxiedImageUrl } from "@/lib/imageProxy";

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Camera, Image, Users, MessageCircle, Heart, Star, Trophy, Zap,
  BookOpen, Music, Globe, Palette, Code, Dumbbell, Coffee, Flame,
  Diamond, Crown, Rocket, Target, Shield, Leaf, Sun, Moon,
};

export const AVAILABLE_LUCIDE_ICONS = Object.keys(LUCIDE_ICON_MAP);

export const AVAILABLE_EMOJIS = [
  "📸", "🎨", "🎯", "🏆", "🌟", "💡", "🔥", "🎓", "💬", "🤝",
  "🌍", "🎵", "🏋️", "💻", "📚", "🎭", "🌈", "🚀", "⚡", "🎪",
  "🦁", "🌸", "🍀", "🎲", "🏄", "🎸", "🎬", "🧠", "💎", "🌙",
];

export type CommunityIconType = "emoji" | "lucide" | "image" | "fallback";

export function detectIconType(iconUrl: string | null | undefined): CommunityIconType {
  if (!iconUrl) return "fallback";
  if (iconUrl.startsWith("icon:")) return "lucide";
  if (iconUrl.startsWith("http")) return "image";
  // treat short non-http strings as emoji
  return "emoji";
}

export function renderCommunityIcon(
  iconUrl: string | null | undefined,
  size: number = 20,
) {
  const type = detectIconType(iconUrl);

  switch (type) {
    case "emoji":
      return <span style={{ fontSize: size }}>{iconUrl}</span>;
    case "lucide": {
      const name = iconUrl!.replace("icon:", "");
      const Icon = LUCIDE_ICON_MAP[name] ?? MessageSquare;
      return <Icon style={{ width: size, height: size }} />;
    }
    case "image":
      return (
        <img
          src={getProxiedImageUrl(iconUrl!)}
          alt=""
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      );
    default:
      return <MessageSquare style={{ width: size, height: size }} />;
  }
}

export function getLucideIcon(name: string): LucideIcon {
  return LUCIDE_ICON_MAP[name] ?? MessageSquare;
}
