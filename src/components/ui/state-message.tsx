import { AlertCircle, Search } from "lucide-react";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border border-[#234331]/10 bg-[#fffdf7] text-stone-600 shadow-sm">
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[#234331]/20 bg-[#fffdf7] px-6 py-10 text-center shadow-sm">
      <Search className="mx-auto size-8 text-stone-400" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-black text-stone-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
        {description}
      </p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
      <div className="flex gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </div>
  );
}
