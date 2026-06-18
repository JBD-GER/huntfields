"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleHelp, LogIn, MapPinned, Menu, PlusCircle, X } from "lucide-react";

const links = [
  {
    href: "/land",
    label: "Hunting Leases",
    description: "Search private hunting land",
    icon: MapPinned,
  },
  {
    href: "/list-your-land",
    label: "List your land",
    description: "Start as a landowner",
    icon: PlusCircle,
  },
  {
    href: "/faq",
    label: "FAQ",
    description: "Answers for hunters and owners",
    icon: CircleHelp,
  },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid size-10 place-items-center rounded-md border border-[#234331]/18 bg-white/74 text-stone-800 shadow-sm"
        aria-expanded={open}
        aria-label="Open navigation"
      >
        {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 w-[min(88vw,340px)] overflow-hidden rounded-lg border border-[#234331]/12 bg-[#fffdf7]/98 p-2 shadow-[0_24px_70px_rgba(25,35,29,0.22)] backdrop-blur-xl">
          <div className="grid gap-1">
            {links.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-3 text-stone-950 transition hover:bg-[#eef0e6]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#183326] text-white">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-black">{label}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-stone-500">
                    {description}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/auth/login"
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#234331]/14 bg-white px-3 text-sm font-black text-[#183326]"
          >
            <LogIn size={16} aria-hidden="true" />
            Sign in / Sign up
          </Link>
        </div>
      ) : null}
    </div>
  );
}
