"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { SpeciesIcon } from "@/components/species/species-icon";
import {
  huntSpecies,
  speciesCategoryLabels,
  speciesSuggestions,
  type SpeciesCategory,
} from "@/lib/species";

type CategoryFilter = SpeciesCategory | "all";

const categoryFilters: CategoryFilter[] = [
  "all",
  "big-game",
  "upland-birds",
  "waterfowl",
  "small-game",
  "predators",
  "feral-invasive",
  "fish",
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function SpeciesSelector({
  name = "wildlife",
  maxSelected = 8,
}: {
  name?: string;
  maxSelected?: number;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");

  useEffect(() => {
    const form = rootRef.current?.closest("form");

    if (!form) {
      return;
    }

    const reset = () => {
      setSelected([]);
      setQuery("");
      setCategory("all");
    };

    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, []);

  const suggestions = useMemo(() => {
    const base = query
      ? speciesSuggestions(query, 12)
      : category === "all"
        ? huntSpecies.slice(0, 16)
        : huntSpecies;

    return base.filter((species) => {
      const notSelected = !selected.some(
        (item) => normalize(item) === normalize(species.label),
      );

      return (
        notSelected && (category === "all" || species.category === category)
      );
    });
  }, [category, query, selected]);

  function addSpecies(value: string) {
    const label = value.trim();

    if (!label) {
      return;
    }

    setSelected((current) => {
      if (current.some((item) => normalize(item) === normalize(label))) {
        return current;
      }

      return [...current, label].slice(0, maxSelected);
    });
    setQuery("");
  }

  function removeSpecies(value: string) {
    setSelected((current) =>
      current.filter((item) => normalize(item) !== normalize(value)),
    );
  }

  return (
    <section ref={rootRef} className="grid gap-3 md:col-span-3">
      <input name={name} type="hidden" value={selected.join(", ")} readOnly />
      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-3">
          <label className="grid flex-1 gap-2 text-sm font-semibold text-stone-800">
            Huntable species
            <input
              value={query}
              maxLength={42}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addSpecies(suggestions[0]?.label ?? query);
                }
              }}
              placeholder="Type deer, turkey, elk, hog..."
              className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
          <button
            type="button"
            onClick={() => addSpecies(query)}
            disabled={!query.trim() || selected.length >= maxSelected}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#234331] px-4 text-sm font-bold text-white transition hover:bg-[#162d22] disabled:opacity-50"
          >
            <Plus size={16} aria-hidden="true" />
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categoryFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setCategory(filter)}
              className={`rounded-md border px-3 py-2 text-xs font-bold transition ${
                category === filter
                  ? "border-[#234331] bg-[#234331] text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:border-[#234331]"
              }`}
            >
              {filter === "all" ? "All species" : speciesCategoryLabels[filter]}
            </button>
          ))}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((species) => (
            <span
              key={species}
              className="inline-flex items-center gap-2 rounded-md bg-[#eef3ec] px-3 py-2 text-sm font-bold text-[#234331]"
            >
              <SpeciesIcon name={species} className="size-4" />
              <span className="max-w-40 truncate">{species}</span>
              <button
                type="button"
                aria-label={`Remove ${species}`}
                onClick={() => removeSpecies(species)}
                className="grid size-5 place-items-center rounded-full text-[#234331] hover:bg-white"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {suggestions.map((species) => (
          <button
            key={species.slug}
            type="button"
            onClick={() => addSpecies(species.label)}
            disabled={selected.length >= maxSelected}
            className="flex min-h-12 items-center gap-3 rounded-md border border-stone-200 bg-white px-3 py-2 text-left text-sm font-semibold text-stone-800 transition hover:border-[#234331] hover:text-[#234331]"
          >
            <SpeciesIcon category={species.category} className="size-5 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate">{species.label}</span>
              <span className="block text-xs font-normal text-stone-500">
                {speciesCategoryLabels[species.category]}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
