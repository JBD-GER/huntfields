import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { formValue } from "@/lib/utils";

const schema = z.object({
  role: z.enum(["hunter", "landowner"]),
  first_name: z.string().min(1).max(120),
  last_name: z.string().min(1).max(120),
  street_address: z.string().min(1).max(240),
  city: z.string().min(1).max(120),
  admin_area_code: z.string().max(24).optional(),
  postal_code: z.string().max(40).optional(),
  phone: z.string().max(80).optional(),
});

type OnboardingProfile = z.infer<typeof schema>;

function rpcUnavailable(error: { code?: string; message?: string }) {
  const message = error.message ?? "";

  return (
    error.code === "PGRST202" ||
    message.includes("complete_profile_onboarding") ||
    message.includes("schema cache")
  );
}

async function saveProfileDirectly(
  userId: string,
  data: OnboardingProfile,
  fallbackClient: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
) {
  const service = createSupabaseServiceClient();
  const db = service ?? fallbackClient;
  const fullName = `${data.first_name} ${data.last_name}`.trim();
  const now = new Date().toISOString();
  const fullPayload = {
    id: userId,
    role: data.role,
    full_name: fullName,
    first_name: data.first_name,
    last_name: data.last_name,
    street_address: data.street_address,
    city: data.city,
    admin_area_code: data.admin_area_code || null,
    postal_code: data.postal_code || null,
    phone: data.phone || null,
    country_code: "US",
    onboarding_completed: true,
    role_selected_at: now,
  };

  const { error: fullError } = await db
    .from("profiles")
    .upsert(fullPayload, { onConflict: "id" });

  if (!fullError) {
    return null;
  }

  const basePayload = {
    id: userId,
    role: data.role,
    full_name: fullName,
    phone: data.phone || null,
    country_code: "US",
    onboarding_completed: true,
  };

  const { error: baseError } = await db
    .from("profiles")
    .upsert(basePayload, { onConflict: "id" });

  return baseError ?? fullError;
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
      { error: "Sign in before onboarding." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const parsed = schema.safeParse({
    role: formValue(formData, "role"),
    first_name: formValue(formData, "first_name"),
    last_name: formValue(formData, "last_name"),
    street_address: formValue(formData, "street_address"),
    city: formValue(formData, "city"),
    admin_area_code: formValue(formData, "admin_area_code").toUpperCase(),
    postal_code: formValue(formData, "postal_code"),
    phone: formValue(formData, "phone"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please complete the onboarding fields." },
      { status: 400 },
    );
  }

  if (
    parsed.data.role === "landowner" &&
    formData.get("landowner_attestation") !== "on"
  ) {
    return NextResponse.json(
      { error: "Confirm that you are authorized to list land." },
      { status: 400 },
    );
  }

  const { error } = await supabase.rpc("complete_profile_onboarding", {
    p_role: parsed.data.role,
    p_first_name: parsed.data.first_name,
    p_last_name: parsed.data.last_name,
    p_street_address: parsed.data.street_address,
    p_city: parsed.data.city,
    p_admin_area_code: parsed.data.admin_area_code || null,
    p_postal_code: parsed.data.postal_code || null,
    p_phone: parsed.data.phone || null,
  });

  if (error && rpcUnavailable(error)) {
    const fallbackError = await saveProfileDirectly(
      user.id,
      parsed.data,
      supabase,
    );

    if (!fallbackError) {
      return NextResponse.json({ ok: true, saved_via: "direct_profile" });
    }

    return NextResponse.json(
      { error: fallbackError.message },
      { status: 500 },
    );
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
