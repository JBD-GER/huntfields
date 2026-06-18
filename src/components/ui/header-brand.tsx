"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandIcon, BrandLogo } from "@/components/ui/brand-assets";

const compactRoutes = ["/auth", "/contracts", "/dashboard", "/onboarding"];

export function HeaderBrand() {
  const pathname = usePathname();
  const compact = compactRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const frontPage = pathname === "/";

  return (
    <Link
      href="/"
      className="flex min-w-0 items-center gap-2 text-base font-black tracking-normal text-stone-950 sm:text-lg"
      aria-label="Huntfields home"
    >
      {frontPage && !compact ? (
        <BrandLogo
          variant="black"
          priority
          className="w-32 sm:w-40"
        />
      ) : (
        <>
          <BrandIcon
            priority
            className={compact ? "size-10" : "size-9"}
          />
          {compact ? (
            <span className="sr-only">Huntfields</span>
          ) : (
            <span className="truncate">Huntfields</span>
          )}
        </>
      )}
    </Link>
  );
}
