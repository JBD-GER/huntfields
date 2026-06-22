import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

const schema = z.object({
  date_of_birth: z.string().min(8),
  hunting_license_state_code: z.string().length(2),
  hunting_license_number: z.string().max(120).optional(),
  hunting_license_expires_on: z.string().optional(),
  hunter_education_number: z.string().max(120).optional(),
  hunter_education_status: z
    .enum(["completed", "deferral", "exempt", "not_required_yet"])
    .default("completed"),
});

const allowedDocumentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const maxDocumentSize = 15 * 1024 * 1024;

type HunterDocumentUpload = {
  kind: "hunting_license" | "hunter_education";
  bucket: "verification-documents";
  path: string;
  file_name: string;
  content_type: string;
  file_size: number;
};

function fileFrom(formData: FormData, name: string) {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

function safeFileName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function uploadHunterDocument({
  supabase,
  userId,
  kind,
  bucket,
  file,
}: {
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
  userId: string;
  kind: HunterDocumentUpload["kind"];
  bucket: HunterDocumentUpload["bucket"];
  file: File;
}): Promise<{ data?: HunterDocumentUpload; error?: string }> {
  const contentType = file.type || "application/octet-stream";

  if (!allowedDocumentTypes.includes(contentType)) {
    return {
      error: "Upload PDF, JPEG, PNG, or WebP documents only.",
    };
  }

  if (file.size > maxDocumentSize) {
    return {
      error: "Verification documents must be 15 MB or smaller.",
    };
  }

  const fileName = safeFileName(file.name || `${kind}.pdf`) || `${kind}.pdf`;
  const storagePath = `${userId}/hunter-compliance/${crypto.randomUUID()}-${fileName}`;
  const upload = await supabase.storage.from(bucket).upload(storagePath, file, {
    contentType,
    upsert: false,
  });

  if (upload.error) {
    return { error: upload.error.message };
  }

  return {
    data: {
      kind,
      bucket,
      path: storagePath,
      file_name: fileName,
      content_type: contentType,
      file_size: file.size,
    },
  };
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

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
    date_of_birth: formData.get("date_of_birth"),
    hunting_license_state_code: String(
      formData.get("hunting_license_state_code") ?? "",
    )
      .trim()
      .toUpperCase(),
    hunting_license_number: formData.get("hunting_license_number") ?? "",
    hunting_license_expires_on:
      formData.get("hunting_license_expires_on") || undefined,
    hunter_education_number: formData.get("hunter_education_number") ?? "",
    hunter_education_status:
      formData.get("hunter_education_status") || "completed",
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

  const db = service ?? supabase;
  const { data: accountProfile, error: accountProfileError } = await db
    .from("profiles")
    .select(
      "first_name, last_name, full_name, admin_area_code, onboarding_completed",
    )
    .eq("id", user.id)
    .maybeSingle();

  const fullNameParts = String(accountProfile?.full_name ?? "")
    .split(" ")
    .filter(Boolean);
  const legalFirstName = accountProfile?.first_name || fullNameParts[0] || "";
  const legalLastName =
    accountProfile?.last_name || fullNameParts.slice(1).join(" ") || "";
  const residencyStateCode =
    accountProfile?.admin_area_code &&
    accountProfile.admin_area_code.length <= 2
      ? accountProfile.admin_area_code.toUpperCase()
      : null;

  if (
    accountProfileError ||
    !accountProfile?.onboarding_completed ||
    !legalFirstName ||
    !legalLastName
  ) {
    return NextResponse.json(
      {
        error:
          "Complete account onboarding with legal name before hunter verification.",
      },
      { status: 400 },
    );
  }

  const documentClient = service;
  const uploadSpecs = [
    {
      kind: "hunting_license" as const,
      bucket: "verification-documents" as const,
      file: fileFrom(formData, "hunting_license_document"),
    },
    {
      kind: "hunter_education" as const,
      bucket: "verification-documents" as const,
      file: fileFrom(formData, "hunter_education_document"),
    },
  ].filter((spec) => spec.file);
  const uploadedDocuments: HunterDocumentUpload[] = [];

  if (uploadSpecs.length > 0) {
    if (!documentClient) {
      return NextResponse.json(
        { error: "Document upload storage is not configured." },
        { status: 500 },
      );
    }

    for (const spec of uploadSpecs) {
      const upload = await uploadHunterDocument({
        supabase: documentClient,
        userId: user.id,
        kind: spec.kind,
        bucket: spec.bucket,
        file: spec.file as File,
      });

      if (upload.error || !upload.data) {
        return NextResponse.json(
          { error: upload.error ?? "Document upload failed." },
          { status: 400 },
        );
      }

      uploadedDocuments.push(upload.data);
    }
  }

  const compliancePayload = {
    user_id: user.id,
    legal_first_name: legalFirstName,
    legal_last_name: legalLastName,
    date_of_birth: parsed.data.date_of_birth,
    residency_country_code: "US",
    residency_state_code: residencyStateCode,
    hunter_education_completed:
      formData.get("hunter_education_completed") === "on",
    hunter_education_state_code: parsed.data.hunting_license_state_code,
    hunter_education_number: parsed.data.hunter_education_number || null,
    hunting_license_state_code: parsed.data.hunting_license_state_code,
    hunting_license_number: parsed.data.hunting_license_number || null,
    hunting_license_expires_on:
      parsed.data.hunting_license_expires_on || null,
    verification_status: "pending",
    electronic_records_consent: true,
    rules_acknowledged: true,
    liability_waiver_acknowledged: true,
    attestations: {
      accepted: formData.getAll("attestations"),
      document_uploads: uploadedDocuments,
      document_upload_note:
        "Minimum platform proof is intentionally light: license/permit information plus hunter education, deferral, apprentice, or exemption proof when applicable. Owners can request additional state- or species-specific documents in chat.",
      hunter_education_status: parsed.data.hunter_education_status,
    },
    completed_at: new Date().toISOString(),
  };

  let { error } = await db
    .from("hunter_compliance_profiles")
    .upsert(compliancePayload);

  if (error && error.message.includes("verification_status")) {
    const legacyPayload = Object.fromEntries(
      Object.entries(compliancePayload).filter(
        ([key]) => key !== "verification_status",
      ),
    );
    const retry = await db
      .from("hunter_compliance_profiles")
      .upsert(legacyPayload);
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
