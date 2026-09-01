import { Globe, type LucideIcon } from "lucide-react";
import {
  TwitterIcon,
  LinkedinIcon,
  GithubIcon,
  InstagramIcon,
  FacebookIcon,
  YoutubeIcon,
  TiktokIcon,
  ThreadsIcon,
  WhatsappIcon,
  TelegramIcon,
  PinterestIcon,
} from "./SocialIcons";
import type { SocialPlatform } from "@/lib/broker-hub/types";
import type { ComponentType, SVGProps } from "react";

type IconComponent = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;

export const SOCIAL_PLATFORM_META: Record<
  SocialPlatform,
  { label: string; icon: IconComponent }
> = {
  twitter: { label: "X (Twitter)", icon: TwitterIcon },
  linkedin: { label: "LinkedIn", icon: LinkedinIcon },
  github: { label: "GitHub", icon: GithubIcon },
  instagram: { label: "Instagram", icon: InstagramIcon },
  facebook: { label: "Facebook", icon: FacebookIcon },
  youtube: { label: "YouTube", icon: YoutubeIcon },
  tiktok: { label: "TikTok", icon: TiktokIcon },
  threads: { label: "Threads", icon: ThreadsIcon },
  whatsapp: { label: "WhatsApp", icon: WhatsappIcon },
  telegram: { label: "Telegram", icon: TelegramIcon },
  pinterest: { label: "Pinterest", icon: PinterestIcon },
  website: { label: "Website", icon: Globe },
};

export const SOCIAL_PLATFORM_OPTIONS: {
  value: SocialPlatform;
  label: string;
}[] = (Object.keys(SOCIAL_PLATFORM_META) as SocialPlatform[]).map((value) => ({
  value,
  label: SOCIAL_PLATFORM_META[value].label,
}));
