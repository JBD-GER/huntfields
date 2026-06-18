"use client";

import { useState } from "react";
import { Search } from "lucide-react";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    country_code?: string;
  };
};

export function LocationSearchForm({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Searching location");

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    const results = (await response.json()) as NominatimResult[];
    const match = results[0];

    if (!match) {
      setStatus("No location found");
      return;
    }

    const params = new URLSearchParams({
      lat: match.lat,
      lng: match.lon,
      q: query,
      country: match.address?.country_code?.toUpperCase() ?? "",
      radius: "75000",
    });

    window.location.href = `/land?${params.toString()}`;
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        compact
          ? "flex flex-col gap-3 sm:flex-row"
          : "mx-auto flex max-w-3xl flex-col gap-3 rounded-md bg-white p-2 shadow-xl sm:flex-row"
      }
    >
      <label className="sr-only" htmlFor="location-search">
        Search by address, town, state, or country
      </label>
      <input
        id="location-search"
        required
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by address, town, state, or country"
        className="min-h-12 flex-1 rounded-md border border-stone-300 px-4 text-base text-stone-950 outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
      />
      <button
        type="submit"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#234331] px-5 font-bold text-white transition hover:bg-[#162d22]"
      >
        <Search size={18} aria-hidden="true" />
        Search
      </button>
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
    </form>
  );
}
