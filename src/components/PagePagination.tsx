import { Pagination } from "./Pagination";

export const PagePagination = ({
  page,
  size,
  totalRecords,
  totalPages,
  disabled,
  onPageChange
}: {
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}) => (
  <Pagination
    page={page}
    size={size}
    totalRecords={totalRecords}
    totalPages={totalPages}
    disabled={disabled}
    layout="inline"
    onPageChange={onPageChange}
  />
);