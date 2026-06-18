import { Resend } from "resend";
import { env } from "@/lib/env";

export type MailResult = {
  ok: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
};

type SendMailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export async function sendTransactionalEmail(
  input: SendMailInput,
): Promise<MailResult> {
  if (!env.resendApiKey) {
    return {
      ok: false,
      skipped: true,
      error: "RESEND_API_KEY is not configured.",
    };
  }

  const resend = new Resend(env.resendApiKey);
  const { data, error } = await resend.emails.send({
    from: env.resendFrom,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data?.id };
}
