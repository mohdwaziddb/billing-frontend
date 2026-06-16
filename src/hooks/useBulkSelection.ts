import { useEffect, useMemo, useState } from "react";

type UseBulkSelectionOptions<T> = {
  getRowId?: (item: T) => number;
};

export const useBulkSelection = <T extends { id: number }>(
  items: T[],
  options?: UseBulkSelectionOptions<T>
) => {
  const getRowId = options?.getRowId ?? ((item: T) => item.id);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const itemIds = useMemo(() => items.map(getRowId), [items, getRowId]);

  useEffect(() => {
    setSelectedIds((currentSelectedIds) =>
      currentSelectedIds.filter((id) => itemIds.includes(id))
    );
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
