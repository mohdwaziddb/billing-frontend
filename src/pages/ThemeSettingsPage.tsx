import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { getCompanyTheme, resetCompanyTheme, updateCompanyTheme } from "../api/company";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { applyThemeColor, DEFAULT_THEME_COLOR, normalizeHexColor } from "../lib/theme";
import { notificationService } from "../services/notificationService";

const presets = [
  { label: "Blue", value: "#0EA5E9" },
  { label: "Green", value: "#10B981" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Orange", value: "#F97316" },
  { label: "Red", value: "#EF4444" },
  { label: "Teal", value: "#14B8A6" },
  { label: "Indigo", value: "#6366F1" }
];

export const ThemeSettingsPage = () => {
  const { can, refreshTheme, theme } = useAuth();
  const canEdit = can("THEME_SETTINGS", "EDIT");
  const [color, setColor] = useState(theme.themeColor || DEFAULT_THEME_COLOR);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const { clearMessage, setApiError } = useApiMessage();
  const preview = useMemo(() => applyThemeColor(color), [color]);

  useEffect(() => {
    void getCompanyTheme().then((data) => setColor(data.themeColor)).catch(() => setColor(DEFAULT_THEME_COLOR));
  }, []);

  useEffect(() => {
    return () => {
      applyThemeColor(theme.themeColor);
    };
  }, [theme.themeColor]);

  const saveTheme = async () => {
    clearMessage();
    setSuccess("");
    setSaving(true);
    try {
      const updated = await updateCompanyTheme(normalizeHexColor(color));
      setColor(updated.themeColor);
      await refreshTheme();
      const message = CommonSuccessMessageUtil.updated("Theme");
      setSuccess(message);
      notificationService.showSuccess(message);
    } catch (err: any) {
      setApiError(err, "Unable to update theme");
    } finally {
      setSaving(false);
    }
  };

  const resetTheme = async () => {
    clearMessage();
    setSuccess("");
    setSaving(true);
    try {
      const updated = await resetCompanyTheme();
      setColor(updated.themeColor);
      await refreshTheme();
      const message = CommonSuccessMessageUtil.updated("Theme");
      setSuccess(message);
      notificationService.showSuccess(message);
    } catch (err: any) {
      setApiError(err, "Unable to reset theme");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title="Theme Settings" subtitle="Set one company theme color and let the interface derive matching shades automatically." />

      {success ? <div className="glass rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-200">{success}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Theme color</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Brand color</h2>
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[96px_minmax(0,1fr)]">
              <label className="block space-y-2">
                <span className="block text-sm font-semibold text-slate-100">Picker</span>
                <input
                  type="color"
                  disabled={!canEdit}
                  value={normalizeHexColor(color)}
                  className="h-12 w-full cursor-pointer rounded-[var(--radius-control)] border border-white/10 bg-[var(--panel-strong)] p-1 disabled:cursor-not-allowed disabled:opacity-70"
                  onChange={(event) => setColor(event.target.value.toUpperCase())}
                />
              </label>
              <Input
                disabled={!canEdit}
                label="Custom HEX Color"
                value={color}
                onChange={(event) => setColor(event.target.value.toUpperCase())}
              />
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-100">Presets</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    disabled={!canEdit}
                    className="flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-3 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={() => setColor(preset.value)}
                  >
                    <span className="h-5 w-5 rounded-full border border-white/20" style={{ backgroundColor: preset.value }} />
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {canEdit ? (
                <>
                  <Button disabled={saving} onClick={() => void saveTheme()}>
                    <Save size={16} />
                    {saving ? "Saving..." : "Save theme"}
                  </Button>
                  <Button disabled={saving} variant="secondary" onClick={() => void resetTheme()}>
                    <RotateCcw size={16} />
                    Reset To Default
                  </Button>
                </>
              ) : (
                <p className="text-sm text-slate-400">You have view-only access to theme settings.</p>
              )}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 md:p-7">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Live preview</p>
          <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10">
            <div className="p-5" style={{ background: `linear-gradient(135deg, ${preview.dark}, #020617)` }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/60">Header</p>
                  <h3 className="mt-2 text-2xl font-bold text-white">Company Workspace</h3>
                </div>
                <div className="rounded-2xl px-4 py-2 text-sm font-semibold" style={{ backgroundColor: preview.light, color: preview.lightContrast }}>
                  Active
                </div>
              </div>
            </div>
            <div className="grid gap-4 bg-slate-950/70 p-5 md:grid-cols-[180px_1fr]">
              <div className="space-y-2">
                <div className="rounded-2xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor: preview.dark, color: preview.darkContrast }}>Dashboard</div>
                <div className="rounded-2xl px-4 py-3 text-sm font-semibold text-white" style={{ backgroundColor: preview.color }}>Customers</div>
                <div className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300">Invoices</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border p-5" style={{ borderColor: preview.border, backgroundColor: `${preview.color}18` }}>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Card tint</p>
                  <p className="mt-3 text-2xl font-bold text-white">Theme aware</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                  <button className="rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-semibold" style={{ backgroundColor: preview.color, color: preview.contrast }}>
                    Primary Button
                  </button>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
