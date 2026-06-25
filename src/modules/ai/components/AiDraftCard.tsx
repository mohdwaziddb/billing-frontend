import { Ban, CheckCircle2 } from "lucide-react";
import { Button } from "../../../components/Button";
import type { AiDraftAction } from "../types/ai.types";

type AiDraftCardProps = {
  draft: AiDraftAction;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const AiDraftCard = ({ draft, loading, onConfirm, onCancel }: AiDraftCardProps) => {
  const entries = Object.entries(draft.fields ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== "");
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--theme-color)]">{draft.operation.replace(/_/g, " ")}</p>
          <h3 className="mt-1 text-base font-bold text-slate-950">{draft.title}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${draft.confirmable ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {draft.confirmable ? "Ready" : "Needs info"}
        </span>
      </div>
      <dl className="mt-4 grid gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-[120px_1fr] gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
            <dt className="font-semibold capitalize text-slate-500">{labelize(key)}</dt>
            <dd className="break-words font-medium text-slate-900">{String(value)}</dd>
          </div>
        ))}
      </dl>
      {draft.missingFields.length ? (
        <p className="mt-3 text-sm font-medium text-amber-700">
          Missing: {draft.missingFields.map(labelize).join(", ")}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" disabled={loading} onClick={onCancel}>
          <Ban size={16} /> Cancel
        </Button>
        <Button type="button" disabled={loading || !draft.confirmable || !draft.draftId} onClick={onConfirm}>
          <CheckCircle2 size={16} /> Confirm
        </Button>
      </div>
    </div>
  );
};

const labelize = (value: string) => value
  .replace(/([A-Z])/g, " $1")
  .replace(/_/g, " ")
  .trim()
  .replace(/^./, (char) => char.toUpperCase());
