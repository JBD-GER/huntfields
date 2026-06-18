"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { ListingGrid } from "@/components/listings/listing-grid";
import type { ListingCard } from "@/lib/data/listings";

type SearchQuery = {
  country: string;
  state: string;
  radius: string;
  type?: string;
  min_area?: string;
  lat?: string;
  lng?: string;
};

type SearchResponse = {
  listings: ListingCard[];
  error: string | null;
  hasMore: boolean;
  nextOffset: number;
};

export function ListingResults({
  initialListings,
  initialError,
  searchQuery,
  pageSize = 24,
}: {
  initialListings: ListingCard[];
  initialError?: string | null;
  searchQuery: SearchQuery;
  pageSize?: number;
}) {
  const [listings, setListings] = useState(initialListings);
  const [error, setError] = useState(initialError ?? null);
  const [offset, setOffset] = useState(initialListings.length);
  const [hasMore, setHasMore] = useState(initialListings.length >= pageSize);
  const [isPending, startTransition] = useTransition();

  const baseParams = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(searchQuery).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    return params;
  }, [searchQuery]);

  function loadMore() {
    startTransition(async () => {
      const params = new URLSearchParams(baseParams);
      params.set("offset", String(offset));
      params.set("limit", String(pageSize));

      const response = await fetch(`/api/listings/search?${params.toString()}`);
      const payload = (await response.json()) as SearchResponse;

      if (!response.ok || payload.error) {
        setError(payload.error ?? "Could not load more hunting leases.");
        return;
      }

      setListings((current) => [...current, ...payload.listings]);
      setOffset(payload.nextOffset);
      setHasMore(payload.hasMore);
      setError(null);
    });
  }

  return (
    <div className="grid gap-5">
      <ListingGrid listings={listings} error={error} />
      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#234331]/14 bg-[#fffdf7] px-5 text-sm font-black text-[#183326] shadow-[0_16px_44px_rgba(25,35,29,0.08)] transition hover:border-[#234331]/32 hover:bg-white disabled:cursor-wait disabled:opacity-65"
          >
            {!isPending ? <Plus className="size-4" aria-hidden="true" /> : null}
            {isPending ? "Loading more leases" : "Load more leases"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
