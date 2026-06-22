"use client";

import { Filter, Search } from "lucide-react";
import { acreageOptions, radiusOptions, usLaunchStates } from "@/lib/us-market";

export function LeaseFilterForm({
  variant = "hero",
  defaults,
  action = "/land",
  hiddenFields,
}: {
  variant?: "hero" | "sidebar";
  defaults?: {
    state?: string;
    radius?: string;
    minArea?: string;
  };
  action?: string;
  hiddenFields?: Record<string, string | undefined>;
}) {
  const compact = variant === "sidebar";

  return (
    <form
      action={action}
      className={
        compact
          ? "grid gap-3"
          : "grid w-full gap-2 rounded-md border border-white/18 bg-white/86 p-2 shadow-[0_28px_80px_rgba(25,35,29,0.28)] backdrop-blur-xl sm:grid-cols-2 sm:gap-3 sm:p-3 lg:grid-cols-[1fr_1fr_1fr_auto]"
      }
    >
      <input type="hidden" name="country" value="US" />
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) =>
            value ? (
              <input key={name} type="hidden" name={name} value={value} />
            ) : null,
          )
        : null}
      <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-stone-500">
        State
        <select
          name="state"
          defaultValue={defaults?.state ?? "TX"}
          className="min-h-10 rounded-md border border-[#234331]/15 bg-[#fbfaf6] px-3 text-sm font-bold normal-case tracking-normal text-stone-950 outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20 sm:min-h-12"
        >
          {usLaunchStates.map((state) => (
            <option key={state.code} value={state.code}>
              {state.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-stone-500">
        Radius
        <select
          name="radius"
          defaultValue={defaults?.radius ?? "statewide"}
          className="min-h-10 rounded-md border border-[#234331]/15 bg-[#fbfaf6] px-3 text-sm font-bold normal-case tracking-normal text-stone-950 outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20 sm:min-h-12"
        >
          {radiusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-stone-500">
        Acreage
        <select
          name="min_area"
          defaultValue={defaults?.minArea ?? ""}
          className="min-h-10 rounded-md border border-[#234331]/15 bg-[#fbfaf6] px-3 text-sm font-bold normal-case tracking-normal text-stone-950 outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20 sm:min-h-12"
        >
          {acreageOptions.map((option) => (
            <option key={option.value || "any"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className={
          compact
            ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(24,51,38,0.18)] transition hover:bg-[#10271d]"
            : "inline-flex min-h-10 items-center justify-center gap-2 self-end rounded-md bg-[#183326] px-5 text-sm font-black text-white shadow-[0_18px_36px_rgba(24,51,38,0.24)] transition hover:bg-[#10271d] sm:min-h-12 lg:w-auto"
        }
      >
        {compact ? <Filter size={17} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
        Show leases
      </button>
    </form>
  );
}
