import { env } from "@/lib/env";

type DescriptionInput = {
  title: string;
  summary: string;
  listingType?: string | null;
  countryName: string;
  adminAreaName?: string | null;
  regionName?: string | null;
  nearestTown?: string | null;
  reportedAreaAcres?: string | null;
  wildlife: string[];
  amenities: string[];
  rules: string[];
};

type OpenAITextResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

function extractText(payload: OpenAITextResponse | null) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }

  return (
    payload?.output
      ?.flatMap((item) => item.content ?? [])
      .map((item) => item.text)
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

function normalizeDescription(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim()
    .slice(0, 1800);
}

function buildDescriptionInput(input: DescriptionInput) {
  return JSON.stringify(
    {
      title: input.title,
      shortSummary: input.summary,
      listingType: input.listingType,
      location: {
        nearestTown: input.nearestTown,
        region: input.regionName,
        state: input.adminAreaName,
        country: input.countryName,
      },
      ownerReportedAcreage: input.reportedAreaAcres,
      huntableSpecies: input.wildlife,
      landFeatures: input.amenities,
      ownerRules: input.rules,
    },
    null,
    2,
  );
}

export async function generateListingDescription(input: DescriptionInput) {
  if (!env.openaiApiKey) {
    throw new Error("OpenAI is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.openaiTextModel,
      instructions: [
        "You write premium US hunting lease marketplace listing descriptions.",
        "Use only the facts provided by the landowner.",
        "Do not invent exact coordinates, street addresses, guarantees, legal advice, harvest success, animal counts, trophy claims, or unavailable amenities.",
        "Write in polished American English for serious hunters and landowners.",
        "Mention privacy-safe access only naturally: exact gates, routes, and boundaries are released after landowner approval.",
        "Return plain text only, no markdown, no headings.",
      ].join(" "),
      input: [
        "Create an owner-editable listing description in 2 short paragraphs.",
        "Keep it between 110 and 165 words.",
        "Make it specific, confident, and natural, not salesy.",
        buildDescriptionInput(input),
      ].join("\n\n"),
      max_output_tokens: 420,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | OpenAITextResponse
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ??
        `OpenAI description generation failed with ${response.status}`,
    );
  }

  const description = normalizeDescription(extractText(payload));

  if (!description) {
    throw new Error("OpenAI returned an empty description.");
  }

  return description;
}
