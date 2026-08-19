import { Pagination } from "./Pagination";

export const ModalPagination = ({
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
  <div className="flex justify-end">
    <Pagination
      page={page}
      size={size}
      totalRecords={totalRecords}
      totalPages={totalPages}
      disabled={disabled}
      layout="inline"
      onPageChange={onPageChange}
    />
  </div>
);