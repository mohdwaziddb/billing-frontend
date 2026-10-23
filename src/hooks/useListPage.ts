import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "../components/Pagination";
import { useApiMessage } from "./useApiFeedback";
import type { PageResponse } from "../types/api";

export type FiltersWithSearch = { search: string };

export type ListFetchQuery<TFilters> = {
  page: number;
  size: number;
  search: string;
  filters: TFilters;
};

export type ListPageController<TRow, TFilters extends FiltersWithSearch> = {
  tableData: TRow[];
  paginationInfo: PageResponse<TRow>;
  loading: boolean;
  page: number;
  formFilters: TFilters;
  activeFilters: TFilters;
  updateFormFilters: (patch: Partial<TFilters>) => void;
  updateSearchDraft: (value: string) => void;
  discardFormFilters: () => void;
  applyFilters: () => void;
  applyFilterNow: (patch: Partial<TFilters>) => void;
  applySearchNow: (value: string) => void;
  clearSearchBox: () => void;
  resetAllFilters: () => void;
  goToPage: (nextPage: number) => void;
  refreshTable: () => void;
};

const createEmptyPageData = <TRow,>(): PageResponse<TRow> => ({
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
});

/**
 * List page ka poora common logic — data loading, pagination, search aur filters.
 * formFilters = filter popup me jo values hain (draft), activeFilters = jo abhi lagu hain.
 */
export function useListPage<TRow, TFilters extends FiltersWithSearch>({
  initialFilters,
  fetchPage,
  errorMessage,
  pageSize = DEFAULT_PAGE_SIZE
}: {
  initialFilters: TFilters;
  fetchPage: (query: ListFetchQuery<TFilters>) => Promise<PageResponse<TRow>>;
  errorMessage: string;
  pageSize?: number;
}): ListPageController<TRow, TFilters> {
  const { setApiError } = useApiMessage();
  const [tableData, setTableData] = useState<TRow[]>([]);
  const [paginationInfo, setPaginationInfo] = useState<PageResponse<TRow>>(createEmptyPageData<TRow>());
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [formFilters, setFormFilters] = useState<TFilters>(initialFilters);
  const [activeFilters, setActiveFilters] = useState<TFilters>(initialFilters);

  const fetchPageRef = useRef(fetchPage);
  useEffect(() => {
    fetchPageRef.current = fetchPage;
  });
  // Har load ka id: tez typing/page change par pehle bheji request ka der se
  // aaya jawab naye result ko overwrite na kare.
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (nextPage: number, filters: TFilters): Promise<void> => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const response = await fetchPageRef.current({
          page: nextPage,
          size: pageSize,
          search: filters.search ?? "",
          filters
        });
        if (requestId !== requestIdRef.current) {
          return;
        }
        // Last page ka last row delete hua: khali page dikhane ki jagah pichhla page.
        if (!response.records.length && nextPage > 0 && response.totalPages > 0) {
          return load(Math.min(nextPage - 1, response.totalPages - 1), filters);
        }
        setPaginationInfo(response);
        setTableData(response.records);
        setPage(nextPage);
      } catch (err: any) {
        if (requestId === requestIdRef.current) {
          setApiError(err, errorMessage);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [errorMessage, pageSize, setApiError]
  );

  useEffect(() => {
    void load(0, initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFormFilters = (patch: Partial<TFilters>) => {
    setFormFilters((current) => ({ ...current, ...patch } as TFilters));
  };

  const updateSearchDraft = (value: string) => {
    setFormFilters((current) => ({ ...current, search: value } as TFilters));
  };

  const discardFormFilters = () => {
    setFormFilters(activeFilters);
  };

  const applyFilters = () => {
    setActiveFilters(formFilters);
    void load(0, formFilters);
  };

  const applyFilterNow = (patch: Partial<TFilters>) => {
    const nextFilters = { ...formFilters, ...patch } as TFilters;
    setFormFilters(nextFilters);
    setActiveFilters(nextFilters);
    void load(0, nextFilters);
  };

  const applySearchNow = (value: string) => {
    const nextFilters = { ...formFilters, search: value } as TFilters;
    setFormFilters(nextFilters);
    setActiveFilters(nextFilters);
    void load(0, nextFilters);
  };

  const clearSearchBox = () => {
    const nextFilters = { ...activeFilters, search: "" } as TFilters;
    setFormFilters(nextFilters);
    setActiveFilters(nextFilters);
    void load(0, nextFilters);
  };

  const resetAllFilters = () => {
    setFormFilters(initialFilters);
    setActiveFilters(initialFilters);
    void load(0, initialFilters);
  };

  const goToPage = (nextPage: number) => {
    void load(nextPage, activeFilters);
  };

  const refreshTable = () => {
    void load(page, activeFilters);
  };

  return {
    tableData,
    paginationInfo,
    loading,
    page,
    formFilters,
    activeFilters,
    updateFormFilters,
    updateSearchDraft,
    discardFormFilters,
    applyFilters,
    applyFilterNow,
    applySearchNow,
    clearSearchBox,
    resetAllFilters,
    goToPage,
    refreshTable
  };
}
