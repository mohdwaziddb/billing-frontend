import { Save } from "lucide-react";
import { Button } from "./Button";

/**
 * Add/Edit modal ka common footer (Cancel + Save) — har Setup page par same jagah, same label.
 * Layout CommonDeleteModal jaisa: phone par stack, desktop par right-aligned.
 */
export const ModalFormActions = ({
  editing,
  saving,
  disabled = false,
  entityLabel,
  onCancel,
  onSave,
  submit = false
}: {
  editing: boolean;
  saving: boolean;
  disabled?: boolean;
  /** Button text me aata hai: "Create Category" / "Update Category". */
  entityLabel: string;
  onCancel: () => void;
  onSave?: () => void;
  /** react-hook-form wale <form> me: primary button type="submit" (Enter se bhi save). */
  submit?: boolean;
}) => (
  <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
    <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>
      Cancel
    </Button>
    <Button type={submit ? "submit" : "button"} disabled={saving || disabled} onClick={submit ? undefined : onSave}>
      <Save size={16} />
      {saving ? "Saving..." : `${editing ? "Update" : "Create"} ${entityLabel}`}
    </Button>
  </div>
);
