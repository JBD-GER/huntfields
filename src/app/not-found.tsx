import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-4xl font-black tracking-normal text-stone-950">
        Page not found
      </h1>
      <p className="mt-3 text-stone-600">
        The listing or region may not be published yet.
      </p>
      <Link
        href="/land"
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#234331] px-5 font-bold text-white"
      >
        Search land
      </Link>
    </div>
  );
}
