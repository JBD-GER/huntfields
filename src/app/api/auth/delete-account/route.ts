import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

function redirectWithError(request: Request, message: string) {
  const url = new URL("/dashboard", request.url);
  url.searchParams.set("account_error", message);
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const confirmation = String(formData.get("confirm") ?? "").trim();

  if (confirmation !== "DELETE") {
    return redirectWithError(
      request,
      'Type "DELETE" exactly before deleting your account.',
    );
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return redirectWithError(
      request,
      "Supabase is not configured for authenticated account deletion.",
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const service = createSupabaseServiceClient();

  if (!service) {
    return redirectWithError(
      request,
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it server-side before deleting auth users.",
    );
  }

  const { error } = await service.auth.admin.deleteUser(user.id);

  if (error) {
    return redirectWithError(
      request,
      `Unable to delete this auth user: ${error.message}. If the account owns listings, requests, bookings, or contracts, archive or transfer that marketplace data first.`,
    );
  }

  await supabase.auth.signOut({ scope: "local" });

  return NextResponse.redirect(
    new URL("/auth/login?account_deleted=1", request.url),
  );
}
