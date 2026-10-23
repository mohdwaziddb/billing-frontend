import type { PageResponse } from "../types/api";

const PAGE_SIZE = 1000;
// Safety cap: 50 x 1000 rows. Isse upar browser me export/KPI ke liye data lana
// waise bhi theek nahi; tab bhi pehle ke 1000 wale chup-chaap cut se bahut aage.
const MAX_PAGES = 50;

/**
 * Backend ek page me max 1000 rows deta hai. KPI cards aur Excel export pehle
 * sirf pehla page lete the, isliye 1000 se zyada records par totals galat aate
 * the. Ye saare pages laata hai (same filters ke saath).
 */
export const fetchAllPages = async <T,>(fetchPage: (page: number, size: number) => Promise<PageResponse<T>>): Promise<T[]> => {
  const first = await fetchPage(0, PAGE_SIZE);
  const rows = [...first.records];
  const totalPages = Math.min(first.totalPages ?? 1, MAX_PAGES);
  for (let page = 1; page < totalPages; page++) {
    const next = await fetchPage(page, PAGE_SIZE);
    rows.push(...next.records);
    if (!next.records.length) {
      break;
    }
  }
  return rows;
};
