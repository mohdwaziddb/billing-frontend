export const MaintenancePage = () => {
  const host = typeof window !== "undefined" ? window.location.hostname : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <section className="w-full max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">Bizio</p>
        <h1 className="mt-4 text-4xl font-extrabold text-slate-900 md:text-5xl">
          We&rsquo;ll be back soon!
        </h1>
        <p className="mt-6 text-base leading-7 text-slate-600">
          Something went wrong.
          <br />
          We&rsquo;re working on getting it fixed as soon as we can.
        </p>
        {host ? (
          <p className="mt-6 text-xs font-medium tracking-wide text-slate-400">{host}</p>
        ) : null}
      </section>
    </main>
  );
};
