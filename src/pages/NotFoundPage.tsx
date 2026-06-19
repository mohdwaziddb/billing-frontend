import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const NotFoundPage = () => {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4 py-10">
      <section className="w-full max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[var(--theme-color)]">404</p>
        <h1 className="mt-4 text-4xl font-extrabold text-slate-950 md:text-5xl">Page not found</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          The page you are looking for does not exist.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--theme-color)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-contrast)] shadow-[0_14px_30px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5"
          >
            <ArrowLeft size={16} />
            <span>Go to login</span>
          </Link>
        </div>
      </section>
    </main>
  );
};
