import { ExternalLink, ShieldCheck } from "lucide-react";
import type { UsStateHuntingRule } from "@/lib/compliance/us-state-rules";

export function StateRulePanel({
  rule,
  title = "State compliance",
}: {
  rule: UsStateHuntingRule;
  title?: string;
}) {
  return (
    <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 size-5 text-[#2f6f8f]" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#c76b2f]">
            {title}
          </p>
          <h2 className="mt-2 text-xl font-black text-stone-950">
            {rule.state_name} hunting lease checks
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Rules change. Huntfields stores state-specific checklist prompts,
            but hunters and landowners must verify current agency regulations.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 text-sm leading-6 text-stone-700">
        <p>
          <strong className="text-stone-950">License:</strong>{" "}
          {rule.license_summary}
        </p>
        <p>
          <strong className="text-stone-950">Hunter education:</strong>{" "}
          {rule.hunter_education_summary}
        </p>
        <p>
          <strong className="text-stone-950">Private land:</strong>{" "}
          {rule.private_land_permission_summary}
        </p>
        {rule.lease_license_summary && (
          <p>
            <strong className="text-stone-950">Lease license:</strong>{" "}
            {rule.lease_license_summary}
          </p>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
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
      </div>
    </section>
  );
}
