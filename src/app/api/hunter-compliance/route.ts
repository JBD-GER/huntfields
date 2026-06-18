import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  legal_first_name: z.string().min(1).max(120),
  legal_last_name: z.string().min(1).max(120),
  date_of_birth: z.string().min(8),
  residency_state_code: z.string().max(2).optional(),
  hunting_license_state_code: z.string().length(2),
  hunting_license_number: z.string().max(120).optional(),
  hunting_license_expires_on: z.string().optional(),
  hunter_education_number: z.string().max(120).optional(),
});

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
      { error: "Sign in before completing hunter onboarding." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const parsed = schema.safeParse({
    legal_first_name: formData.get("legal_first_name"),
    legal_last_name: formData.get("legal_last_name"),
    date_of_birth: formData.get("date_of_birth"),
    residency_state_code: String(formData.get("residency_state_code") ?? "")
      .trim()
      .toUpperCase(),
    hunting_license_state_code: String(
      formData.get("hunting_license_state_code") ?? "",
    )
      .trim()
      .toUpperCase(),
    hunting_license_number: formData.get("hunting_license_number") ?? "",
    hunting_license_expires_on:
      formData.get("hunting_license_expires_on") || undefined,
    hunter_education_number: formData.get("hunter_education_number") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please complete hunter onboarding fields." },
      { status: 400 },
    );
  }

  const requiredChecks = [
    "rules_acknowledged",
    "liability_waiver_acknowledged",
    "electronic_records_consent",
  ];

  if (requiredChecks.some((key) => formData.get(key) !== "on")) {
    return NextResponse.json(
      { error: "Please accept the required hunter acknowledgements." },
      { status: 400 },
    );
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    role: "hunter",
    full_name:
      `${parsed.data.legal_first_name} ${parsed.data.legal_last_name}`.trim(),
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error } = await supabase.from("hunter_compliance_profiles").upsert({
    user_id: user.id,
    legal_first_name: parsed.data.legal_first_name,
    legal_last_name: parsed.data.legal_last_name,
    date_of_birth: parsed.data.date_of_birth,
    residency_country_code: "US",
    residency_state_code: parsed.data.residency_state_code || null,
    hunter_education_completed:
      formData.get("hunter_education_completed") === "on",
    hunter_education_state_code: parsed.data.hunting_license_state_code,
    hunter_education_number: parsed.data.hunter_education_number || null,
    hunting_license_state_code: parsed.data.hunting_license_state_code,
    hunting_license_number: parsed.data.hunting_license_number || null,
    hunting_license_expires_on:
      parsed.data.hunting_license_expires_on || null,
    electronic_records_consent: true,
    rules_acknowledged: true,
    liability_waiver_acknowledged: true,
    attestations: {
      accepted: formData.getAll("attestations"),
    },
    completed_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
