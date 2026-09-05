import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import {
  parseTheme,
  THEME_COOKIE_NAME,
} from "@/components/theme/theme-cookie";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "FinConnex: Multi-tenant CRM",
  description:
    "Manage sales, finance, and customer relationships across your organization.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE_NAME)?.value);

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased ${theme}`}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Toaster />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
