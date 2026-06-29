import { redirect } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  FileSignature,
  LockKeyhole,
  XCircle,
} from "lucide-react";
import { formatMoney } from "@/lib/payments/fees";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/seo/site";
import { getRequestVerificationGate } from "@/lib/verification/gates";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = pageMetadata({
  title: "Hunting lease agreement",
  description:
    "Review and electronically sign a Huntfields hunting lease agreement.",
  path: "/contracts",
  index: false,
});

export default async function ContractPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

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
        "id, booking_id, request_id, listing_id, hunter_id, landowner_id, status, title, contract_html, contract_hash, electronic_records_disclosure, generated_at, signed_at, lease_amount_cents, additional_fee_cents, hunter_platform_fee_cents, landowner_platform_fee_cents, landowner_payout_cents, hunter_total_cents, renewal_type, payment_due_at, bookings(status, payment_status, workflow_stage, checkout_url, currency, owner_transfer_status)",
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
  const hunterSignature = (signatures ?? []).find(
    (signature) => signature.signer_role === "hunter",
  );
  const landownerSignature = (signatures ?? []).find(
    (signature) => signature.signer_role === "landowner",
  );
  const hunterSigned = Boolean(hunterSignature);
  const landownerSigned = Boolean(landownerSignature);
  const alreadySigned = (signatures ?? []).some(
    (signature) => signature.signer_id === user.id,
  );
  const fullySigned = contract.status === "signed";
  const booking = Array.isArray(contract.bookings)
    ? contract.bookings[0]
    : contract.bookings;
  const currency = booking?.currency ?? "USD";
  const paymentState = Array.isArray(query.payment_state)
    ? query.payment_state[0]
    : query.payment_state;
  const renewalState = Array.isArray(query.renewal_state)
    ? query.renewal_state[0]
    : query.renewal_state;
  const { data: renewalCycle } = await supabase
    .from("booking_renewal_cycles")
    .select(
      "id, status, payment_status, renewal_starts_on, renewal_ends_on, hunter_total_cents, currency, checkout_url",
    )
    .eq("booking_id", contract.booking_id)
    .in("status", [
      "notice_due",
      "notice_sent",
      "payment_due",
      "checkout_created",
      "payment_processing",
      "manual_pending",
      "paid",
      "expired",
      "cancelled",
    ])
    .order("renewal_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const verificationGate =
    contract.request_id && service
      ? await getRequestVerificationGate(service, contract.request_id)
      : null;
  const finalizationReady = verificationGate?.data?.canFinalize ?? false;
  const finalizationReason =
    verificationGate?.data?.reason ??
    "Verification status must be available before signatures or payment can proceed.";
  const paymentPaid = booking?.payment_status === "paid";
  const canHunterSign =
    signerRole === "hunter" &&
    !hunterSigned &&
    contract.status === "sent" &&
    finalizationReady;
  const canPay =
    signerRole === "hunter" &&
    hunterSigned &&
    !paymentPaid &&
    !landownerSigned &&
    finalizationReady;
  const canLandownerSign =
    signerRole === "landowner" &&
    hunterSigned &&
    paymentPaid &&
    !landownerSigned &&
    contract.status === "partially_signed" &&
    finalizationReady;
  const renewalPayable =
    renewalCycle &&
    !["paid", "expired", "cancelled"].includes(renewalCycle.status) &&
    renewalCycle.payment_status !== "paid";
  const canRenew =
    signerRole === "hunter" &&
    fullySigned &&
    paymentPaid &&
    Boolean(renewalPayable);
  const workflowTitle = !hunterSigned
    ? "Waiting for hunter signature"
    : !paymentPaid
      ? "Hunter signed. Payment is due."
      : !landownerSigned
        ? "Payment received. Landowner signature is ready."
        : "Agreement active";
  const workflowBody = !hunterSigned
    ? "The hunter signs first. Checkout is locked until that signature is saved."
    : !paymentPaid
      ? "The hunter can now complete Stripe Checkout. Landowner countersignature stays locked until payment clears."
      : !landownerSigned
        ? "The landowner can now countersign. After that, Huntfields starts the owner payout transfer workflow."
        : "Both signatures are saved, payment is confirmed, and the owner payout workflow has started.";

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c76b2f]">
            Lease agreement
          </p>
          <h1 className="mt-2 break-words text-2xl font-black tracking-normal text-stone-950 sm:text-3xl">
            {contract.title}
          </h1>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-800">
          <LockKeyhole size={16} aria-hidden="true" />
          {contract.status.replaceAll("_", " ")}
        </span>
      </div>

      <section className="rounded-md border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-6 grid gap-3 rounded-md border border-[#234331]/10 bg-[#fbfaf6] p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
          <FinancialStat
            label="Hunter total due"
            value={formatMoney(contract.hunter_total_cents, currency)}
          />
          <FinancialStat
            label="Landowner payout"
            value={formatMoney(contract.landowner_payout_cents, currency)}
          />
          <FinancialStat
            label="Platform fees"
            value={formatMoney(
              (contract.hunter_platform_fee_cents ?? 0) +
                (contract.landowner_platform_fee_cents ?? 0),
              currency,
            )}
          />
        </div>
        <div className="lease-contract-content prose max-w-none prose-stone">
          <div dangerouslySetInnerHTML={{ __html: contract.contract_html }} />
        </div>
        <div className="mt-6 rounded-md bg-[#f8f6f0] p-3 text-xs leading-5 text-stone-600 sm:p-4">
          Contract hash:{" "}
          <span className="break-all font-mono">{contract.contract_hash}</span>
        </div>
      </section>

      <section className="mt-6 grid gap-4 rounded-md border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
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
        <div className="grid gap-2 rounded-md border border-[#d9c6aa] bg-[#fff9ef] p-4 text-sm leading-6 text-stone-700">
          <p className="font-bold text-stone-950">{workflowTitle}</p>
          <p>{workflowBody}</p>
          {paymentState === "connect_required" ? (
            <p className="font-semibold text-[#8a4a20]">
              Stripe Connect is not fully enabled for this landowner yet.
              Payment is marked as manual pending.
            </p>
          ) : null}
          {renewalState === "connect_required" ? (
            <p className="font-semibold text-[#8a4a20]">
              Stripe Connect is not fully enabled for this landowner yet.
              Renewal payment is marked as manual pending.
            </p>
          ) : null}
          {booking?.payment_status ? (
            <p className="font-semibold">
              Payment status: {booking.payment_status.replaceAll("_", " ")}
            </p>
          ) : null}
          {renewalCycle ? (
            <p className="font-semibold">
              Renewal: {renewalCycle.status.replaceAll("_", " ")}
              {" / "}
              {formatMoney(
                renewalCycle.hunter_total_cents,
                renewalCycle.currency ?? currency,
              )}{" "}
              for {renewalCycle.renewal_starts_on} through{" "}
              {renewalCycle.renewal_ends_on}
            </p>
          ) : null}
          {booking?.owner_transfer_status &&
          booking.owner_transfer_status !== "not_started" ? (
            <p className="font-semibold">
              Owner payout: {booking.owner_transfer_status.replaceAll("_", " ")}
            </p>
          ) : null}
        </div>
        {!finalizationReady && (
          <div className="flex items-start gap-3 rounded-md border border-[#d9c6aa] bg-[#fff9ef] p-4 text-sm leading-6 text-stone-700">
            <XCircle className="mt-0.5 size-5 shrink-0 text-[#c76b2f]" aria-hidden="true" />
            <div>
              <p className="font-black text-stone-950">
                Verification required
              </p>
              <p className="mt-1">{finalizationReason}</p>
            </div>
          </div>
        )}
        {alreadySigned && !fullySigned && signerRole === "hunter" ? (
          <p className="text-sm font-semibold text-[#234331]">
            Your signature is saved. Complete checkout to unlock the landowner
            countersignature.
          </p>
        ) : null}
        {alreadySigned && !fullySigned && signerRole === "landowner" ? (
          <p className="text-sm font-semibold text-[#234331]">
            Your signature is saved. The agreement is being activated.
          </p>
        ) : null}
        {canPay ? (
          <form action={`/api/bookings/${contract.booking_id}/checkout`} method="post">
            <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#234331] px-5 font-bold text-white transition hover:bg-[#162d22] sm:w-auto">
              <CreditCard size={17} aria-hidden="true" />
              Complete checkout
            </button>
          </form>
        ) : null}
        {canRenew ? (
          <form
            action={`/api/bookings/${contract.booking_id}/renewal-checkout`}
            method="post"
          >
            <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#234331] px-5 font-bold text-white transition hover:bg-[#162d22] sm:w-auto">
              <CreditCard size={17} aria-hidden="true" />
              Complete renewal checkout
            </button>
          </form>
        ) : null}
        {signerRole === "landowner" &&
        hunterSigned &&
        !paymentPaid &&
        !landownerSigned &&
        finalizationReady ? (
          <div className="rounded-md border border-stone-200 bg-[#fbfaf6] p-4 text-sm font-semibold text-stone-700">
            Waiting for hunter payment before landowner signature.
          </div>
        ) : null}
        {(canHunterSign || canLandownerSign) && (
          <form action={`/api/contracts/${id}/sign`} method="post" className="grid gap-4">
            <input type="hidden" name="signer_role" value={signerRole ?? ""} />
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
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#234331] px-5 font-bold text-white transition hover:bg-[#162d22] sm:w-auto"
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

function FinancialStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c76b2f]">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-stone-950">{value}</p>
    </div>
  );
}
