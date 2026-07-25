import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/seo/JsonLd";
import { SuperAdminAccountFab } from "@/components/superadmin/SuperAdminAccountFab";
import { SuperAdminViewProvider } from "@/components/superadmin/SuperAdminViewProvider";
import { SiteSpellcheck } from "@/components/ui/SiteSpellcheck";
import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/seo/site";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [...SITE_KEYWORDS],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "services",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: siteUrl,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('zovit-theme');document.documentElement.dataset.theme=t==='light'?'light':'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-CL"
      spellCheck
      data-theme="dark"
      suppressHydrationWarning
      className={`${outfit.variable} ${dmSans.variable}`}
    >
      <body spellCheck lang="es-CL">
        <Script id="zovit-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <JsonLd />
        <SiteSpellcheck />
        <AuthProvider>
          <SuperAdminViewProvider>
            <Header />
            {children}
            <SuperAdminAccountFab />
          </SuperAdminViewProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
