import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Layers, Palette, RotateCcw, Save, Undo2 } from "lucide-react";
import { getCompanyTheme, resetCompanyTheme, updateCompanyTheme } from "../api/company";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { InfoNote } from "../components/InfoNote";
import { Input } from "../components/Input";
import { SectionHeader } from "../components/SectionHeader";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import {
  applyThemeColor,
  buildThemePalette,
  contrastAgainstWhite,
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

// Theme color links/active text ke liye white surface par bhi use hota hai — isse kam contrast par warning.
const MIN_CONTRAST_ON_WHITE = 1.8;

/** "0ea5e9" / " #0ea5e9 " -> "#0EA5E9" (user "#" bhool jaaye to bhi chale). */
const toHexDraft = (raw: string) => {
  const cleaned = raw.trim().toUpperCase().replace(/[^0-9A-F]/g, "");
  return cleaned ? `#${cleaned}`.slice(0, 7) : "";
};

const ColorField = ({
  label,
  value,
  text,
  disabled,
  onPick,
  onText,
  onTextBlur
}: {
  label: string;
  value: string;
  text: string;
  disabled: boolean;
  onPick: (value: string) => void;
  onText: (value: string) => void;
  onTextBlur: () => void;
}) => {
  // toHexDraft sirf HEX digits rakhta hai, isliye adhoora value hi ek possible galti hai.
  const incomplete = text.length > 0 && !isHexColor(text);
  return (
    <div className="space-y-2">
      <span className="block fs-12 font-semibold text-slate-700">{label}</span>
      <div className="flex items-start gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          disabled={disabled}
          value={value.toLowerCase()}
          onChange={(event) => onPick(event.target.value.toUpperCase())}
          className="h-[42px] w-12 shrink-0 cursor-pointer rounded-[var(--radius-control)] border border-slate-200 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="min-w-0 flex-1">
          <Input
            aria-label={`${label} HEX`}
            disabled={disabled}
            placeholder="#RRGGBB"
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            className="font-mono uppercase"
            value={text}
            hint={incomplete ? "Enter all 6 HEX digits, e.g. #0EA5E9" : undefined}
            onBlur={onTextBlur}
            onChange={(event) => onText(toHexDraft(event.target.value))}
          />
        </div>
      </div>
    </div>
  );
};

export const ThemeSettingsPage = () => {
  const { can, refreshTheme, theme, user } = useAuth();
  // Backend theme save/reset owner-only hai (requireOwnerCompany) — baaki ko view-only dikhao, 403 nahi.
  const isOwner = user?.role === "OWNER" || Boolean(user?.superAdmin);
  const canEdit = can("THEME_SETTINGS", "EDIT") && isOwner;
  const [savedColor, setSavedColor] = useState(() => normalizeThemeValue(theme.themeColor || DEFAULT_THEME_COLOR));
  const [color, setColor] = useState(savedColor);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { clearMessage, setApiError } = useApiMessage();
  const preview = useMemo(() => buildThemePalette(color), [color]);
  const parsed = useMemo(() => parseThemeValue(color), [color]);
  const isGradient = parsed.accent !== null;
  const selectedValue = normalizeThemeValue(color);
  const dirty = selectedValue !== normalizeThemeValue(savedColor);
  const isDefaultSaved = normalizeThemeValue(savedColor) === DEFAULT_THEME_COLOR;
  const lowContrast = contrastAgainstWhite(parsed.primary) < MIN_CONTRAST_ON_WHITE;
  const controlsDisabled = !canEdit || loading || saving;
  const [primaryHexText, setPrimaryHexText] = useState(parsed.primary);
  const [accentHexText, setAccentHexText] = useState(parsed.accent ?? "");

  // Page chhodte waqt unsaved preview hata ke saved (context) theme wapas lagao.
  const savedThemeRef = useRef(theme.themeColor);
  savedThemeRef.current = theme.themeColor;

  useEffect(() => {
    let active = true;
    getCompanyTheme()
      .then((data) => {
        if (!active) {
          return;
        }
        const value = normalizeThemeValue(data.themeColor);
        setSavedColor(value);
        setColor(value);
      })
      .catch((err) => {
        // Fail par default mat dikhao (warna galti se default save ho jaata) — cached theme hi rehne do.
        if (active) {
          setApiError(err, "Unable to load theme settings");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [setApiError]);

  // Live preview poore app par (sidebar, buttons) — render ke bahar, effect me.
  useEffect(() => {
    applyThemeColor(color);
  }, [color]);

  useEffect(() => () => {
    applyThemeColor(savedThemeRef.current);
  }, []);

  useEffect(() => {
    setPrimaryHexText(parsed.primary);
  }, [parsed.primary]);

  useEffect(() => {
    setAccentHexText(parsed.accent ?? "");
  }, [parsed.accent]);

  const setPrimary = (value: string) => {
    setColor(parsed.accent ? `${value},${parsed.accent}` : value);
  };

  const setAccent = (value: string) => {
    setColor(`${parsed.primary},${value}`);
  };

  const applyPrimaryHex = (raw: string) => {
    setPrimaryHexText(raw);
    if (isHexColor(raw)) {
      setPrimary(raw);
    }
  };

  const applyAccentHex = (raw: string) => {
    setAccentHexText(raw);
    if (isHexColor(raw)) {
      setAccent(raw);
    }
  };

  const switchMode = (gradient: boolean) => {
    if (gradient === isGradient) {
      return;
    }
    if (!gradient) {
      setColor(parsed.primary);
      return;
    }
    const defaultAccent = parsed.primary === "#8B5CF6" ? "#0EA5E9" : "#8B5CF6";
    setColor(`${parsed.primary},${defaultAccent}`);
  };

  const commit = async (request: () => Promise<{ themeColor: string }>, successMessage: string, fallbackError: string) => {
    clearMessage();
    setSaving(true);
    try {
      const updated = await request();
      const value = normalizeThemeValue(updated.themeColor);
      setSavedColor(value);
      setColor(value);
      await refreshTheme();
      notificationService.showSuccess(successMessage);
    } catch (err: any) {
      setApiError(err, fallbackError);
    } finally {
      setSaving(false);
    }
  };

  const saveTheme = () => {
    if (!dirty) {
      return;
    }
    void commit(() => updateCompanyTheme(selectedValue), CommonSuccessMessageUtil.updated("Theme"), "Unable to update theme");
  };

  const resetTheme = () => {
    if (!window.confirm("Reset the company theme to the default blue? This changes the look for every user.")) {
      return;
    }
    void commit(() => resetCompanyTheme(), "Theme Reset To Default Successfully", "Unable to reset theme");
  };

  const presets = isGradient ? GRADIENT_THEME_PRESETS : SOLID_THEME_PRESETS;

  return (
    <div className="space-y-4 pb-6">
      <Header title="Theme Settings" subtitle="Pick a solid brand color or a gradient — matching shades for light and dark mode are derived automatically." />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <GlassCard className="p-4 md:p-6">
          <SectionHeader
            eyebrow="Brand color"
            title="Company theme"
            description="Applies to the whole workspace for every user."
            actions={dirty ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 fs-11 font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            ) : null}
          />

          {!canEdit ? (
            <InfoNote className="mt-4">You can view the theme, but only the company owner can change it.</InfoNote>
          ) : null}

          <div className="mt-5 space-y-5">
            <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 sm:w-auto" role="tablist" aria-label="Theme type">
              {([
                { gradient: false, label: "Solid", icon: Palette },
                { gradient: true, label: "Gradient", icon: Layers }
              ]).map(({ gradient, label, icon: Icon }) => {
                const active = isGradient === gradient;
                return (
                  <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    disabled={controlsDisabled}
                    onClick={() => switchMode(gradient)}
                    className={clsx(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed sm:flex-none",
                      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
                      !active && controlsDisabled && "opacity-60"
                    )}
                  >
                    <Icon size={16} className={active ? "text-[var(--theme-color)]" : undefined} />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className={clsx("grid gap-4", isGradient && "sm:grid-cols-2")}>
              <ColorField
                label={isGradient ? "Start color" : "Main color"}
                value={parsed.primary}
                text={primaryHexText}
                disabled={controlsDisabled}
                onPick={setPrimary}
                onText={applyPrimaryHex}
                onTextBlur={() => setPrimaryHexText(parsed.primary)}
              />
              {isGradient && parsed.accent ? (
                <ColorField
                  label="End color"
                  value={parsed.accent}
                  text={accentHexText}
                  disabled={controlsDisabled}
                  onPick={setAccent}
                  onText={applyAccentHex}
                  onTextBlur={() => setAccentHexText(parsed.accent ?? "")}
                />
              ) : null}
            </div>

            {lowContrast ? (
              <InfoNote tone="warning">
                This color is very light — links and highlighted text may be hard to read on white screens. A deeper shade works better.
              </InfoNote>
            ) : null}

            <div>
              <p className="mb-2 fs-12 font-semibold text-slate-700">{isGradient ? "Gradient presets" : "Solid presets"}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {presets.map((preset) => {
                  const selected = selectedValue === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      disabled={controlsDisabled}
                      aria-pressed={selected}
                      onClick={() => setColor(preset.value)}
                      className={clsx(
                        "flex min-h-10 items-center gap-2.5 rounded-[var(--radius-control)] border bg-white px-3 text-left text-sm font-semibold text-slate-800 transition disabled:cursor-not-allowed disabled:opacity-60",
                        selected
                          ? "border-[var(--theme-color)] ring-2 ring-[color:color-mix(in_srgb,var(--theme-color)_18%,transparent)]"
                          : "border-slate-200 hover:border-[var(--theme-border)]"
                      )}
                    >
                      <span className="h-5 w-5 shrink-0 rounded-full border border-black/10" style={{ background: themeSwatchBackground(preset.value) }} />
                      <span className="min-w-0 flex-1 truncate">{preset.label}</span>
                      {selected ? <Check size={14} className="shrink-0 text-[var(--theme-color)]" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
                <Button disabled={!dirty || saving || loading} onClick={saveTheme}>
                  <Save size={16} />
                  {saving ? "Saving..." : "Save theme"}
                </Button>
                {dirty ? (
                  <Button variant="ghost" disabled={saving} onClick={() => setColor(savedColor)}>
                    <Undo2 size={15} />
                    Discard
                  </Button>
                ) : null}
                <Button
                  className="sm:ml-auto"
                  variant="secondary"
                  disabled={saving || loading || (isDefaultSaved && !dirty)}
                  onClick={resetTheme}
                >
                  <RotateCcw size={15} />
                  Reset to default
                </Button>
              </div>
            ) : null}
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-6">
          <SectionHeader
            eyebrow="Live preview"
            title="How it will look"
            description={dirty ? "Previewing your unsaved color across the app. Save to keep it." : "This is the theme currently saved for your company."}
          />
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            {/* Preview hamesha dark surface hai — inline colors, taaki light-mode utility overrides text na chhupaye. */}
            <div className="p-5" style={{ background: preview.hasGradient ? preview.gradient : `linear-gradient(135deg, ${preview.dark}, #020617)` }}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="fs-11 uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.6)" }}>Header</p>
                  <h3 className="mt-2 truncate fs-18 font-semibold" style={{ color: "#ffffff" }}>{preview.hasGradient ? "Gradient theme" : "Company Workspace"}</h3>
                </div>
                <div className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: preview.gradient, color: preview.contrast, boxShadow: "0 0 0 1px rgba(255,255,255,0.18)" }}>
                  Active
                </div>
              </div>
            </div>
            <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[170px_1fr]" style={{ background: "#0b1220" }}>
              <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: `linear-gradient(180deg, ${preview.sidebarBgTop}, ${preview.sidebarBgDeep})` }}>
                <div className="rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ background: preview.gradient, color: preview.contrast }}>Dashboard</div>
                <div className="rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}>Customers</div>
                <div className="rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>Invoices</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-4" style={{ borderColor: preview.border, backgroundColor: `${preview.color}18` }}>
                  <p className="fs-11 uppercase tracking-[0.18em]" style={{ color: "#94a3b8" }}>Card tint</p>
                  <p className="mt-2 fs-18 font-semibold" style={{ color: "#ffffff" }}>Theme aware</p>
                  <p className="mt-1 fs-12 font-semibold" style={{ color: preview.light }}>View details →</p>
                </div>
                <div className="flex flex-col items-start justify-between gap-3 rounded-lg border p-4" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
                  <p className="fs-11 uppercase tracking-[0.18em]" style={{ color: "#94a3b8" }}>Actions</p>
                  <span className={`${gradientSurfaceClass} rounded-[var(--radius-control)] px-4 py-2 text-sm font-semibold`}>
                    Primary Button
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 fs-12 text-slate-500">
            <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: themeSwatchBackground(selectedValue) }} />
            <span className="font-mono font-semibold text-slate-700">{selectedValue.replace(",", " → ")}</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
