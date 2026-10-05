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

function crmApiOrigin(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_CRM_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "https://finconnex.payperless.app";
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE_NAME)?.value);
  const crmOrigin = crmApiOrigin();

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased ${theme}`}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <head>
        {crmOrigin ? (
          <>
            {/* Open the connection to the CRM before the first API call. */}
            <link rel="preconnect" href={crmOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={crmOrigin} />
          </>
        ) : null}
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
