"use client";

import { useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { LazyPolygonEditor } from "@/components/maps/lazy-polygon-editor";
import { SpeciesSelector } from "@/components/forms/species-selector";
import type { ListingType } from "@/lib/data/listings";
import type { UsStateHuntingRule } from "@/lib/compliance/us-state-rules";

type SubmitState = "idle" | "loading" | "success" | "error";
type DescriptionState = "idle" | "loading" | "error";

export function ListingSubmissionForm({
  listingTypes,
  stateRules = [],
}: {
  listingTypes: ListingType[];
  stateRules?: UsStateHuntingRule[];
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [descriptionState, setDescriptionState] =
    useState<DescriptionState>("idle");
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [stateCode, setStateCode] = useState("TX");
  const activeRule =
    stateRules.find((rule) => rule.state_code === stateCode.toUpperCase()) ??
    stateRules[0];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setError(null);

    const form = event.currentTarget;
    const response = await fetch("/api/listings", {
      method: "POST",
      body: new FormData(form),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Unable to submit listing.");
      setState("error");
      return;
    }

    form.reset();
    setDescription("");
    setDescriptionState("idle");
    setState("success");
  }

  async function generateDescription() {
    const form = formRef.current;

    if (!form) {
      return;
    }

    setDescriptionState("loading");
    setDescriptionError(null);

    const formData = new FormData(form);
    formData.set("description", description);

    const response = await fetch("/api/listings/description", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as {
      description?: string;
      error?: string;
    } | null;

    if (!response.ok || !payload?.description) {
      setDescriptionError(
        payload?.error ?? "Unable to generate a description right now.",
      );
      setDescriptionState("error");
      return;
    }

    setDescription(payload.description);
    setDescriptionState("idle");
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Listing title
          <input
            name="title"
            required
            minLength={8}
            maxLength={140}
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Listing type
          <select
            name="listing_type_slug"
            required
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          >
            <option value="">Select type</option>
            {listingTypes.map((type) => (
              <option key={type.id} value={type.slug}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-stone-800">
        Short summary
        <input
          name="summary"
          required
          maxLength={180}
          className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-stone-800">
        Description
        <textarea
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          maxLength={1800}
          className="rounded-md border border-stone-300 px-3 py-2 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
        />
        <button
          type="button"
          onClick={generateDescription}
          disabled={descriptionState === "loading"}
          className="mt-1 inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-md border border-[#234331]/16 bg-[#eef3ec] px-3 text-xs font-black text-[#183326] transition hover:border-[#234331]/32 hover:bg-[#e5eee2] disabled:opacity-60"
        >
          <Sparkles size={15} aria-hidden="true" />
          {descriptionState === "loading"
            ? "Generating description"
            : "Generate description"}
        </button>
        {descriptionState === "error" && (
          <span className="text-xs font-semibold leading-5 text-red-700">
            {descriptionError}
          </span>
        )}
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Country code
          <input
            name="country_code"
            required
            maxLength={2}
            placeholder="US"
            className="min-h-11 rounded-md border border-stone-300 px-3 uppercase font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Country name
          <input
            name="country_name"
            required
            maxLength={120}
            placeholder="United States"
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          State / region code
          <input
            name="admin_area_code"
            value={stateCode}
            maxLength={2}
            onChange={(event) => setStateCode(event.target.value.toUpperCase())}
            placeholder="TX"
            className="min-h-11 rounded-md border border-stone-300 px-3 uppercase font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          State / region name
          <input
            name="admin_area_name"
            maxLength={120}
            placeholder="Texas"
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Nearest town
          <input
            name="nearest_town"
            maxLength={120}
            placeholder="Fredericksburg"
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Private address
          <input
            name="address_private"
            maxLength={300}
            placeholder="Only shown after approval"
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Price
          <input
            name="price"
            inputMode="decimal"
            maxLength={12}
            placeholder="250"
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Currency
          <input
            name="currency"
            defaultValue="USD"
            maxLength={3}
            className="min-h-11 rounded-md border border-stone-300 px-3 uppercase font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Unit
          <select
            name="price_unit"
            defaultValue="per_day"
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          >
            <option value="per_day">Per day</option>
            <option value="per_week">Per week</option>
            <option value="per_season">Per season</option>
            <option value="per_request">Per request</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4">
        <SpeciesSelector />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Amenities
            <input
              name="amenities"
              maxLength={260}
              placeholder="water, cabin, trails"
              className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Rules
            <input
              name="rules"
              maxLength={360}
              placeholder="no guests, blaze orange required"
              className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
        </div>
      </div>
      {activeRule && (
        <section className="rounded-md border border-[#d9c6aa] bg-[#fff9ef] p-4">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#c76b2f]">
            {activeRule.state_name} listing checks
          </p>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-stone-700">
            {activeRule.landowner_listing_requirements.map((requirement) => (
              <label key={requirement} className="flex gap-2">
                <input
                  name="state_listing_requirements"
                  value={requirement}
                  type="checkbox"
                  required
                  className="mt-1 size-4 rounded border-stone-300 text-[#234331]"
                />
                <span>{requirement}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-600">
            Current source: {activeRule.agency_name}. This workflow is a product
            checklist, not legal advice.
          </p>
        </section>
      )}
      <section className="grid gap-4 rounded-md border border-stone-200 bg-[#f8f6f0] p-4">
        <h2 className="text-lg font-black text-stone-950">
          Access rules and lease compliance
        </h2>
        <label className="flex gap-3 text-sm font-semibold leading-6 text-stone-800">
          <input
            name="landowner_has_authority"
            type="checkbox"
            required
            className="mt-1 size-4 rounded border-stone-300 text-[#234331]"
          />
          I have legal authority to offer hunting access for this property.
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex gap-3 text-sm font-semibold leading-6 text-stone-800">
            <input
              name="hunting_lease_license_required"
              type="checkbox"
              className="mt-1 size-4 rounded border-stone-300 text-[#234331]"
            />
            This state/property requires a hunting lease license.
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Lease license number
            <input
              name="hunting_lease_license_number"
              maxLength={80}
              placeholder="Required when applicable"
              className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Allowed methods
            <input
              name="allowed_methods"
              maxLength={220}
              placeholder="rifle, archery, muzzleloader"
              className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Prohibited methods
            <input
              name="prohibited_methods"
              maxLength={260}
              placeholder="baiting, night hunting"
              className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Insurance notes
            <input
              name="insurance_summary"
              maxLength={220}
              placeholder="Liability policy, waiver, etc."
              className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Guest policy
            <input
              name="guest_policy"
              maxLength={140}
              placeholder="No guests unless approved"
              className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Vehicle policy
            <input
              name="vehicle_policy"
              maxLength={140}
              placeholder="Use marked ranch roads only"
              className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Alcohol policy
            <input
              name="alcohol_policy"
              maxLength={140}
              placeholder="No alcohol while hunting"
              className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Emergency contact name
            <input
              name="emergency_contact_name"
              maxLength={120}
              className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Emergency contact phone
            <input
              name="emergency_contact_phone"
              maxLength={80}
              className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
        </div>
      </section>
      <section className="grid gap-3">
        <div>
          <h2 className="text-lg font-black text-stone-950">
            Draw the hunting area
          </h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Outline the forest, ranch block, field edge, or access section you
            want to offer. The map gives an approximate area estimate and exact
            coordinates stay private until approval.
          </p>
        </div>
        <label className="grid gap-2 rounded-md border border-stone-200 bg-white p-4 text-sm font-semibold text-stone-800 md:max-w-md">
          Owner-reported acreage
          <input
            name="reported_area_acres"
            inputMode="decimal"
            maxLength={12}
            placeholder="Optional, e.g. 640"
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
          <span className="text-xs font-normal leading-5 text-stone-600">
            Use this when a deed, survey, or land record has a known acreage.
            The drawn polygon still controls the map preview and exact boundary.
          </span>
        </label>
        <LazyPolygonEditor />
      </section>
      {state === "error" && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      {state === "success" && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Listing submitted for review. A polished regional cover image is added
          automatically when image generation is connected.
        </p>
      )}
      <button
        type="submit"
        disabled={state === "loading"}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#234331] px-5 font-bold text-white transition hover:bg-[#162d22] disabled:opacity-60"
      >
        <Send size={18} aria-hidden="true" />
        {state === "loading" ? "Submitting" : "Submit listing for review"}
      </button>
    </form>
  );
}
