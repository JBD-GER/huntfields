export default function Loading() {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#f6f2e9]">
      <div className="h-1 overflow-hidden bg-[#d9d2c4]">
        <div className="huntfields-route-loading-bar h-full w-1/3 bg-[#183326]" />
      </div>
      <div className="mx-auto grid max-w-7xl gap-4 px-3 py-6 sm:px-6 sm:py-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
        <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_16px_44px_rgba(25,35,29,0.07)]">
          <div className="h-3 w-28 rounded-full bg-[#e8e1d4]" />
          <div className="mt-5 h-10 w-3/4 rounded-md bg-[#ded7c9]" />
          <div className="mt-3 h-4 w-full rounded-full bg-[#eee8dc]" />
          <div className="mt-2 h-4 w-5/6 rounded-full bg-[#eee8dc]" />
          <div className="mt-6 flex gap-2">
            <div className="h-11 flex-1 rounded-md bg-[#183326]/14" />
            <div className="h-11 flex-1 rounded-md bg-[#183326]/8" />
          </div>
        </section>
        <section className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="min-h-56 rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-3 shadow-[0_16px_44px_rgba(25,35,29,0.07)]"
            >
              <div className="h-28 rounded-md bg-[#ded7c9]" />
              <div className="mt-4 h-5 w-4/5 rounded-full bg-[#e8e1d4]" />
              <div className="mt-3 h-3 w-full rounded-full bg-[#eee8dc]" />
              <div className="mt-2 h-3 w-2/3 rounded-full bg-[#eee8dc]" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
