"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  MapPinned,
  Plus,
  Ruler,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { LazyPolygonEditor } from "@/components/maps/lazy-polygon-editor";
import { SpeciesSelector } from "@/components/forms/species-selector";
import type { ListingType } from "@/lib/data/listings";
import type { UsStateHuntingRule } from "@/lib/compliance/us-state-rules";
import {
  calculateMarketplaceFees,
  formatBps,
  formatMoney,
  INITIAL_HUNTER_FEE_BPS,
  INITIAL_OWNER_FEE_BPS,
} from "@/lib/payments/fees";

type SubmitState = "idle" | "loading" | "success" | "error";
type DescriptionState = "idle" | "loading" | "error";
type LeaseRequirementState = "unknown" | "no" | "yes";

const fieldClass =
  "h-12 w-full rounded-md border border-stone-300 bg-white px-4 text-base font-normal leading-none outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20";
const textAreaClass =
  "min-h-32 w-full rounded-md border border-stone-300 bg-white px-4 py-3 text-base font-normal leading-6 outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20";

const amenitySuggestions = [
  "Water access",
  "Parking",
  "Blinds",
  "Feeders",
  "Cabin",
  "Trails",
  "Camping",
  "Game cameras",
];

const ruleSuggestions = [
  "Close all gates",
  "Use marked roads only",
  "No guests unless approved",
  "No alcohol while hunting",
  "Pack out trash",
  "Respect livestock",
  "No night hunting",
  "No baiting unless legal",
];

const methodSuggestions = [
  "Rifle",
  "Archery",
  "Muzzleloader",
  "Shotgun",
  "Crossbow",
  "Trapping",
];

const prohibitedMethodSuggestions = [
  "Night hunting",
  "Baiting",
  "Road hunting",
  "Centerfire rifle",
  "ATVs off marked roads",
  "Dogs",
];

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function SectionHeader({
  eyebrow,
  title,
  body,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  body: string;
  icon: typeof MapPinned;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[#eef3ec] text-[#183326]">
        <Icon size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-black leading-tight text-stone-950 sm:text-2xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
      </div>
    </div>
  );
}

function MultiValueField({
  name,
  label,
  placeholder,
  suggestions,
  maxItems = 8,
  maxItemLength = 60,
}: {
  name: string;
  label: string;
  placeholder: string;
  suggestions: string[];
  maxItems?: number;
  maxItemLength?: number;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<string[]>([]);
  const [value, setValue] = useState("");

  useEffect(() => {
    const form = rootRef.current?.closest("form");

    if (!form) {
      return;
    }

    const reset = () => {
      setItems([]);
      setValue("");
    };

    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, []);

  function addItem(nextValue = value) {
    const item = normalize(nextValue).slice(0, maxItemLength);

    if (!item) {
      return;
    }

    setItems((current) => {
      if (
        current.some(
          (existing) => existing.toLowerCase() === item.toLowerCase(),
        )
      ) {
        return current;
      }

      return [...current, item].slice(0, maxItems);
    });
    setValue("");
  }

  function removeItem(item: string) {
    setItems((current) => current.filter((existing) => existing !== item));
  }

  return (
    <div ref={rootRef} className="grid gap-2">
      <input name={name} type="hidden" value={items.join(", ")} readOnly />
      <label className="grid gap-2 text-sm font-semibold text-stone-800">
        {label}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem]">
          <input
            value={value}
            maxLength={maxItemLength}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addItem();
              }
            }}
            placeholder={placeholder}
            className={fieldClass}
          />
          <button
            type="button"
            onClick={() => addItem()}
            disabled={!value.trim() || items.length >= maxItems}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-sm font-black text-white transition hover:bg-[#10261b] disabled:opacity-45"
          >
            <Plus size={16} aria-hidden="true" />
            Add
          </button>
        </div>
      </label>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-md bg-[#eef3ec] px-3 py-1.5 text-sm font-bold text-[#183326]"
            >
              <span className="truncate">{item}</span>
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => removeItem(item)}
                className="grid size-5 shrink-0 place-items-center rounded-full hover:bg-white"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {suggestions
          .filter(
            (suggestion) =>
              !items.some(
                (item) => item.toLowerCase() === suggestion.toLowerCase(),
              ),
          )
          .slice(0, 8)
          .map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addItem(suggestion)}
              disabled={items.length >= maxItems}
              className="inline-flex h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-[#234331] hover:text-[#183326] disabled:opacity-45"
            >
              {suggestion}
            </button>
          ))}
      </div>
    </div>
  );
}

export function ListingSubmissionForm({
  listingTypes,
  stateRules = [],
}: {
  listingTypes: ListingType[];
  stateRules?: UsStateHuntingRule[];
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const defaultStateCode =
    stateRules.find((rule) => rule.state_code === "TX")?.state_code ??
    stateRules[0]?.state_code ??
    "TX";
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [descriptionState, setDescriptionState] =
    useState<DescriptionState>("idle");
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [stateCode, setStateCode] = useState(defaultStateCode);
  const [pricePreviewCents, setPricePreviewCents] = useState<number | null>(
    null,
  );
  const [leaseRequirement, setLeaseRequirement] =
    useState<LeaseRequirementState>("unknown");

  const activeRule =
    stateRules.find((rule) => rule.state_code === stateCode.toUpperCase()) ??
    stateRules[0];
  const activeStateName = activeRule?.state_name ?? "Selected state";
  const feePreview =
    pricePreviewCents !== null
      ? calculateMarketplaceFees({ leaseAmountCents: pricePreviewCents })
      : null;

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
    setPricePreviewCents(null);
    setLeaseRequirement("unknown");
    setStateCode(defaultStateCode);
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
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-7">
      <input name="country_code" type="hidden" value="US" readOnly />
      <input name="country_name" type="hidden" value="United States" readOnly />
      <input name="currency" type="hidden" value="USD" readOnly />
      <input
        name="admin_area_name"
        type="hidden"
        value={activeRule?.state_name ?? ""}
        readOnly
      />

      <section className="grid gap-5">
        <SectionHeader
          eyebrow="Step 1"
          title="Describe the property"
          body="A clear title, short summary, and private property location are enough to get the listing moving."
          icon={MapPinned}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)]">
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Listing title
            <input
              name="title"
              required
              minLength={8}
              maxLength={140}
              placeholder="Hill Country whitetail lease near Fredericksburg"
              className={fieldClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Listing type
            <select
              name="listing_type_slug"
              required
              className={fieldClass}
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
            placeholder="Private ranch access with wooded draws, senderos, and flexible day or season terms."
            className={fieldClass}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            State
            <select
              name="admin_area_code"
              value={stateCode}
              onChange={(event) => setStateCode(event.target.value)}
              className={fieldClass}
            >
              {stateRules.map((rule) => (
                <option key={rule.state_code} value={rule.state_code}>
                  {rule.state_name} ({rule.state_code})
                </option>
              ))}
              {!stateRules.length ? <option value="TX">Texas (TX)</option> : null}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Nearest town
            <input
              name="nearest_town"
              maxLength={120}
              placeholder="Fredericksburg"
              className={fieldClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Property address
            <input
              name="address_private"
              maxLength={300}
              placeholder="Street, gate, ranch road, or parcel note"
              className={fieldClass}
            />
            <span className="text-xs font-normal leading-5 text-stone-500">
              Kept private until you approve a serious request.
            </span>
          </label>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Description
          <textarea
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            maxLength={1800}
            placeholder="Add terrain, access, stand/blind setup, nearby landmarks, season fit, and anything hunters should know before requesting access."
            className={textAreaClass}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={generateDescription}
              disabled={descriptionState === "loading"}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-[#234331]/16 bg-[#eef3ec] px-3 text-xs font-black text-[#183326] transition hover:border-[#234331]/32 hover:bg-[#e5eee2] disabled:opacity-60 sm:w-fit"
            >
              <Sparkles size={15} aria-hidden="true" />
              {descriptionState === "loading"
                ? "Generating"
                : "Write with AI"}
            </button>
            <span className="text-xs font-semibold text-stone-500">
              Works best after title, summary, and location are filled.
            </span>
          </div>
          {descriptionState === "error" && (
            <span className="text-xs font-semibold leading-5 text-red-700">
              {descriptionError}
            </span>
          )}
        </label>
      </section>

      <section className="grid gap-5 border-t border-stone-200 pt-6">
        <SectionHeader
          eyebrow="Step 2"
          title="Set the offer"
          body="Use USD for launch. You can leave price blank during a free beta or add the owner-facing price hunters will request against."
          icon={BadgeCheck}
        />

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.75fr)]">
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Price
            <input
              name="price"
              inputMode="decimal"
              maxLength={12}
              placeholder="3000"
              onChange={(event) => {
                const parsed = Number(event.target.value.replace(",", "."));
                setPricePreviewCents(
                  Number.isFinite(parsed) && parsed >= 0
                    ? Math.round(parsed * 100)
                    : null,
                );
              }}
              className={fieldClass}
            />
            {feePreview ? (
              <span className="rounded-md border border-[#d9c6aa] bg-[#fff9ef] p-3 text-xs font-normal leading-5 text-stone-600">
                USD. Huntfields owner fee is {formatBps(INITIAL_OWNER_FEE_BPS)}
                . Hunter fee is shown later when terms are serious (
                {formatBps(INITIAL_HUNTER_FEE_BPS)}). Estimated payout:{" "}
                {formatMoney(feePreview.landownerPayoutCents)}.
              </span>
            ) : (
              <span className="text-xs font-normal leading-5 text-stone-500">
                Currency is fixed to USD for now.
              </span>
            )}
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Billing unit
            <select
              name="price_unit"
              defaultValue="per_day"
              className={fieldClass}
            >
              <option value="per_day">Per day</option>
              <option value="per_week">Per week</option>
              <option value="per_season">Per season</option>
              <option value="per_request">Per request</option>
            </select>
            <span className="text-xs font-normal leading-5 text-stone-500">
              Hunters see this exact pricing unit before they request access.
            </span>
          </label>
        </div>
      </section>

      <section className="grid gap-5 border-t border-stone-200 pt-6">
        <SectionHeader
          eyebrow="Step 3"
          title="Wildlife, amenities, and rules"
          body="Pick common species or add your own. Amenities and rules are saved as clean lists instead of one long text field."
          icon={FileCheck2}
        />

        <SpeciesSelector />

        <div className="grid gap-5 lg:grid-cols-2">
          <MultiValueField
            name="amenities"
            label="Amenities"
            placeholder="Add water, cabin, blinds..."
            suggestions={amenitySuggestions}
          />
          <MultiValueField
            name="rules"
            label="Rules"
            placeholder="Add access rule..."
            suggestions={ruleSuggestions}
            maxItems={10}
            maxItemLength={72}
          />
        </div>
      </section>

      <section className="grid gap-5 border-t border-stone-200 pt-6">
        <SectionHeader
          eyebrow="Step 4"
          title="Simple verification readiness"
          body="You can publish the listing while review is pending. ID, authority, and state details must be complete only before final terms, files, signatures, or payment."
          icon={ShieldCheck}
        />

        <div className="grid gap-4 rounded-md border border-[#d9c6aa] bg-[#fff9ef] p-4">
          <label className="flex gap-3 text-sm font-semibold leading-6 text-stone-800">
            <input
              name="landowner_has_authority"
              type="checkbox"
              required
              className="mt-1 size-4 shrink-0 rounded border-stone-300 text-[#234331]"
            />
            <span>
              I have legal authority to offer hunting access for this property.
            </span>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Authority proof
            <input
              name="authority_document"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="w-full min-w-0 rounded-md border border-dashed border-stone-300 bg-white px-3 py-2 text-xs font-normal file:mr-3 file:rounded-md file:border-0 file:bg-[#234331] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white sm:text-sm"
            />
            <span className="text-xs font-normal leading-5 text-stone-600">
              Optional now, required before final contract steps. Use a deed,
              tax record, management agreement, lease authorization, or similar
              proof.
            </span>
          </label>

          <div className="grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <label className="grid gap-2 text-sm font-semibold text-stone-800">
              Hunting lease license
              <select
                name="hunting_lease_license_required"
                value={leaseRequirement}
                onChange={(event) =>
                  setLeaseRequirement(
                    event.target.value as LeaseRequirementState,
                  )
                }
                className={fieldClass}
              >
                <option value="unknown">Not sure yet</option>
                <option value="no">Not required for this property</option>
                <option value="yes">Required</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-stone-800">
              License number
              <input
                name="hunting_lease_license_number"
                required={leaseRequirement === "yes"}
                maxLength={80}
                placeholder="Only needed when required"
                className={fieldClass}
              />
            </label>
          </div>

          {activeRule ? (
            <div className="rounded-md border border-[#234331]/10 bg-white p-3 text-sm leading-6 text-stone-700">
              <p className="font-black text-stone-950">
                {activeStateName} review note
              </p>
              <p className="mt-1">
                We will check property authority, state lease-license needs,
                species, dates, rules, access routes, and emergency contact
                before final terms are enabled.
              </p>
              <p className="mt-2 text-xs font-semibold text-stone-500">
                Source: {activeRule.agency_name}. Product checklist, not legal
                advice.
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <MultiValueField
            name="allowed_methods"
            label="Allowed methods"
            placeholder="Add method..."
            suggestions={methodSuggestions}
            maxItems={6}
            maxItemLength={42}
          />
          <MultiValueField
            name="prohibited_methods"
            label="Prohibited methods"
            placeholder="Add restriction..."
            suggestions={prohibitedMethodSuggestions}
            maxItems={6}
            maxItemLength={52}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Guest policy
            <input
              name="guest_policy"
              maxLength={140}
              placeholder="No guests unless approved"
              className={fieldClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Vehicle policy
            <input
              name="vehicle_policy"
              maxLength={140}
              placeholder="Use marked ranch roads only"
              className={fieldClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Alcohol policy
            <input
              name="alcohol_policy"
              maxLength={140}
              placeholder="No alcohol while hunting"
              className={fieldClass}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Insurance notes
            <input
              name="insurance_summary"
              maxLength={220}
              placeholder="Liability policy, waiver, or none yet"
              className={fieldClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Emergency contact name
            <input
              name="emergency_contact_name"
              maxLength={120}
              className={fieldClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Emergency contact phone
            <input
              name="emergency_contact_phone"
              maxLength={80}
              className={fieldClass}
            />
          </label>
        </div>
      </section>

      <section className="grid gap-5 border-t border-stone-200 pt-6">
        <SectionHeader
          eyebrow="Step 5"
          title="Draw the hunting area"
          body="Click the corners, save the shape with Enter or the orange start point, then edit points or add another separate area."
          icon={Ruler}
        />

        <label className="grid gap-2 text-sm font-semibold text-stone-800 md:max-w-lg">
          Recorded acreage
          <input
            name="reported_area_acres"
            inputMode="decimal"
            maxLength={12}
            placeholder="Optional, e.g. 640"
            className={fieldClass}
          />
          <span className="text-xs font-normal leading-5 text-stone-500">
            Enter acres from a deed, survey, or county/tax record. Huntfields
            also shows hectares automatically; the drawn boundary controls the
            map preview.
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
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-black">Listing created. Next steps are clear now.</p>
          <p className="mt-2 leading-6 font-semibold">
            If you uploaded authority proof, it is queued for property review.
            In parallel, verify your government ID. Listing, requests, and chat
            can continue while review is pending; final files, signatures, and
            payment unlock after the required checks are complete.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-[auto_auto] sm:justify-start">
            <Link
              href="/dashboard?view=profile"
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-xs font-black text-white"
            >
              <ShieldCheck size={15} aria-hidden="true" />
              Open ID check
            </Link>
            <Link
              href="/dashboard?view=listings"
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-emerald-700/20 bg-white px-4 text-xs font-black text-[#183326]"
            >
              View listing status
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold leading-5 text-stone-500">
          You can edit details later from Listings. Serious contract steps stay
          protected until verification is complete.
        </p>
        <button
          type="submit"
          disabled={state === "loading"}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#234331] px-5 font-bold text-white transition hover:bg-[#162d22] disabled:opacity-60 sm:w-auto"
        >
          <Send size={18} aria-hidden="true" />
          {state === "loading" ? "Creating listing" : "Create listing"}
        </button>
      </div>
    </form>
  );
}
