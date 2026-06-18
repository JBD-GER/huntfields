"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Cookie, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";

type ConsentValue = "granted" | "denied";

type ConsentRecord = {
  necessary: true;
  analytics_storage: ConsentValue;
  ad_storage: ConsentValue;
  ad_user_data: ConsentValue;
  ad_personalization: ConsentValue;
  updated_at: string;
  version: 1;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    HuntfieldsConsent?: ConsentRecord;
    openHuntfieldsCookieSettings?: () => void;
  }
}

const storageKey = "huntfields_cookie_consent_v1";

function consentRecord(value: ConsentValue): ConsentRecord {
  return {
    necessary: true,
    analytics_storage: value,
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    updated_at: new Date().toISOString(),
    version: 1,
  };
}

function readStoredConsent() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as ConsentRecord) : null;
  } catch {
    return null;
  }
}

function writeConsent(record: ConsentRecord) {
  window.localStorage.setItem(storageKey, JSON.stringify(record));
  window.HuntfieldsConsent = record;
  document.cookie = [
    `huntfields_cookie_consent=${record.analytics_storage === "granted" ? "accepted" : "rejected"}`,
    "Max-Age=31536000",
    "Path=/",
    "SameSite=Lax",
    window.location.protocol === "https:" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  window.gtag("consent", "update", {
    ad_storage: record.ad_storage,
    ad_user_data: record.ad_user_data,
    ad_personalization: record.ad_personalization,
    analytics_storage: record.analytics_storage,
  });
  window.dispatchEvent(new CustomEvent("huntfields-consent-updated"));
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = readStoredConsent();

    if (stored) {
      window.HuntfieldsConsent = stored;
      queueMicrotask(() => setVisible(false));
    } else {
      queueMicrotask(() => setVisible(true));
    }

    window.openHuntfieldsCookieSettings = () => {
      const current = readStoredConsent();
      setAnalytics(current?.analytics_storage === "granted");
      setMarketing(current?.ad_storage === "granted");
      setCustomize(true);
      setVisible(true);
    };

    return () => {
      delete window.openHuntfieldsCookieSettings;
    };
  }, []);

  function save(value: ConsentValue) {
    writeConsent(consentRecord(value));
    setVisible(false);
  }

  function saveCustom() {
    const record: ConsentRecord = {
      necessary: true,
      analytics_storage: analytics ? "granted" : "denied",
      ad_storage: marketing ? "granted" : "denied",
      ad_user_data: marketing ? "granted" : "denied",
      ad_personalization: marketing ? "granted" : "denied",
      updated_at: new Date().toISOString(),
      version: 1,
    };

    writeConsent(record);
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-6">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-lg border border-[#234331]/14 bg-[#fffdf7]/98 shadow-[0_28px_90px_rgba(25,35,29,0.24)] backdrop-blur-xl">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[#183326] text-white">
              <Cookie size={19} aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                    Privacy choices
                  </p>
                  <h2 className="mt-1 text-xl font-black text-stone-950">
                    Cookies on Huntfields
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setVisible(false)}
                  className="grid size-9 shrink-0 place-items-center rounded-md border border-[#234331]/10 text-stone-500 transition hover:bg-[#f2eee4] hover:text-stone-900 lg:hidden"
                  aria-label="Close cookie banner"
                >
                  <X size={17} aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
                We use necessary cookies to run the marketplace. With your
                permission, we can later use analytics and marketing tags to
                understand performance and improve hunting lease discovery.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-stone-500">
                <Link href="/privacy" className="hover:text-[#234331]">
                  Privacy Policy
                </Link>
                <Link href="/cookies" className="hover:text-[#234331]">
                  Cookie Policy
                </Link>
                <Link href="/terms" className="hover:text-[#234331]">
                  Terms
                </Link>
              </div>
            </div>
          </div>

          {customize ? (
            <div className="grid gap-2 lg:min-w-80">
              <label className="flex items-center justify-between gap-4 rounded-md border border-[#234331]/10 bg-[#f8f4eb] px-3 py-2 text-sm font-bold text-stone-800">
                Analytics
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.target.checked)}
                  className="size-4 accent-[#183326]"
                />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-md border border-[#234331]/10 bg-[#f8f4eb] px-3 py-2 text-sm font-bold text-stone-800">
                Marketing
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(event) => setMarketing(event.target.checked)}
                  className="size-4 accent-[#183326]"
                />
              </label>
              <button
                type="button"
                onClick={saveCustom}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-sm font-black text-white transition hover:bg-[#10271d]"
              >
                <ShieldCheck size={16} aria-hidden="true" />
                Save choices
              </button>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
              <button
                type="button"
                onClick={() => save("denied")}
                className="min-h-11 rounded-md border border-[#234331]/14 px-4 text-sm font-black text-stone-700 transition hover:bg-[#f2eee4]"
              >
                Reject optional
              </button>
              <button
                type="button"
                onClick={() => setCustomize(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#234331]/14 px-4 text-sm font-black text-[#183326] transition hover:bg-[#eef3ec]"
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                Customize
              </button>
              <button
                type="button"
                onClick={() => save("granted")}
                className="min-h-11 rounded-md bg-[#183326] px-4 text-sm font-black text-white shadow-[0_16px_36px_rgba(24,51,38,0.2)] transition hover:bg-[#10271d]"
              >
                Accept all
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsButton({
  className = "text-left text-stone-400 transition hover:text-white",
  children = "Cookie settings",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => window.openHuntfieldsCookieSettings?.()}
      className={className}
    >
      {children}
    </button>
  );
}
