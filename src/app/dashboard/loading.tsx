import { Inbox, MapPinned, MessageSquareText, ShieldCheck } from "lucide-react";

export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-7xl px-3 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_50px_rgba(25,35,29,0.08)] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
              Account workspace
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-normal text-stone-950">
              Loading your dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-stone-600">
              Syncing requests, messages, saved leases, and owner workflows.
            </p>
          </div>
          <div className="huntfields-app-loader grid size-16 place-items-center rounded-md bg-[#183326] text-white shadow-[0_18px_42px_rgba(24,51,38,0.22)]">
            <ShieldCheck size={26} aria-hidden="true" />
          </div>
        </div>
      </section>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [Inbox, "Requests"],
          [MessageSquareText, "Messages"],
          [MapPinned, "Listings"],
          [ShieldCheck, "Approvals"],
        ].map(([Icon, label]) => {
          const IconComponent = Icon as typeof Inbox;
          return (
            <div
              key={String(label)}
              className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-4 shadow-[0_14px_38px_rgba(25,35,29,0.06)]"
            >
              <IconComponent className="size-5 text-[#c76b2f]" aria-hidden="true" />
              <p className="mt-4 text-sm font-black text-stone-950">
                {String(label)}
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#e8e1d4]">
                <div className="huntfields-route-loading-bar h-full w-1/2 bg-[#183326]" />
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
