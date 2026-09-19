import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var A="bis_skin_checked";function s(n){if(!n)return;if(n.nodeType===1&&n.removeAttribute)n.removeAttribute(A);if(!n.querySelectorAll)return;var l=n.querySelectorAll("["+A+"]");for(var i=0;i<l.length;i++)l[i].removeAttribute(A);}s(document.documentElement);})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Script src="/strip-bis-skin.js" strategy="beforeInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
