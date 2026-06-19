"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function MessageReplyForm({ requestId }: { requestId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("request_id", requestId);

    const response = await fetch("/api/messages", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Unable to send message.");
      setState("error");
      return;
    }

    form.reset();
    setState("sent");
    window.location.reload();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <label className="grid gap-2 text-sm font-semibold text-stone-800">
        Reply
        <textarea
          name="body"
          required
          rows={3}
          className="rounded-md border border-stone-300 px-3 py-2 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-stone-800">
        Attach photos or documents
        <input
          name="attachments"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="rounded-md border border-dashed border-stone-300 bg-[#fbfaf6] px-3 py-2 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-[#234331] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
        />
        <span className="text-xs font-normal leading-5 text-stone-500">
          Up to 5 files. PDF, JPG, PNG, or WebP. Useful for insurance,
          ownership proof, trail photos, and contract notes.
        </span>
      </label>
      {state === "error" && (
        <p className="text-sm font-semibold text-red-700">{error}</p>
      )}
      {state === "sent" && (
        <p className="text-sm font-semibold text-[#234331]">Message sent.</p>
      )}
      <button
        type="submit"
        disabled={state === "loading"}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#234331] px-4 text-sm font-bold text-white transition hover:bg-[#162d22] disabled:opacity-60"
      >
        <Send size={16} aria-hidden="true" />
        {state === "loading" ? "Sending" : "Send reply"}
      </button>
    </form>
  );
}
