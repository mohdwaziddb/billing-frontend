import type { ReactNode } from "react";

type AvailableVariablesPanelProps = {
  variables: Record<string, string>;
  onInsert: (variable: string) => void;
  targetLabel?: string;
  icon?: ReactNode;
};

export const AvailableVariablesPanel = ({ variables, onInsert, targetLabel, icon }: AvailableVariablesPanelProps) => (
  <div className="rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 p-4">
    <div className="mb-4 flex items-center gap-2">
      {icon}
      <p className="font-semibold text-slate-950">Available Variables</p>
    </div>
    {targetLabel ? (
      <p className="mb-3 text-xs text-slate-500">
        Insert into: <span className="font-semibold text-slate-700">{targetLabel}</span>
      </p>
    ) : null}
    <div className="space-y-2">
      {Object.entries(variables).map(([variable, description]) => (
        <button
          key={variable}
          type="button"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-[var(--theme-color)] hover:bg-[color-mix(in_srgb,var(--theme-color)_6%,white)]"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onInsert(variable)}
        >
          <span className="block font-semibold text-slate-900">{`{{${variable}}}`}</span>
          <span className="text-xs text-slate-500">{description}</span>
        </button>
      ))}
    </div>
  </div>
);
