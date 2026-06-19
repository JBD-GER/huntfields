import { MapPin, Navigation, ShieldCheck } from "lucide-react";

export default function Loading() {
  return (
    <div className="relative isolate grid min-h-[calc(100dvh-3.5rem)] place-items-center overflow-hidden bg-[#15231b] px-4 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(8,16,11,0.96),rgba(24,51,38,0.9)_48%,rgba(15,25,19,0.96))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/12" />
      <div className="relative w-full max-w-sm">
        <div className="mx-auto grid size-36 place-items-center rounded-full border border-white/12 bg-white/[0.04] shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
          <div className="huntfields-loader-map relative grid size-24 place-items-center rounded-full border border-[#d99a61]/28 bg-[#0f1d15]">
            <span className="huntfields-loader-route absolute inset-3 rounded-full border border-dashed border-[#d99a61]/44" />
            <span className="huntfields-loader-route-secondary absolute inset-8 rounded-full border border-white/14" />
            <Navigation
              className="huntfields-loader-compass absolute right-5 top-5 size-4 text-[#d99a61]"
              aria-hidden="true"
            />
            <MapPin
              className="huntfields-loader-pin relative z-10 size-10 fill-[#d99a61] text-[#fff8ec]"
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="mt-7 text-center">
          <p className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-white/[0.06] px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/74">
            <ShieldCheck size={14} aria-hidden="true" />
            Secure marketplace
          </p>
          <h1 className="mt-4 text-2xl font-black tracking-normal">
            Loading Huntfields
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
            Preparing private hunting leases, map context, and protected access
            details.
          </p>
        </div>
      </div>
    </div>
  );
}
