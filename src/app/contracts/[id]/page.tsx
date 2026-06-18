import { redirect } from "next/navigation";
import { CheckCircle2, FileSignature, LockKeyhole } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/seo/site";

type Params = Promise<{ id: string }>;

export const metadata = pageMetadata({
  title: "Hunting lease agreement",
  description:
    "Review and electronically sign a Huntfields hunting lease agreement.",
  path: "/contracts",
  index: false,
});

export default async function ContractPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">
          Supabase required
        </h1>
        <p className="mt-3 text-stone-600">
          Configure Supabase to review and sign contracts.
        </p>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=/contracts/${id}`);
  }

  const [{ data: contract, error }, { data: signatures }] = await Promise.all([
    supabase
      .from("booking_contracts")
      .select(
        "id, booking_id, listing_id, hunter_id, landowner_id, status, title, contract_html, contract_hash, electronic_records_disclosure, generated_at, signed_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("contract_signatures")
      .select("signer_id, signer_role, typed_name, signed_at")
      .eq("contract_id", id),
  ]);

  if (error || !contract) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">
          Contract unavailable
        </h1>
        <p className="mt-3 text-stone-600">
          {error?.message ?? "This contract is not available to your account."}
        </p>
      </div>
    );
  }

  const signerRole =
    contract.hunter_id === user.id
      ? "hunter"
      : contract.landowner_id === user.id
        ? "landowner"
        : null;
  const alreadySigned = (signatures ?? []).some(
    (signature) => signature.signer_id === user.id,
  );
  const fullySigned = contract.status === "signed";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c76b2f]">
            Lease agreement
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-stone-950">
            {contract.title}
          </h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-800">
          <LockKeyhole size={16} aria-hidden="true" />
          {contract.status.replaceAll("_", " ")}
        </span>
      </div>

      <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
        <div className="lease-contract-content prose max-w-none prose-stone">
          <div dangerouslySetInnerHTML={{ __html: contract.contract_html }} />
        </div>
        <div className="mt-6 rounded-md bg-[#f8f6f0] p-4 text-xs leading-5 text-stone-600">
          Contract hash: <span className="font-mono">{contract.contract_hash}</span>
        </div>
      </section>

      <section className="mt-6 grid gap-4 rounded-md border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-xl font-black text-stone-950">
          <FileSignature size={20} aria-hidden="true" />
          Electronic signatures
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["hunter", "landowner"] as const).map((role) => {
            const signature = (signatures ?? []).find(
              (item) => item.signer_role === role,
            );
            return (
              <div
                key={role}
                className="rounded-md border border-stone-200 bg-[#fbfaf6] p-4"
              >
                <p className="font-bold capitalize text-stone-950">{role}</p>
                {signature ? (
                  <p className="mt-2 flex items-center gap-2 text-sm text-[#234331]">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    Signed by {signature.typed_name}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-stone-600">Awaiting signature</p>
                )}
              </div>
            );
          })}
        </div>

        {!signerRole && (
          <p className="text-sm font-semibold text-red-700">
            This contract is visible only to the hunter, landowner, or admin.
          </p>
        )}
        {alreadySigned && !fullySigned && (
          <p className="text-sm font-semibold text-[#234331]">
            Your signature is saved. Waiting for the other party.
          </p>
        )}
        {fullySigned && (
          <p className="text-sm font-semibold text-[#234331]">
            Fully signed. The related booking is confirmed.
          </p>
        )}
        {signerRole && !alreadySigned && !fullySigned && (
          <form action={`/api/contracts/${id}/sign`} method="post" className="grid gap-4">
            <input type="hidden" name="signer_role" value={signerRole} />
            <label className="grid gap-2 text-sm font-semibold text-stone-800">
              Type your legal name
              <input
                name="typed_name"
                required
                className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
              />
            </label>
            <label className="flex gap-3 text-sm font-semibold leading-6 text-stone-800">
              <input
                name="electronic_records_consent"
                type="checkbox"
                required
                className="mt-1 size-4 rounded border-stone-300 text-[#234331]"
              />
              {contract.electronic_records_disclosure}
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#234331] px-5 font-bold text-white transition hover:bg-[#162d22]"
            >
              <FileSignature size={17} aria-hidden="true" />
              Sign agreement
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
