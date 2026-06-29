"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandIcon } from "@/components/ui/brand-assets";

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
      <span className="inline-flex min-h-11 items-center rounded-md border border-[#234331]/10 bg-white px-2.5 shadow-sm">
        <BrandIcon
          priority
          className={compact ? "size-7 sm:size-8" : "size-8 sm:size-9"}
        />
        <span className="ml-2 whitespace-nowrap text-base font-black text-[#183326] sm:text-lg">
          Huntfields.com
        </span>
      </span>
    </Link>
  );
}
