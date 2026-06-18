import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const LISTING_IMAGES_BUCKET = "listing-images";

type ListingCoverInput = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description?: string | null;
  countryName: string;
  adminAreaName?: string | null;
  regionName?: string | null;
  nearestTown?: string | null;
  wildlife: string[];
  amenities: string[];
};

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

function compactList(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(", ");
}

function imageExtension() {
  if (env.openaiImageOutputFormat === "png") {
    return "png";
  }

  if (env.openaiImageOutputFormat === "webp") {
    return "webp";
  }

  return "jpg";
}

function imageContentType() {
  if (env.openaiImageOutputFormat === "png") {
    return "image/png";
  }

  if (env.openaiImageOutputFormat === "webp") {
    return "image/webp";
  }

  return "image/jpeg";
}

function buildListingCoverPrompt(listing: ListingCoverInput) {
  const location = compactList([
    listing.nearestTown,
    listing.regionName,
    listing.adminAreaName,
    listing.countryName,
  ]);
  const wildlife = listing.wildlife.length
    ? listing.wildlife.join(", ")
    : "native game animals appropriate to the region";
  const landFeatures = listing.amenities.length
    ? listing.amenities.join(", ")
    : "private land habitat, access tracks, water, cover, and natural edges";

  return [
    "Use case: photorealistic-natural",
    "Asset type: high-end 16:9 listing hero image for a US hunting lease marketplace",
    `Primary request: create a unique premium cover image for "${listing.title}".`,
    `Scene/backdrop: realistic private hunting land around ${location}; match the regional ecology, terrain, vegetation, weather, and natural light of that area.`,
    `Listing context: ${listing.summary} ${listing.description ?? ""}`.trim(),
    `Wildlife presence: subtle, natural, distant ${wildlife}; wildlife should feel observed in habitat, not staged.`,
    `Land features to imply visually: ${landFeatures}.`,
    "Style/medium: ultra-realistic editorial outdoor photography, premium marketplace quality, natural lens perspective, not an illustration, not a map, no AI-art look.",
    "Composition/framing: wide cinematic landscape, strong foreground habitat texture, visually open enough for website text overlay, no close-up trophy pose.",
    "Lighting/mood: authentic golden-hour or early-morning light, calm, trustworthy, high-end outdoor brand feel.",
    "Constraints: no text, no logos, no watermark, no UI, no map overlay, no hunters, no firearms, no gore, no exaggerated fantasy wildlife, no obvious private address markers.",
  ].join("\n");
}

async function fetchGeneratedImage(prompt: string) {
  if (!env.openaiApiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.openaiImageModel,
      prompt,
      n: 1,
      size: env.openaiImageSize,
      quality: env.openaiImageQuality,
      output_format: env.openaiImageOutputFormat,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | OpenAIImageResponse
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ??
        `OpenAI image generation failed with ${response.status}`,
    );
  }

  const image = payload?.data?.[0];

  if (image?.b64_json) {
    return Buffer.from(image.b64_json, "base64");
  }

  if (image?.url) {
    const imageResponse = await fetch(image.url);

    if (!imageResponse.ok) {
      throw new Error(
        `OpenAI image URL fetch failed with ${imageResponse.status}`,
      );
    }

    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error("OpenAI image generation returned no image data.");
}

export async function generateAndStoreListingCover({
  supabase,
  listing,
}: {
  supabase: SupabaseClient;
  listing: ListingCoverInput;
}) {
  if (!env.openaiApiKey) {
    return null;
  }

  const prompt = buildListingCoverPrompt(listing);
  const image = await fetchGeneratedImage(prompt);

  if (!image) {
    return null;
  }

  const path = `generated/${listing.id}/${listing.slug}.${imageExtension()}`;
  const { error } = await supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .upload(path, image, {
      cacheControl: "31536000",
      contentType: imageContentType(),
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase image upload failed: ${error.message}`);
  }

  return {
    path,
    prompt,
  };
}
