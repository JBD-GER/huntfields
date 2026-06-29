import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { emailTemplates } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import {
  calculateLeasePricing,
  formatUsd,
  type LeasePricingInputs,
} from "@/lib/lease-pricing-calculator";
import {
  createLeasePricingReportPdfBytes,
  createLeasePricingReportText,
} from "@/lib/lease-pricing-report-pdf";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const leadSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.email().max(240),
});

const reportSchema = z.object({
  lead: leadSchema,
  inputs: z.object({
    state: z.string(),
    acres: z.number(),
    huntablePercent: z.number(),
    habitat: z.string(),
    demand: z.string(),
    evidence: z.string(),
    access: z.string(),
    exclusivity: z.string(),
    pressure: z.string(),
    boundaryStatus: z.string(),
    photoStatus: z.string(),
    rulesStatus: z.string(),
    leaseTerm: z.string(),
    partySize: z.number(),
    hasWater: z.boolean(),
    species: z.array(z.string()),
    amenities: z.array(z.string()),
    constraints: z.array(z.string()),
  }),
});

function reportFilename(firstName: string, lastName: string) {
  const name = `${lastName}-${firstName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `huntfields-lease-pricing-report-${name || "landowner"}.pdf`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter a valid first name, last name, and email." },
      { status: 400 },
    );
  }

  const { lead, inputs } = parsed.data;
  const pricingInputs = inputs as LeasePricingInputs;
  const result = calculateLeasePricing(pricingInputs);
  const fullName = `${lead.firstName} ${lead.lastName}`;
  const filename = reportFilename(lead.firstName, lead.lastName);
  const reportInput = {
    lead,
    inputs: pricingInputs,
    result,
  };
  const message = createLeasePricingReportText(reportInput);
  const pdfBytes = createLeasePricingReportPdfBytes(reportInput);
  const leadSummary = {
    priceRange: `${formatUsd(result.low)} - ${formatUsd(result.high)} ${result.unitLabel}`,
    targetAsk: `${formatUsd(result.target)} ${result.unitLabel}`,
    deposit: formatUsd(result.deposit),
    propertySummary: `${result.stateLabel}, ${Math.round(result.huntableAcres).toLocaleString("en-US")} huntable acres, ${result.termLabel}`,
    scores: {
      market: result.marketIndex,
      readiness: result.readinessScore,
      confidence: result.confidenceScore,
      confidenceLabel: result.confidenceLabel,
    },
  };

  const supabase = createSupabaseServiceClient();

  if (supabase) {
    const { error } = await supabase.from("contact_messages").insert({
      name: fullName,
      email: lead.email,
      topic: "Lease Pricing Calculator report",
      message,
    });

    if (error) {
      console.error("Lease pricing report lead could not be stored", error);
    }
  }

  if (env.adminNotificationEmail) {
    const template = emailTemplates.leasePricingReportLead({
      name: fullName,
      email: lead.email,
      ...leadSummary,
      recommendations: result.recommendations,
    });

    const mail = await sendTransactionalEmail({
      to: env.adminNotificationEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: lead.email,
    });

    if (!mail.ok && !mail.skipped) {
      console.error("Lease pricing report lead email failed", mail.error);
    }
  }

  const confirmationTemplate = emailTemplates.leasePricingReportConfirmation({
    name: lead.firstName,
    ...leadSummary,
  });
  const confirmationMail = await sendTransactionalEmail({
    to: lead.email,
    subject: confirmationTemplate.subject,
    html: confirmationTemplate.html,
    text: confirmationTemplate.text,
    attachments: [
      {
        filename,
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf",
      },
    ],
  });

  if (!confirmationMail.ok && !confirmationMail.skipped) {
    console.error("Lease pricing confirmation email failed", confirmationMail.error);
  }

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
