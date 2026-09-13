import type { Metadata } from "next";
import { PlatformUsers } from "@/components/platform/PlatformUsers";

export const metadata: Metadata = {
  title: "Users · Platform · FinConnex",
};

export default function PlatformUsersPage() {
  return <PlatformUsers />;
}
