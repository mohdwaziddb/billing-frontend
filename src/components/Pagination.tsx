import { Button } from "./Button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const DEFAULT_PAGE_SIZE = 20;

type PaginationProps = {
  page: number;
  size?: number;
  totalRecords: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  layout?: "default" | "inline";
};

export const Pagination = ({
  page,
  size = DEFAULT_PAGE_SIZE,
  totalRecords,
  totalPages,
  onPageChange,
  disabled = false,
  layout = "default"
}: PaginationProps) => {
  const fromRecord = totalRecords === 0 ? 0 : page * size + 1;
  const toRecord = Math.min((page + 1) * size, totalRecords);

  return (
    <div className={layout === "inline" ? "flex items-center gap-3" : "mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"}>
      <p className="text-sm text-slate-500">
        {fromRecord}-{toRecord} of {totalRecords}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          aria-label="Previous page"
          title="Previous page"
          disabled={disabled || page <= 0}
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          aria-label="Next page"
          title="Next page"
          disabled={disabled || page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
