import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

export const CommonBreadcrumb = ({ items }: { items: BreadcrumbItem[] }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
            {item.to && !isLast ? (
              <Link className="text-[var(--theme-dark)] transition hover:text-[var(--theme-color)]" to={item.to}>
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-slate-500" : ""}>{item.label}</span>
            )}
            {!isLast ? <ChevronRight size={14} className="text-slate-300" /> : null}
          </span>
        );
      })}
    </nav>
  );
};
