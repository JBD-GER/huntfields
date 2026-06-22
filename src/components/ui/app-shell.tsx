"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, LogIn, MapPinned, PlusCircle } from "lucide-react";
import { MobileNav } from "@/components/ui/mobile-nav";
import { CookieSettingsButton } from "@/components/privacy/cookie-consent";
import { HeaderBrand } from "@/components/ui/header-brand";
import { BrandLogo } from "@/components/ui/brand-assets";

function chromeHidden(pathname: string | null) {
  return Boolean(
    pathname &&
      ["/onboarding", "/dashboard"].some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      ),
  );
}

export function AppHeader() {
  const pathname = usePathname();

  if (chromeHidden(pathname)) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#234331]/10 bg-[#f6f2e9]/86 shadow-[0_10px_32px_rgba(25,35,29,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-3 sm:h-16 sm:px-6 lg:px-8">
        <HeaderBrand />
        <nav className="hidden items-center gap-1 rounded-md border border-[#234331]/10 bg-white/58 p-1 text-sm font-black text-stone-700 shadow-sm md:flex">
          <Link
            href="/land"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 transition hover:bg-[#183326] hover:text-white"
          >
            <MapPinned size={16} aria-hidden="true" />
            Hunting Leases
          </Link>
          <Link
            href="/list-your-land"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 transition hover:bg-[#183326] hover:text-white"
          >
            <PlusCircle size={16} aria-hidden="true" />
            List your land
          </Link>
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 transition hover:bg-[#183326] hover:text-white"
          >
            <CircleHelp size={16} aria-hidden="true" />
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="hidden min-h-10 items-center gap-2 rounded-md border border-[#234331]/14 bg-[#183326] px-3.5 py-2 text-sm font-black text-white shadow-[0_14px_34px_rgba(24,51,38,0.2)] transition hover:bg-[#10271d] sm:inline-flex"
          >
            <LogIn size={16} aria-hidden="true" />
            Sign in / Sign up
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

export function AppFooter() {
  const pathname = usePathname();

  if (chromeHidden(pathname)) {
    return null;
  }

  return (
    <footer className="border-t border-[#234331]/10 bg-[#171f1a] text-stone-200">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
        <div>
          <BrandLogo variant="white" className="w-36" />
          <p className="mt-3 max-w-md leading-6 text-stone-400">
            Privacy-first hunting access marketplace infrastructure for
            landowners, hunters, outfitters, and regional lease discovery.
          </p>
          <p className="mt-5 max-w-sm text-xs leading-5 text-stone-500">
            Operated by Flaaq Holding GmbH, Großer Kamp 5a, 31633 Leese,
            Germany.
          </p>
        </div>
        <div>
          <p className="font-bold text-white">Marketplace</p>
          <div className="mt-3 grid gap-2 text-stone-400">
            <Link href="/land">Search land</Link>
            <Link href="/list-your-land">List your land</Link>
            <Link href="/guides">Landowner Guides</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/dashboard">Requests and bookings</Link>
          </div>
        </div>
        <div>
          <p className="font-bold text-white">Operations</p>
          <div className="mt-3 grid gap-2 text-stone-400">
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/cookies">Cookie Policy</Link>
            <CookieSettingsButton />
            <Link href="/land/united-states">United States</Link>
            <Link href="/land/united-states/texas">Texas hunting leases</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
