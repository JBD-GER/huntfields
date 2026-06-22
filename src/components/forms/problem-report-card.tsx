"use client";

import { useEffect, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import {
  CheckCircle2,
  LifeBuoy,
  MessageSquareText,
  Send,
  X,
} from "lucide-react";

type ReportState = "idle" | "loading" | "sent" | "error";

export function ProblemReportCard({
  role,
}: {
  role: "hunter" | "landowner";
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ReportState>("idle");
  const [error, setError] = useState<string | null>(null);
  const roleLabel = role === "landowner" ? "landowner" : "hunter";

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && state !== "loading") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, state]);

  function openDialog() {
    setOpen(true);
    setState("idle");
    setError(null);
  }

  function closeDialog() {
    if (state !== "loading") {
      setOpen(false);
    }
  }

  function onOverlayMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setError(null);

    const form = event.currentTarget;

    try {
      const response = await fetch("/api/problem-reports", {
        method: "POST",
        body: new FormData(form),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(payload?.error ?? "Unable to send the problem report.");
        setState("error");
        return;
      }

      form.reset();
      setState("sent");
    } catch {
      setError("Unable to reach the admin inbox right now.");
      setState("error");
    }
  }

  return (
    <>
      <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-4 shadow-[0_16px_46px_rgba(25,35,29,0.08)] sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#eef3ec] text-[#183326]">
            {state === "sent" ? (
              <CheckCircle2 size={18} aria-hidden="true" />
            ) : (
              <LifeBuoy size={18} aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
              Admin support
            </p>
            <h2 className="mt-1 text-lg font-black tracking-normal text-stone-950 sm:text-xl">
              Report a problem
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Send a quick note from your {roleLabel} dashboard.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openDialog}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#234331]/14 bg-white px-4 text-sm font-black text-[#183326] transition hover:bg-[#eef3ec] sm:w-auto"
        >
          <MessageSquareText size={16} aria-hidden="true" />
          Message admin
        </button>
        {state === "sent" ? (
          <p className="mt-3 text-sm font-semibold text-[#234331]">
            Sent to the admin inbox.
          </p>
        ) : null}
      </section>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-stone-950/60 p-4"
          onMouseDown={onOverlayMouseDown}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="problem-report-title"
            className="w-full max-w-lg rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                  Admin support
                </p>
                <h2
                  id="problem-report-title"
                  className="mt-1 text-xl font-black tracking-normal text-stone-950"
                >
                  Report a problem
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={state === "loading"}
                className="grid size-10 shrink-0 place-items-center rounded-md border border-[#234331]/12 bg-white text-[#183326] transition hover:bg-[#eef3ec] disabled:opacity-60"
                aria-label="Close"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            {state === "sent" ? (
              <div className="mt-5 rounded-md border border-[#234331]/14 bg-[#eef3ec] p-4">
                <CheckCircle2
                  className="size-6 text-[#234331]"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-black text-stone-950">
                  Problem report sent.
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  The admin inbox has your message.
                </p>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-[#183326] px-4 text-sm font-black text-white sm:w-auto"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-stone-800">
                  Message
                  <textarea
                    name="message"
                    required
                    minLength={10}
                    maxLength={2500}
                    rows={6}
                    placeholder="What is not working?"
                    className="min-h-36 rounded-md border border-stone-300 bg-white px-3 py-2 font-normal outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
                  />
                </label>

                {state === "error" ? (
                  <p className="text-sm font-semibold text-red-700">{error}</p>
                ) : null}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={state === "loading"}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#234331]/14 bg-white px-4 text-sm font-black text-[#183326] transition hover:bg-[#eef3ec] disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={state === "loading"}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-sm font-black text-white transition hover:bg-[#10251a] disabled:opacity-60"
                  >
                    <Send size={16} aria-hidden="true" />
                    {state === "loading" ? "Sending" : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
