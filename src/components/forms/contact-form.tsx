"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const form = event.currentTarget;
    const response = await fetch("/api/contact", {
      method: "POST",
      body: new FormData(form),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Unable to send your message.");
      setStatus("error");
      return;
    }

    form.reset();
    setStatus("sent");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Name
          <input
            name="name"
            required
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Email
          <input
            name="email"
            type="email"
            required
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-stone-800">
        Topic
        <input
          name="topic"
          required
          className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-stone-800">
        Message
        <textarea
          name="message"
          required
          rows={6}
          className="rounded-md border border-stone-300 px-3 py-2 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
        />
      </label>
      {status === "error" && (
        <p className="text-sm font-semibold text-red-700">{error}</p>
      )}
      {status === "sent" && (
        <p className="text-sm font-semibold text-[#234331]">
          Message sent. We will reply from the operations inbox.
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#234331] px-5 font-bold text-white transition hover:bg-[#162d22] disabled:opacity-60"
      >
        <Send size={17} aria-hidden="true" />
        {status === "loading" ? "Sending" : "Send message"}
      </button>
    </form>
  );
}
