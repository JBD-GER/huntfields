import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppFooter, AppHeader } from "@/components/ui/app-shell";
import { site, absoluteUrl } from "@/lib/seo/site";
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
        <AppHeader />
        <main className="min-h-dvh">{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}
