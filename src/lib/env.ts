export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
  resendFrom:
    process.env.RESEND_FROM ?? "Huntfields <notifications@huntfields.local>",
  adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL,
  mapStyleUrl:
    process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
    "https://demotiles.maplibre.org/style.json",
  mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
  openaiImageSize: process.env.OPENAI_IMAGE_SIZE ?? "1536x1024",
  openaiImageQuality: process.env.OPENAI_IMAGE_QUALITY ?? "high",
  openaiImageOutputFormat: process.env.OPENAI_IMAGE_OUTPUT_FORMAT ?? "jpeg",
};

export function hasSupabaseBrowserEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasSupabaseServiceEnv() {
  return Boolean(
    env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey,
  );
}

export function requiredServerEnv(name: keyof typeof env) {
  const value = env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
