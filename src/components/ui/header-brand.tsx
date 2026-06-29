"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/ui/brand-assets";

const compactRoutes = ["/auth", "/contracts", "/dashboard", "/onboarding"];

export function HeaderBrand() {
  const pathname = usePathname();
  const compact = compactRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return (
    <Link
      href="/"
      className="flex min-w-0 items-center gap-2 text-base font-black tracking-normal text-stone-950 sm:text-lg"
      aria-label="Huntfields.com home"
    >
      <span className="inline-flex min-h-11 items-center rounded-md border border-[#234331]/10 bg-white px-3 shadow-sm">
        <BrandLogo
          priority
          variant="black"
          className={compact ? "w-32 sm:w-36" : "w-40 sm:w-44"}
        />
      </span>
    </Link>
  );
}
