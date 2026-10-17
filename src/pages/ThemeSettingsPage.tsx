import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { getCompanyTheme, resetCompanyTheme, updateCompanyTheme } from "../api/company";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { SectionHeader } from "../components/SectionHeader";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import {
  applyThemeColor,
  DEFAULT_THEME_COLOR,
  gradientSurfaceClass,
  GRADIENT_THEME_PRESETS,
  isHexColor,
  normalizeThemeValue,
  parseThemeValue,
  SOLID_THEME_PRESETS,
  themeSwatchBackground
} from "../lib/theme";
import { notificationService } from "../services/notificationService";

const colorInputClass =
  "h-12 w-full cursor-pointer rounded-[var(--radius-control)] border border-white/10 bg-[var(--panel-strong)] p-1 disabled:cursor-not-allowed disabled:opacity-60";

export const ThemeSettingsPage = () => {
  const { can, refreshTheme, theme } = useAuth();
  const canEdit = can("THEME_SETTINGS", "EDIT");
  const [color, setColor] = useState(theme.themeColor || DEFAULT_THEME_COLOR);
  const [saving, setSaving] = useState(false);
  const { clearMessage, setApiError } = useApiMessage();
  const preview = useMemo(() => applyThemeColor(color), [color]);
  const parsed = useMemo(() => parseThemeValue(color), [color]);
  const isGradient = parsed.accent !== null;
  const selectedValue = normalizeThemeValue(color);
  const [primaryHexText, setPrimaryHexText] = useState(parsed.primary);
  const [accentHexText, setAccentHexText] = useState(parsed.accent ?? "");

  useEffect(() => {
    void getCompanyTheme().then((data) => setColor(data.themeColor)).catch(() => setColor(DEFAULT_THEME_COLOR));
  }, []);

  useEffect(() => {
    setPrimaryHexText(parsed.primary);
  }, [parsed.primary]);

  useEffect(() => {
    setAccentHexText(parsed.accent ?? "");
  }, [parsed.accent]);

  useEffect(() => {
    return () => {
      applyThemeColor(theme.themeColor);
    };
  }, [theme.themeColor]);

  const applyPrimaryHex = (raw: string) => {
    setPrimaryHexText(raw);
    if (isHexColor(raw)) {
      setColor(parsed.accent ? `${raw.toUpperCase()},${parsed.accent}` : raw.toUpperCase());
    }
  };

  const applyAccentHex = (raw: string) => {
    setAccentHexText(raw);
    if (!raw.trim()) {
      setColor(parsed.primary);
      return;
    }
    if (isHexColor(raw)) {
      setColor(`${parsed.primary},${raw.toUpperCase()}`);
    }
  };

  const enableGradient = () => {
    if (parsed.accent) {
      return;
    }
    const defaultAccent = parsed.primary.toUpperCase() === "#8B5CF6" ? "#0EA5E9" : "#8B5CF6";
    setColor(`${parsed.primary},${defaultAccent}`);
  };

  const disableGradient = () => {
    setColor(parsed.primary);
  };

  const saveTheme = async () => {
    clearMessage();
    setSaving(true);
    try {
      const updated = await updateCompanyTheme(normalizeThemeValue(color));
      setColor(updated.themeColor);
      await refreshTheme();
      notificationService.showSuccess(CommonSuccessMessageUtil.updated("Theme"));
    } catch (err: any) {
      setApiError(err, "Unable to update theme");
    } finally {
      setSaving(false);
    }
  };

  const resetTheme = async () => {
    clearMessage();
    setSaving(true);
    try {
      const updated = await resetCompanyTheme();
      setColor(updated.themeColor);
      await refreshTheme();
      notificationService.showSuccess(CommonSuccessMessageUtil.updated("Theme"));
    } catch (err: any) {
      setApiError(err, "Unable to reset theme");
    } finally {
      setSaving(false);
    }
  };

  const presetButtonClass = (value: string) =>
    `flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] border px-3 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-70 ${
      selectedValue === value ? "border-[var(--theme-color)] bg-white/10" : "border-white/10 bg-white/5"
    }`;

  const modeButtonClass = (active: boolean) =>
    `min-h-9 rounded-[var(--radius-control)] border px-4 fs-13 font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
      active ? "border-[var(--theme-color)] bg-white/10 text-slate-100" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/8"
    }`;

  return (
    <div className="space-y-4 pb-6">
      <Header title="Theme Settings" subtitle="Set a solid company color or a gradient — the interface derives matching shades for light and dark mode automatically." />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard className="p-6 md:p-7">
          <SectionHeader className="mb-5" eyebrow="Theme color" title="Brand color" />

          <div className="space-y-5">
            <div>
              <p className="mb-3 text-sm font-semibold text-slate-100">Theme type</p>
              <div className="flex gap-2">
                <button type="button" disabled={!canEdit} className={modeButtonClass(!isGradient)} onClick={disableGradient}>
                  Solid
                </button>
                <button type="button" disabled={!canEdit} className={modeButtonClass(isGradient)} onClick={enableGradient}>
                  Gradient
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="block text-sm font-semibold text-slate-100">Main color</span>
                <input
                  type="color"
                  disabled={!canEdit}
                  value={parsed.primary}
                  className={colorInputClass}
                  onChange={(event) => setColor(parsed.accent ? `${event.target.value.toUpperCase()},${parsed.accent}` : event.target.value.toUpperCase())}
                />
                <Input
                  disabled={!canEdit}
                  label="Main HEX color"
                  placeholder="#RRGGBB"
                  value={primaryHexText}
                  onBlur={() => setPrimaryHexText(parsed.primary)}
                  onChange={(event) => applyPrimaryHex(event.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <span className="block text-sm font-semibold text-slate-100">Second color (gradient)</span>
                <input
                  type="color"
                  disabled={!canEdit || !isGradient}
                  value={parsed.accent ?? parsed.primary}
                  className={colorInputClass}
                  onChange={(event) => setColor(`${parsed.primary},${event.target.value.toUpperCase()}`)}
                />
                <Input
                  disabled={!canEdit || !isGradient}
                  label="Second HEX color"
                  placeholder="#RRGGBB"
                  hint={isGradient ? undefined : "Choose Gradient above to enable"}
                  value={accentHexText}
                  onBlur={() => setAccentHexText(parsed.accent ?? "")}
                  onChange={(event) => applyAccentHex(event.target.value.toUpperCase())}
                />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              The main color drives buttons, links, and text contrast. The second color turns primary buttons, the profile avatar, and other brand surfaces into a gradient — readable in both light and dark mode.
            </p>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-100">{isGradient ? "Gradient presets" : "Solid presets"}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(isGradient ? GRADIENT_THEME_PRESETS : SOLID_THEME_PRESETS).map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    disabled={!canEdit}
                    className={presetButtonClass(preset.value)}
                    onClick={() => setColor(preset.value)}
                  >
                    <span className="h-5 w-5 rounded-full border border-white/20" style={{ background: themeSwatchBackground(preset.value) }} />
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
          <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Live preview</p>
          <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
            <div
              className="p-5"
              style={{ background: preview.hasGradient ? preview.gradient : `linear-gradient(135deg, ${preview.dark}, #020617)` }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="fs-11 uppercase tracking-[0.18em] text-white/60">Header</p>
                  <h3 className="mt-2 fs-18 font-semibold text-white">{preview.hasGradient ? "Gradient theme" : "Company Workspace"}</h3>
                </div>
                <div className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: preview.gradient, color: preview.contrast }}>
                  Active
                </div>
              </div>
            </div>
            <div className="grid gap-4 bg-slate-950/70 p-5 md:grid-cols-[180px_1fr]">
              <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: `linear-gradient(180deg, ${preview.sidebarBgTop}, ${preview.sidebarBgDeep})` }}>
                <div className="rounded-lg px-4 py-3 text-sm font-semibold" style={{ background: preview.gradient, color: preview.contrast }}>Dashboard</div>
                <div className="rounded-lg bg-white/8 px-4 py-3 text-sm font-semibold text-white/85">Customers</div>
                <div className="rounded-lg px-4 py-3 text-sm font-semibold text-white/70">Invoices</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-5" style={{ borderColor: preview.border, backgroundColor: `${preview.color}18` }}>
                  <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Card tint</p>
                  <p className="mt-3 fs-18 font-semibold text-white">Theme aware</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                  <button className={`${gradientSurfaceClass} rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-semibold`}>
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
