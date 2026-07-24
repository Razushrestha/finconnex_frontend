import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased `}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Toaster />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
