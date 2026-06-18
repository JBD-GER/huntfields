import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { emailTemplates } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";

const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email().max(240),
  topic: z.string().min(2).max(160),
  message: z.string().min(10).max(4000),
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    topic: formData.get("topic"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please complete the contact form." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service role is not configured." },
      { status: 500 },
    );
  }

  const { error } = await supabase.from("contact_messages").insert(parsed.data);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (env.adminNotificationEmail) {
    const template = emailTemplates.contactForm(
      parsed.data.name,
      parsed.data.email,
      parsed.data.topic,
      parsed.data.message,
    );
    await sendTransactionalEmail({
      to: env.adminNotificationEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: parsed.data.email,
    });
  }

  return NextResponse.json({ ok: true });
}
