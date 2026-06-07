import { Button } from "./Button";

export const DEFAULT_PAGE_SIZE = 20;

type PaginationProps = {
  page: number;
  size?: number;
  totalRecords: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export const Pagination = ({
  page,
  size = DEFAULT_PAGE_SIZE,
  totalRecords,
  totalPages,
  onPageChange,
  disabled = false
}: PaginationProps) => {
  if (totalRecords <= size) {
    return null;
  }

  const fromRecord = totalRecords === 0 ? 0 : page * size + 1;
  const toRecord = Math.min((page + 1) * size, totalRecords);

  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-400">
        Page {Math.min(page + 1, Math.max(totalPages, 1))} of {Math.max(totalPages, 1)} - Showing {fromRecord}-{toRecord} of {totalRecords} records
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" disabled={disabled || page <= 0} onClick={() => onPageChange(Math.max(0, page - 1))}>
          Previous
        </Button>
        <Button type="button" variant="secondary" disabled={disabled || page + 1 >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
};
