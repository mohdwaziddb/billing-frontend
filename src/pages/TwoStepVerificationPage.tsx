import { Check, Copy, Loader2, Monitor, Plus, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { confirmMfaSetup, deleteMfaDevice, getMfaStatus, startMfaSetup } from "../api/mfa";
import { Button } from "../components/Button";
import { Header } from "../components/Header";
import { Modal } from "../components/Modal";
import { getApiErrorMessage } from "../lib/errors";
import { formatDate } from "../lib/format";
import type { MfaDevice, MfaStatus } from "../types/api";

const DEVICE_SUGGESTIONS = ["Phone", "Desktop"];

export const TwoStepVerificationPage = () => {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [deviceName, setDeviceName] = useState("Phone");
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [stepLoading, setStepLoading] = useState(false);
  const [stepError, setStepError] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteDevice, setConfirmDeleteDevice] = useState<MfaDevice | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setStatus(await getMfaStatus());
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Unable to load MFA status."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setDeviceName("Phone");
    setQrBase64(null);
    setManualSecret(null);
    setCode("");
    setStepError("");
    setSecretCopied(false);
    setAddOpen(true);
  };

  const handleStart = async () => {
    const name = deviceName.trim();
    if (!name) {
      setStepError("Device name is required (e.g. Phone or Desktop).");
      return;
    }
    try {
      setStepLoading(true);
      setStepError("");
      const started = await startMfaSetup(name);
      setQrBase64(started.qrBase64);
      setManualSecret(started.secret);
      setDeviceName(started.deviceName);
    } catch (err: any) {
      setStepError(getApiErrorMessage(err, "Unable to generate QR. Please try again."));
    } finally {
      setStepLoading(false);
    }
  };

  const handleConfirm = async () => {
    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      setStepError("Enter the 6-digit code shown in your authenticator app.");
      return;
    }
    try {
      setStepLoading(true);
      setStepError("");
      await confirmMfaSetup(deviceName.trim(), cleanCode);
      setAddOpen(false);
      await load();
    } catch (err: any) {
      setStepError(getApiErrorMessage(err, "Incorrect code. Enter the 6-digit code from your authenticator app."));
    } finally {
      setStepLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteDevice) {
      return;
    }
    const id = confirmDeleteDevice.id;
    try {
      setDeletingId(id);
      await deleteMfaDevice(id);
      setConfirmDeleteDevice(null);
      await load();
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Unable to remove device."));
    } finally {
      setDeletingId(null);
    }
  };

  const copySecret = async () => {
    if (!manualSecret) {
      return;
    }
    try {
      await navigator.clipboard.writeText(manualSecret);
      setSecretCopied(true);
      window.setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      setStepError("Could not copy — please note down the secret manually.");
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <Header
        title="Two Step Verification"
        subtitle="Protect your account with verification codes from your authenticator app."
      />

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-500">
          <Loader2 size={16} className="animate-spin" /> Loading MFA status…
        </div>
      ) : error && !status ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">{error}</div>
      ) : status ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <ShieldCheck size={18} />
              </span>
              <div>
                <p className="text-[15px] font-bold text-slate-950">Multi-Factor Authentication</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  Add an additional level of security by requiring a verification code in addition to your password
                  whenever you sign in.
                </p>
                {!status.applyMfaByCompany ? (
                  <p className="mt-1 text-sm font-medium text-amber-700">
                    MFA is not enabled for this company — please contact your administrator.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <span
                className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide sm:self-end ${
                  status.mfaEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${status.mfaEnabled ? "bg-emerald-500" : "bg-slate-400"}`} />
                {status.mfaEnabled ? "Enabled" : "Disabled"}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => setGuideOpen(true)}>
                  MFA Guide
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="bg-emerald-600 whitespace-nowrap"
                  disabled={!status.applyMfaByCompany}
                  onClick={openAdd}
                >
                  <Plus size={16} /> Add Multi-Factor Authentication
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[15px] font-bold text-slate-950">
                {status.mfaEnabled ? "Multi-Factor Authentication is Enabled" : "Multi-Factor Authentication is Disabled"}
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                {status.mfaEnabled
                  ? "We will now require you to enter a verification code whenever you log in on a device that we don't recognise."
                  : status.devices.length > 0
                    ? "Your devices are listed below. Confirm one to turn protection on."
                    : "Add a device below to protect your account with verification codes."}
              </p>
            </div>
            {status.devices.length > 0 ? (
              <p className="text-sm font-semibold text-slate-500">
                {status.devices.length} device{status.devices.length === 1 ? "" : "s"} enrolled
              </p>
            ) : null}
          </div>

          {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {status.devices.map((device) => (
              <div key={device.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  {/desktop|laptop|pc/i.test(device.deviceName) ? <Monitor size={22} /> : <Smartphone size={22} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-slate-950">{device.deviceName}</p>
                  <p className="text-[13px] leading-snug text-slate-500">Login codes from your authentication app.</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Enrolled {device.enrolledAt ? formatDate(device.enrolledAt) : "—"}
                    {device.lastUsedAt ? ` • Last used ${formatDate(device.lastUsedAt)}` : " • Never used yet"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${device.deviceName}`}
                  disabled={deletingId === device.id}
                  onClick={() => setConfirmDeleteDevice(device)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500 transition hover:bg-rose-100 disabled:opacity-60"
                >
                  {deletingId === device.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            ))}
            {status.devices.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 p-6 text-center sm:col-span-2 lg:col-span-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <ShieldCheck size={20} />
                </span>
                <p className="text-sm font-semibold text-slate-700">No devices enrolled yet</p>
                <p className="max-w-md text-sm text-slate-500">
                  Click <strong>Add Multi-Factor Authentication</strong> above, scan the QR with your authenticator
                  app, and confirm the code.
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
            {[
              { step: "1", title: "Add a device", text: "Name your phone or desktop and generate its QR code." },
              { step: "2", title: "Scan the QR", text: "Scan it with Google Authenticator or a similar app." },
              { step: "3", title: "Enter code at login", text: "Use the 6-digit app code with your password." }
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-950">{item.title}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Modal
        open={Boolean(confirmDeleteDevice)}
        title="Remove device?"
        eyebrow="MFA Device"
        maxWidthClass="max-w-md"
        onClose={() => !deletingId && setConfirmDeleteDevice(null)}
      >
        <p className="text-sm leading-relaxed text-slate-600">
          <strong>{confirmDeleteDevice?.deviceName}</strong> will be removed and its codes will stop working
          immediately. {status?.devices && status.devices.length <= 1 ? "This is your last device — MFA protection will turn off." : ""} Continue?
        </p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={deletingId !== null} onClick={() => setConfirmDeleteDevice(null)}>
            Cancel
          </Button>
          <Button type="button" variant="danger" disabled={deletingId !== null} onClick={() => void handleDelete()}>
            {deletingId !== null ? "Removing…" : "Remove"}
          </Button>
        </div>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Multi-Factor Authentication" eyebrow="MFA Setup" maxWidthClass="max-w-lg">
        {!qrBase64 ? (
          <div>
            <p className="text-sm text-slate-600">
              Enter a device name (e.g. <strong>Phone</strong> or <strong>Desktop</strong>), generate the QR code,
              then scan it with Google Authenticator.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEVICE_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setDeviceName(suggestion)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    deviceName === suggestion
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-500"
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <input
              value={deviceName}
              maxLength={50}
              onChange={(event) => setDeviceName(event.target.value)}
              placeholder="Device name"
              className="mt-3 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-slate-900"
            />
            {stepError ? <p className="mt-2 text-sm font-medium text-rose-600">{stepError}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" className="bg-emerald-600" disabled={stepLoading} onClick={() => void handleStart()}>
                {stepLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Generating…
                  </>
                ) : (
                  "Generate QR"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-600">
              In Google Authenticator, tap <strong>+ → Scan a QR code</strong> and scan the QR shown here. Then enter
              the 6-digit code from the app below.
            </p>
            <div className="mt-3 flex justify-center rounded-xl border border-slate-200 bg-white p-4">
              <img src={qrBase64} alt="MFA QR code" className="h-56 w-56" />
            </div>
            {manualSecret ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5">
                <code className="flex-1 break-all text-sm font-bold tracking-wider text-slate-800">{manualSecret}</code>
                <button
                  type="button"
                  onClick={() => void copySecret()}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 transition hover:text-slate-950"
                  aria-label="Copy secret"
                >
                  {secretCopied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            ) : null}
            <input
              value={code}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && code.trim().length === 6 && !stepLoading) {
                  void handleConfirm();
                }
              }}
              placeholder="6-digit code"
              className="mt-3 h-12 w-full rounded-xl border border-slate-300 text-center text-xl font-bold tracking-[0.4em] outline-none focus:border-slate-900"
            />
            {stepError ? <p className="mt-2 text-sm font-medium text-rose-600">{stepError}</p> : null}
            <p className="mt-2 text-[13px] leading-snug text-amber-700">
              This QR will not be shown again after confirmation. Do not delete the entry from your authenticator
              app — if lost, ask your OWNER to reset MFA so you can enroll again.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setQrBase64(null);
                  setManualSecret(null);
                  setCode("");
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                className="bg-emerald-600"
                disabled={stepLoading || code.trim().length !== 6}
                onClick={() => void handleConfirm()}
              >
                {stepLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Verifying…
                  </>
                ) : (
                  "Confirm & Enable"
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="MFA Guide" eyebrow="Help" maxWidthClass="max-w-lg">
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          <li>Open the Google Authenticator or Microsoft Authenticator app on your phone.</li>
          <li>Tap <strong>+ → Scan a QR code</strong> and scan this page&apos;s QR code.</li>
          <li>Enter the 6-digit code shown in the app here for confirmation (it changes every 30 seconds).</li>
          <li>Once enabled, every login will ask for the app code in addition to your password.</li>
          <li>If the entry is deleted by mistake or the phone is lost, ask your OWNER for an <strong>MFA reset</strong>, then enroll again.</li>
        </ol>
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="primary" onClick={() => setGuideOpen(false)}>
            Got it
          </Button>
        </div>
      </Modal>
    </div>
  );
};
