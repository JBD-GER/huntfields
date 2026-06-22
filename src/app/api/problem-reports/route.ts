import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, emailTemplates } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const problemReportSchema = z.object({
  message: z.string().trim().min(10).max(2500),
});

type ProfileSummary = {
  role: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

function displayName(profile: ProfileSummary | null, fallback?: string | null) {
  return (
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    fallback ||
    "Huntfields user"
  );
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in before reporting a problem." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const parsed = problemReportSchema.safeParse({
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Write a short description of the problem." },
      { status: 400 },
    );
  }

  if (!env.adminNotificationEmail) {
    return NextResponse.json(
      { error: "The admin inbox is not configured yet." },
      { status: 500 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  const accountProfile = profile as ProfileSummary | null;
  const role = accountProfile?.role === "landowner" ? "landowner" : "hunter";
  const template = emailTemplates.dashboardProblemReport(
    displayName(accountProfile, user.email),
    user.email ?? "No email on account",
    role,
    parsed.data.message,
    appUrl("/dashboard"),
  );
  const result = await sendTransactionalEmail({
    to: env.adminNotificationEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo: user.email ?? undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.skipped
          ? "Email delivery is not configured yet."
          : result.error ?? "Unable to send the problem report.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
