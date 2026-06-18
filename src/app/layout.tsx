import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AppFooter, AppHeader } from "@/components/ui/app-shell";
import { CookieConsentBanner } from "@/components/privacy/cookie-consent";
import {
  absoluteUrl,
  organizationStructuredData,
  site,
  websiteStructuredData,
} from "@/lib/seo/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: `${site.name} | Hunting land access marketplace`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: site.keywords,
  authors: [{ name: site.name, url: absoluteUrl("/") }],
  creator: site.name,
  publisher: site.name,
  category: "marketplace",
  alternates: {
    canonical: absoluteUrl("/"),
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
  openGraph: {
    type: "website",
    locale: "en_US",
    url: absoluteUrl("/"),
    siteName: site.name,
    title: `${site.name} | Hunting land access marketplace`,
    description: site.description,
    images: [
      {
        url: absoluteUrl(site.defaultImage),
        width: 1200,
        height: 630,
        alt: `${site.name} hunting lease marketplace`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} | Hunting land access marketplace`,
    description: site.description,
    images: [absoluteUrl(site.defaultImage)],
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#fbfaf6] text-stone-950">
        <Script id="huntfields-consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'denied',
              wait_for_update: 500
            });
            try {
              var stored = localStorage.getItem('huntfields_cookie_consent_v1');
              if (stored) {
                var consent = JSON.parse(stored);
                gtag('consent', 'update', {
                  ad_storage: consent.ad_storage || 'denied',
                  ad_user_data: consent.ad_user_data || 'denied',
                  ad_personalization: consent.ad_personalization || 'denied',
                  analytics_storage: consent.analytics_storage || 'denied'
                });
              }
            } catch (error) {}
          `}
        </Script>
        <AppHeader />
        <main className="min-h-dvh">{children}</main>
        <AppFooter />
        <CookieConsentBanner />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              websiteStructuredData(),
              organizationStructuredData(),
            ]),
          }}
        />
      </body>
    </html>
  );
}
