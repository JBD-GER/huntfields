import { ExternalLink, ShieldCheck } from "lucide-react";
import type { UsStateHuntingRule } from "@/lib/compliance/us-state-rules";

export function StateRulePanel({
  rule,
  title = "State hunting notes",
}: {
  rule: UsStateHuntingRule;
  title?: string;
}) {
  return (
    <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_16px_46px_rgba(25,35,29,0.08)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#eef3ec] text-[#234331]">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#c76b2f]">
            {title}
          </p>
          <h2 className="mt-2 text-xl font-black text-stone-950">
            {rule.state_name} access and license checks
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            These notes are pulled from state-specific configuration and should
            be verified with {rule.agency_name} before any booking or access.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 text-sm leading-6 text-stone-700 md:grid-cols-2">
        {[
          ["License", rule.license_summary],
          ["Hunter education", rule.hunter_education_summary],
          ["Private land", rule.private_land_permission_summary],
          ["Lease license", rule.lease_license_summary],
        ]
          .filter(([, body]) => Boolean(body))
          .map(([label, body]) => (
            <div
              key={label}
              className="rounded-md border border-[#234331]/8 bg-[#f8f4eb] p-3"
            >
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#234331]">
                {label}
              </p>
              <p className="mt-1 font-semibold text-stone-700">{body}</p>
            </div>
          ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <a
          href={rule.agency_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-[#234331]/20 bg-[#eef3ec] px-2 py-1 text-xs font-black text-[#234331] transition hover:border-[#234331]"
        >
          {rule.agency_name}
          <ExternalLink size={13} aria-hidden="true" />
        </a>
        {rule.source_urls.map((source) => (
          <a
            key={source}
            href={source}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 px-2 py-1 text-xs font-bold text-stone-700 transition hover:border-[#234331] hover:text-[#234331]"
          >
            Source
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        ))}
        <span className="ml-auto text-xs font-semibold text-stone-500">
          Review before access
        </span>
      </div>
    </section>
  );
}
