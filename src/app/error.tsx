"use client";

import { ErrorState } from "@/components/ui/state-message";

export default function Error({ error }: { error: Error }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <ErrorState message={error.message} />
    </div>
  );
}
