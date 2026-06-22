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
      aria-label="Huntfields home"
    >
      <span className="inline-flex min-h-11 items-center rounded-md border border-[#234331]/10 bg-white px-2.5 shadow-sm">
        <BrandLogo
          variant="black"
          priority
          className={compact ? "w-32 sm:w-36" : "w-32 sm:w-40"}
        />
      </span>
      <span className="sr-only">Huntfields</span>
    </Link>
  );
}
