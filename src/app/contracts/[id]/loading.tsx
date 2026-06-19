import { FileSignature, ShieldCheck } from "lucide-react";

export default function ContractLoading() {
  return (
    <main className="mx-auto max-w-5xl px-3 py-8 sm:px-6 sm:py-12 lg:px-8">
      <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_50px_rgba(25,35,29,0.08)] sm:p-8">
        <div className="flex items-start gap-4">
          <div className="huntfields-app-loader grid size-14 shrink-0 place-items-center rounded-md bg-[#183326] text-white">
            <FileSignature size={24} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
              Agreement
            </p>
            <h1 className="mt-2 text-3xl font-black text-stone-950">
              Preparing secure contract
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-stone-600">
              Loading parties, access terms, signing status, and protected
              booking details.
            </p>
          </div>
        </div>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-[#e8e1d4]">
          <div className="huntfields-route-loading-bar h-full w-1/3 bg-[#183326]" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {["Hunter", "Landowner", "Terms"].map((item) => (
            <div
              key={item}
              className="rounded-md border border-[#234331]/10 bg-[#f6f2e9] p-4"
            >
              <ShieldCheck className="size-5 text-[#234331]" aria-hidden="true" />
              <p className="mt-3 text-sm font-black text-stone-900">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
