"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Calculator,
  Camera,
  CheckCircle2,
  DollarSign,
  Download,
  FileText,
  Gauge,
  LockKeyhole,
  Mail,
  MapPinned,
  PawPrint,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Trees,
  Waves,
} from "lucide-react";
import {
  accessOptions,
  amenityOptions,
  boundaryOptions,
  calculateLeasePricing,
  constraintOptions,
  defaultLeasePricingInputs,
  demandOptions,
  evidenceOptions,
  exclusivityOptions,
  formatCompactNumber,
  formatUsd,
  habitatOptions,
  leaseStateOptions,
  leaseTermOptions,
  photoOptions,
  pressureOptions,
  rulesOptions,
  speciesOptions,
  type AmenityId,
  type ConstraintId,
  type LeasePricingInputs,
  type SpeciesId,
} from "@/lib/lease-pricing-calculator";

type ReportStatus = "idle" | "loading" | "ready" | "error";

const inputClass =
  "min-h-11 w-full min-w-0 rounded-md border border-[#234331]/15 bg-white px-3 text-sm font-bold text-stone-950 outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20";
const sliderClass = "w-full accent-[#234331]";

function currencyRange(low: number, high: number) {
  return `${formatUsd(low)} - ${formatUsd(high)}`;
}

function ScoreBar({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm font-black text-stone-800">
        <span className="inline-flex items-center gap-2">
          {icon}
          {label}
        </span>
        <span>{value}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-[#2f6f8f]"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-4 shadow-[0_18px_48px_rgba(25,35,29,0.06)] sm:p-5">
      <h2 className="flex items-center gap-2 text-base font-black text-stone-950">
        <span className="grid size-9 place-items-center rounded-md bg-[#183326] text-white">
          {icon}
        </span>
        {label}
      </h2>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function FieldLabel({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-stone-500">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        {value ? (
          <span className="text-sm font-black normal-case tracking-normal text-stone-900">
            {value}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function ToggleTile({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm font-bold transition ${
        active
          ? "border-[#234331] bg-[#eaf0e8] text-[#183326]"
          : "border-[#234331]/12 bg-white text-stone-700 hover:border-[#234331]/35"
      }`}
    >
      <span>{label}</span>
      {active ? <CheckCircle2 size={17} aria-hidden="true" /> : null}
    </button>
  );
}

function ReportMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-white/12 bg-white/9 p-3">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/58">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

export function LeasePricingCalculator() {
  const [inputs, setInputs] = useState<LeasePricingInputs>(
    defaultLeasePricingInputs,
  );
  const [lead, setLead] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [status, setStatus] = useState<ReportStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(() => calculateLeasePricing(inputs), [inputs]);

  function updateInput<K extends keyof LeasePricingInputs>(
    key: K,
    value: LeasePricingInputs[K],
  ) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  function toggleSpecies(id: SpeciesId) {
    setInputs((current) => ({
      ...current,
      species: current.species.includes(id)
        ? current.species.filter((item) => item !== id)
        : [...current.species, id],
    }));
  }

  function toggleAmenity(id: AmenityId) {
    setInputs((current) => ({
      ...current,
      amenities: current.amenities.includes(id)
        ? current.amenities.filter((item) => item !== id)
        : [...current.amenities, id],
    }));
  }

  function toggleConstraint(id: ConstraintId) {
    setInputs((current) => ({
      ...current,
      constraints: current.constraints.includes(id)
        ? current.constraints.filter((item) => item !== id)
        : [...current.constraints, id],
    }));
  }

  function downloadReport(blob: Blob, serverFilename?: string | null) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const namePart = `${lead.lastName}-${lead.firstName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    link.href = url;
    link.download =
      serverFilename ?? `huntfields-lease-pricing-report-${namePart || "landowner"}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function onReportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const response = await fetch("/api/lease-pricing-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead, inputs }),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = response
        ? ((await response.json().catch(() => null)) as { error?: string } | null)
        : null;
      setError(payload?.error ?? "The report could not be prepared.");
      setStatus("error");
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition");
    const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? null;
    downloadReport(blob, filename);
    setStatus("ready");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-6">
      <div className="grid min-w-0 gap-4 sm:gap-5">
        <Section
          icon={<Ruler size={18} aria-hidden="true" />}
          label="Land and lease shape"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="State">
              <select
                value={inputs.state}
                onChange={(event) =>
                  updateInput(
                    "state",
                    event.currentTarget.value as LeasePricingInputs["state"],
                  )
                }
                className={inputClass}
              >
                {leaseStateOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Lease product">
              <select
                value={inputs.leaseTerm}
                onChange={(event) =>
                  updateInput(
                    "leaseTerm",
                    event.currentTarget.value as LeasePricingInputs["leaseTerm"],
                  )
                }
                className={inputClass}
              >
                {leaseTermOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldLabel>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
            <FieldLabel
              label="Total acreage"
              value={`${formatCompactNumber(inputs.acres)} acres`}
            >
              <div className="grid gap-2">
                <input
                  type="range"
                  min={10}
                  max={5000}
                  step={10}
                  value={inputs.acres}
                  onChange={(event) =>
                    updateInput("acres", Number(event.currentTarget.value))
                  }
                  className={sliderClass}
                />
                <input
                  type="number"
                  min={10}
                  max={20000}
                  value={inputs.acres}
                  onChange={(event) =>
                    updateInput("acres", Number(event.currentTarget.value) || 10)
                  }
                  className={inputClass}
                />
              </div>
            </FieldLabel>
            <FieldLabel
              label="Huntable share"
              value={`${inputs.huntablePercent}%`}
            >
              <input
                type="range"
                min={15}
                max={100}
                step={1}
                value={inputs.huntablePercent}
                onChange={(event) =>
                  updateInput(
                    "huntablePercent",
                    Number(event.currentTarget.value),
                  )
                }
                className={sliderClass}
              />
            </FieldLabel>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="Habitat">
              <select
                value={inputs.habitat}
                onChange={(event) =>
                  updateInput(
                    "habitat",
                    event.currentTarget.value as LeasePricingInputs["habitat"],
                  )
                }
                className={inputClass}
              >
                {habitatOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Demand position">
              <select
                value={inputs.demand}
                onChange={(event) =>
                  updateInput(
                    "demand",
                    event.currentTarget.value as LeasePricingInputs["demand"],
                  )
                }
                className={inputClass}
              >
                {demandOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldLabel>
          </div>
        </Section>

        <Section
          icon={<PawPrint size={18} aria-hidden="true" />}
          label="Wildlife and proof"
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {speciesOptions.map((option) => (
              <ToggleTile
                key={option.id}
                active={inputs.species.includes(option.id)}
                label={option.label}
                onClick={() => toggleSpecies(option.id)}
              />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <FieldLabel label="Wildlife proof">
              <select
                value={inputs.evidence}
                onChange={(event) =>
                  updateInput(
                    "evidence",
                    event.currentTarget.value as LeasePricingInputs["evidence"],
                  )
                }
                className={inputClass}
              >
                {evidenceOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <button
              type="button"
              onClick={() => updateInput("hasWater", !inputs.hasWater)}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-black transition ${
                inputs.hasWater
                  ? "border-[#2f6f8f] bg-[#e7f0f2] text-[#1b4f66]"
                  : "border-[#234331]/12 bg-white text-stone-700"
              }`}
            >
              <Waves size={17} aria-hidden="true" />
              Water feature
            </button>
          </div>
        </Section>

        <Section
          icon={<MapPinned size={18} aria-hidden="true" />}
          label="Access, pressure, and amenities"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="Access quality">
              <select
                value={inputs.access}
                onChange={(event) =>
                  updateInput(
                    "access",
                    event.currentTarget.value as LeasePricingInputs["access"],
                  )
                }
                className={inputClass}
              >
                {accessOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Exclusivity">
              <select
                value={inputs.exclusivity}
                onChange={(event) =>
                  updateInput(
                    "exclusivity",
                    event.currentTarget.value as LeasePricingInputs["exclusivity"],
                  )
                }
                className={inputClass}
              >
                {exclusivityOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldLabel>
          </div>

          <div className="grid gap-4 sm:grid-cols-[0.86fr_1.14fr]">
            <FieldLabel label="Hunter party" value={`${inputs.partySize}`}>
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={inputs.partySize}
                onChange={(event) =>
                  updateInput("partySize", Number(event.currentTarget.value))
                }
                className={sliderClass}
              />
            </FieldLabel>
            <FieldLabel label="Pressure plan">
              <select
                value={inputs.pressure}
                onChange={(event) =>
                  updateInput(
                    "pressure",
                    event.currentTarget.value as LeasePricingInputs["pressure"],
                  )
                }
                className={inputClass}
              >
                {pressureOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldLabel>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {amenityOptions.map((option) => (
              <ToggleTile
                key={option.id}
                active={inputs.amenities.includes(option.id)}
                label={option.label}
                onClick={() => toggleAmenity(option.id)}
              />
            ))}
          </div>
        </Section>

        <Section
          icon={<ShieldCheck size={18} aria-hidden="true" />}
          label="Risk and listing readiness"
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {constraintOptions.map((option) => (
              <ToggleTile
                key={option.id}
                active={inputs.constraints.includes(option.id)}
                label={option.label}
                onClick={() => toggleConstraint(option.id)}
              />
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FieldLabel label="Boundary">
              <select
                value={inputs.boundaryStatus}
                onChange={(event) =>
                  updateInput(
                    "boundaryStatus",
                    event.currentTarget.value as LeasePricingInputs["boundaryStatus"],
                  )
                }
                className={inputClass}
              >
                {boundaryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Photos">
              <select
                value={inputs.photoStatus}
                onChange={(event) =>
                  updateInput(
                    "photoStatus",
                    event.currentTarget.value as LeasePricingInputs["photoStatus"],
                  )
                }
                className={inputClass}
              >
                {photoOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Rules">
              <select
                value={inputs.rulesStatus}
                onChange={(event) =>
                  updateInput(
                    "rulesStatus",
                    event.currentTarget.value as LeasePricingInputs["rulesStatus"],
                  )
                }
                className={inputClass}
              >
                {rulesOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldLabel>
          </div>
        </Section>
      </div>

      <aside className="order-first grid min-w-0 gap-4 self-start lg:sticky lg:top-20 lg:order-none lg:gap-5">
        <section className="order-1 rounded-lg bg-[#17251d] p-5 text-white shadow-[0_26px_70px_rgba(25,35,29,0.18)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#d99a61]">
                <Calculator size={15} aria-hidden="true" />
                Live estimate
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-normal">
                {currencyRange(result.low, result.high)}
              </h2>
              <p className="mt-1 text-sm font-bold text-white/68">
                {result.unitLabel} for {formatCompactNumber(result.huntableAcres)} huntable acres
              </p>
            </div>
            <span className="rounded-md bg-white px-3 py-2 text-sm font-black text-[#183326]">
              {result.confidenceLabel}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <ReportMetric
              label="Target ask"
              value={formatUsd(result.target)}
              icon={<DollarSign size={14} aria-hidden="true" />}
            />
            <ReportMetric
              label="Per acre"
              value={formatUsd(result.perAcreTarget)}
              icon={<Trees size={14} aria-hidden="true" />}
            />
            <ReportMetric
              label="Deposit"
              value={formatUsd(result.deposit)}
              icon={<LockKeyhole size={14} aria-hidden="true" />}
            />
            <ReportMetric
              label="Product"
              value={result.termLabel}
              icon={<FileText size={14} aria-hidden="true" />}
            />
          </div>
        </section>

        <section className="order-3 rounded-lg border border-[#234331]/10 bg-white p-5 shadow-[0_18px_48px_rgba(25,35,29,0.07)]">
          <div className="grid gap-4">
            <ScoreBar
              value={result.marketIndex}
              label="Market demand"
              icon={<TrendingUp size={16} aria-hidden="true" />}
            />
            <ScoreBar
              value={result.readinessScore}
              label="Listing readiness"
              icon={<BadgeCheck size={16} aria-hidden="true" />}
            />
            <ScoreBar
              value={result.confidenceScore}
              label="Estimate confidence"
              icon={<Gauge size={16} aria-hidden="true" />}
            />
          </div>

          <div className="mt-5 grid gap-3">
            {result.pricingSignals.map((signal) => (
              <p
                key={signal}
                className="rounded-md bg-[#f7f3ea] p-3 text-sm font-semibold leading-6 text-stone-700"
              >
                {signal}
              </p>
            ))}
          </div>
        </section>

        <section className="order-4 rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_48px_rgba(25,35,29,0.07)]">
          <h2 className="flex items-center gap-2 text-base font-black text-stone-950">
            <SlidersHorizontal size={18} className="text-[#c76b2f]" aria-hidden="true" />
            Pricing moves
          </h2>
          <div className="mt-4 grid gap-3">
            {result.recommendations.map((item) => (
              <div key={item} className="flex gap-3 text-sm leading-6 text-stone-700">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#2f6f8f]" aria-hidden="true" />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="order-2 rounded-lg border-2 border-[#d99a61] bg-[#183326] p-5 text-white shadow-[0_26px_70px_rgba(24,51,38,0.28)]">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[#d99a61] text-[#17251d]">
              <Download size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0cda7]">
                Free instant download
              </p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-white">
                Get the full PDF valuation report
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/74">
                Enter your name and email to generate the polished price range,
                property snapshot, scorecard, and action plan as a PDF.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 rounded-md border border-white/12 bg-white/8 p-3 text-sm font-semibold text-white/82">
            <p className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#d99a61]" aria-hidden="true" />
              Includes target ask, range, deposit, and per-acre view.
            </p>
            <p className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#d99a61]" aria-hidden="true" />
              Generated as a real PDF from the server after validation.
            </p>
          </div>

          <form onSubmit={onReportSubmit} className="mt-4 grid gap-3">
            <div className="grid min-w-0 gap-3">
              <label className="grid min-w-0 gap-2 text-sm font-bold text-white">
                First name
                <input
                  required
                  value={lead.firstName}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setLead((current) => ({
                      ...current,
                      firstName: value,
                    }));
                  }}
                  className={inputClass}
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-bold text-white">
                Last name
                <input
                  required
                  value={lead.lastName}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setLead((current) => ({
                      ...current,
                      lastName: value,
                    }));
                  }}
                  className={inputClass}
                />
              </label>
            </div>
            <label className="grid min-w-0 gap-2 text-sm font-bold text-white">
              Email
              <input
                required
                type="email"
                value={lead.email}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setLead((current) => ({
                    ...current,
                    email: value,
                  }));
                }}
                className={inputClass}
              />
            </label>

            {status === "error" ? (
              <p className="flex gap-2 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            ) : null}
            {status === "ready" ? (
              <p className="flex gap-2 rounded-md bg-[#eaf0e8] p-3 text-sm font-semibold text-[#183326]">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Report downloaded.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#d99a61] px-5 text-base font-black text-[#17251d] shadow-[0_18px_36px_rgba(0,0,0,0.24)] transition hover:bg-[#efb678] disabled:opacity-60"
            >
              {status === "loading" ? (
                <>
                  <Mail size={17} aria-hidden="true" />
                  Preparing report
                </>
              ) : (
                <>
                  <Download size={17} aria-hidden="true" />
                  Download PDF report
                </>
              )}
            </button>
          </form>
        </section>

        <p className="order-5 flex gap-2 rounded-lg border border-[#234331]/10 bg-[#f7f3ea] p-4 text-xs font-semibold leading-5 text-stone-600">
          <Camera className="mt-0.5 size-4 shrink-0 text-[#c76b2f]" aria-hidden="true" />
          Better photos, wildlife proof, mapped boundaries, and written rules can move the estimate from directional to defensible.
        </p>
      </aside>
    </div>
  );
}
