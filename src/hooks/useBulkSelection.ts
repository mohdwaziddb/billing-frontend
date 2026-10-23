import { useEffect, useMemo, useState } from "react";

const defaultGetRowId = (item: { id: number }) => item.id;

type UseBulkSelectionOptions<T> = {
  getRowId?: (item: T) => number;
};

export const useBulkSelection = <T extends { id: number }>(
  items: T[],
  options?: UseBulkSelectionOptions<T>
) => {
  // Default getRowId module-level stable rakho: inline arrow har render nayi thi, itemIds har render
  // naya array, neeche ka effect har render setState karta — infinite "Maximum update depth" loop.
  const getRowId = options?.getRowId ?? defaultGetRowId;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const itemIds = useMemo(() => items.map(getRowId), [items]);

  useEffect(() => {
    setSelectedIds((currentSelectedIds) => {
      const next = currentSelectedIds.filter((id) => itemIds.includes(id));
      // Kuch nahi hata to wahi reference lautao (naya array = bekaar re-render).
      return next.length === currentSelectedIds.length ? currentSelectedIds : next;
    });
  }, [itemIds]);

  const selectedCount = selectedIds.length;
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(getRowId(item))),
    [items, selectedIds, getRowId]
  );

  const toggleRow = (rowId: number, checked?: boolean) => {
    setSelectedIds((currentSelectedIds) => {
      const hasSelected = currentSelectedIds.includes(rowId);
      const shouldSelect = checked ?? !hasSelected;
      if (shouldSelect) {
        return hasSelected ? currentSelectedIds : [...currentSelectedIds, rowId];
      }
      return currentSelectedIds.filter((id) => id !== rowId);
    });
  };

  const selectAll = () => setSelectedIds(itemIds);
  const clearSelection = () => setSelectedIds([]);

  return {
    selectedIds,
    selectedCount,
    selectedItems,
    toggleRow,
    selectAll,
    clearSelection,
    setSelectedIds
  };
};
