import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
