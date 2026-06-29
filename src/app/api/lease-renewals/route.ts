import { NextResponse } from "next/server";
import { appUrl, emailTemplates } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { calculateMarketplaceFees, formatMoney } from "@/lib/payments/fees";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

type BookingRow = {
  id: string;
  request_id: string | null;
  listing_id: string;
  hunter_id: string;
  landowner_id: string;
  status: string | null;
  workflow_stage: string | null;
  payment_status: string | null;
  starts_on: string;
  ends_on: string;
  amount_cents: number | null;
  lease_amount_cents: number | null;
  additional_fee_cents: number | null;
  renewal_type: string | null;
  renewal_notice_days: number | null;
  currency: string | null;
  listings: { title: string | null } | { title: string | null }[] | null;
};

type ContractRow = {
  id: string;
  title: string | null;
};

type RenewalCycleRow = {
  id: string;
  renewal_number: number;
  status: string;
  payment_status: string;
  notice_sent_at: string | null;
  expired_at: string | null;
  paid_at: string | null;
  renewal_starts_on: string;
  renewal_ends_on: string;
  hunter_total_cents: number;
  currency: string;
};

const openRenewalStatuses = new Set([
  "notice_due",
  "notice_sent",
  "payment_due",
  "checkout_created",
  "payment_processing",
  "manual_pending",
]);

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function dateToIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const { year, month, day } = dateParts(value);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return dateToIso(date);
}

function addYears(value: string, years: number) {
  const { year, month, day } = dateParts(value);
  const date = new Date(Date.UTC(year + years, month - 1, day));

  return dateToIso(date);
}

function paymentDueAt(endsOn: string) {
  return new Date(`${endsOn}T23:59:59.000Z`).toISOString();
}

async function isAuthorized(request: Request, service: ServiceClient) {
  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (env.leaseRenewalCronSecret && bearer === env.leaseRenewalCronSecret) {
    return true;
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return false;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin";
}

async function latestContract(service: ServiceClient, bookingId: string) {
  const { data } = await service
    .from("booking_contracts")
    .select("id, title")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as ContractRow | null;
}

async function latestRenewalCycle(service: ServiceClient, bookingId: string) {
  const { data } = await service
    .from("booking_renewal_cycles")
    .select(
      "id, renewal_number, status, payment_status, notice_sent_at, expired_at, paid_at, renewal_starts_on, renewal_ends_on, hunter_total_cents, currency",
    )
    .eq("booking_id", bookingId)
    .order("renewal_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as RenewalCycleRow | null;
}

async function sendRenewalDueEmails({
  service,
  booking,
  contract,
  cycle,
}: {
  service: ServiceClient;
  booking: BookingRow;
  contract: ContractRow;
  cycle: RenewalCycleRow;
}) {
  const [hunter, landowner] = await Promise.all([
    service.auth.admin.getUserById(booking.hunter_id),
    service.auth.admin.getUserById(booking.landowner_id),
  ]);
  const contractUrl = appUrl(`/contracts/${contract.id}?renewal=due`);
  const title =
    contract.title ??
    firstRelation(booking.listings)?.title ??
    "Huntfields hunting lease";

  if (hunter.data.user?.email) {
    const template = emailTemplates.renewalPaymentDue(
      title,
      cycle.renewal_starts_on,
      cycle.renewal_ends_on,
      formatMoney(cycle.hunter_total_cents, cycle.currency),
      contractUrl,
    );
    await sendTransactionalEmail({
      to: hunter.data.user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  if (landowner.data.user?.email) {
    const template = emailTemplates.ownerRenewalNotice(
      title,
      cycle.renewal_starts_on,
      cycle.renewal_ends_on,
      contractUrl,
    );
    await sendTransactionalEmail({
      to: landowner.data.user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }
}

async function sendExpiredEmails({
  service,
  booking,
  contract,
}: {
  service: ServiceClient;
  booking: BookingRow;
  contract: ContractRow;
}) {
  const [hunter, landowner] = await Promise.all([
    service.auth.admin.getUserById(booking.hunter_id),
    service.auth.admin.getUserById(booking.landowner_id),
  ]);
  const recipients = [
    hunter.data.user?.email,
    landowner.data.user?.email,
  ].filter(Boolean) as string[];

  if (!recipients.length) {
    return;
  }

  const title =
    contract.title ??
    firstRelation(booking.listings)?.title ??
    "Huntfields hunting lease";
  const template = emailTemplates.leaseExpired(
    title,
    booking.ends_on,
    appUrl(`/contracts/${contract.id}`),
  );

  await sendTransactionalEmail({
    to: recipients,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

async function createRenewalCycle({
  service,
  booking,
  contract,
  renewalNumber,
  today,
}: {
  service: ServiceClient;
  booking: BookingRow;
  contract: ContractRow;
  renewalNumber: number;
  today: string;
}) {
  const noticeDays = booking.renewal_notice_days ?? 30;
  const noticeDueOn = addDays(booking.ends_on, -noticeDays);
  const fees = calculateMarketplaceFees({
    leaseAmountCents: booking.lease_amount_cents ?? booking.amount_cents ?? 0,
    additionalFeeCents: booking.additional_fee_cents ?? 0,
    isRenewal: true,
  });
  const expired = today > booking.ends_on;

  const { data, error } = await service
    .from("booking_renewal_cycles")
    .insert({
      booking_id: booking.id,
      request_id: booking.request_id,
      listing_id: booking.listing_id,
      original_contract_id: contract.id,
      hunter_id: booking.hunter_id,
      landowner_id: booking.landowner_id,
      renewal_number: renewalNumber,
      status: expired ? "expired" : "notice_sent",
      payment_status: expired ? "expired" : "payment_due",
      previous_starts_on: booking.starts_on,
      previous_ends_on: booking.ends_on,
      renewal_starts_on: addYears(booking.starts_on, 1),
      renewal_ends_on: addYears(booking.ends_on, 1),
      notice_due_on: noticeDueOn,
      payment_due_at: paymentDueAt(booking.ends_on),
      lease_amount_cents: fees.leaseAmountCents,
      additional_fee_cents: fees.additionalFeeCents,
      owner_platform_fee_cents: fees.ownerPlatformFeeCents,
      hunter_platform_fee_cents: fees.hunterPlatformFeeCents,
      application_fee_cents: fees.applicationFeeCents,
      landowner_payout_cents: fees.landownerPayoutCents,
      hunter_total_cents: fees.hunterTotalCents,
      currency: booking.currency ?? "USD",
      notice_sent_at: expired ? null : new Date().toISOString(),
      expired_at: null,
    })
    .select(
      "id, renewal_number, status, payment_status, notice_sent_at, expired_at, paid_at, renewal_starts_on, renewal_ends_on, hunter_total_cents, currency",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Renewal cycle could not be created.");
  }

  await service.from("booking_workflow_events").insert({
    booking_id: booking.id,
    request_id: booking.request_id,
    event_type: expired ? "lease_renewal_expired" : "lease_renewal_notice_sent",
    payload: {
      renewal_cycle_id: data.id,
      renewal_number: data.renewal_number,
      renewal_starts_on: data.renewal_starts_on,
      renewal_ends_on: data.renewal_ends_on,
      hunter_total_cents: data.hunter_total_cents,
      landowner_payout_cents: fees.landownerPayoutCents,
    },
  });

  return data as RenewalCycleRow;
}

async function expireBooking({
  service,
  booking,
  contract,
  cycle,
}: {
  service: ServiceClient;
  booking: BookingRow;
  contract: ContractRow;
  cycle: RenewalCycleRow;
}) {
  if (!cycle.expired_at) {
    const { data: expiredCycle } = await service
      .from("booking_renewal_cycles")
      .update({
        status: "expired",
        payment_status: "expired",
        expired_at: new Date().toISOString(),
      })
      .eq("id", cycle.id)
      .is("paid_at", null)
      .neq("payment_status", "paid")
      .select("id")
      .maybeSingle();

    if (!expiredCycle) {
      return;
    }

    await Promise.all([
      service
        .from("bookings")
        .update({
          status: "completed",
          workflow_stage: "completed",
        })
        .eq("id", booking.id)
        .eq("status", "confirmed"),
      service.from("booking_workflow_events").insert({
        booking_id: booking.id,
        request_id: booking.request_id,
        event_type: "lease_expired_without_renewal_payment",
        payload: {
          renewal_cycle_id: cycle.id,
          ended_on: booking.ends_on,
        },
      }),
    ]);

    await sendExpiredEmails({ service, booking, contract });
  }
}

async function processRenewals(request: Request) {
  const service = createSupabaseServiceClient();

  if (!service) {
    return NextResponse.json(
      { error: "Supabase service role is required for lease renewals." },
      { status: 500 },
    );
  }

  if (!(await isAuthorized(request, service))) {
    return NextResponse.json(
      { error: "Not authorized to process lease renewals." },
      { status: 401 },
    );
  }

  const today =
    new URL(request.url).searchParams.get("date") ?? dateToIso(new Date());
  const horizon = addDays(today, 366);
  const { data: bookings, error } = await service
    .from("bookings")
    .select(
      "id, request_id, listing_id, hunter_id, landowner_id, status, workflow_stage, payment_status, starts_on, ends_on, amount_cents, lease_amount_cents, additional_fee_cents, renewal_type, renewal_notice_days, currency, listings(title)",
    )
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .neq("renewal_type", "none")
    .lte("ends_on", horizon)
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let created = 0;
  let notified = 0;
  let expired = 0;
  let skipped = 0;

  for (const booking of (bookings ?? []) as BookingRow[]) {
    const noticeDueOn = addDays(
      booking.ends_on,
      -(booking.renewal_notice_days ?? 30),
    );

    if (today < noticeDueOn) {
      skipped += 1;
      continue;
    }

    const contract = await latestContract(service, booking.id);

    if (!contract) {
      skipped += 1;
      continue;
    }

    const latestCycle = await latestRenewalCycle(service, booking.id);
    const openCycle =
      latestCycle && openRenewalStatuses.has(latestCycle.status)
        ? latestCycle
        : null;
    const renewalNumber = latestCycle ? latestCycle.renewal_number + 1 : 1;
    const cycle =
      openCycle ??
      (await createRenewalCycle({
        service,
        booking,
        contract,
        renewalNumber,
        today,
      }));

    if (!openCycle) {
      created += 1;
    }

    if (today > booking.ends_on) {
      await expireBooking({ service, booking, contract, cycle });
      expired += 1;
      continue;
    }

    if (!cycle.notice_sent_at) {
      await service
        .from("booking_renewal_cycles")
        .update({
          status: "notice_sent",
          payment_status: "payment_due",
          notice_sent_at: new Date().toISOString(),
        })
        .eq("id", cycle.id);
      await sendRenewalDueEmails({ service, booking, contract, cycle });
      notified += 1;
    } else if (!openCycle) {
      await sendRenewalDueEmails({ service, booking, contract, cycle });
      notified += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    date: today,
    created,
    notified,
    expired,
    skipped,
  });
}

export async function GET(request: Request) {
  return processRenewals(request);
}

export async function POST(request: Request) {
  return processRenewals(request);
}
