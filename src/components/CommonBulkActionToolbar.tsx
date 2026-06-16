import { Trash2 } from "lucide-react";
import { Button } from "./Button";

type CommonBulkActionToolbarProps = {
  selectedCount: number;
  canDelete: boolean;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
};

export const CommonBulkActionToolbar = ({
  selectedCount,
  canDelete,
  onClearSelection,
  onDeleteSelected
}: CommonBulkActionToolbarProps) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="mb-4 rounded-[24px] border border-white/10 bg-slate-950/80 p-4 text-sm text-slate-200 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-white">{selectedCount} selected</p>
          <p className="text-slate-400">Select actions for selected records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onClearSelection}>
            Clear selection
          </Button>
          <Button type="button" variant="danger" disabled={!canDelete} onClick={onDeleteSelected}>
            <Trash2 size={16} />
            Delete selected
          </Button>
        </div>
      </div>
    </div>
  );
};
