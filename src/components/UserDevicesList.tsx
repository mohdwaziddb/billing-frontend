import clsx from "clsx";
import { LogOut, Monitor, Smartphone, Tablet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getMySessions, getUserSessions, logoutMyOtherSessions, logoutMySession, logoutUserSession } from "../api/sessions";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatDateTime } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { UserSession } from "../types/api";
import { Button } from "./Button";

const timeAgo = (value: string) => {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} day${days === 1 ? "" : "s"} ago` : formatDateTime(value);
};

const DeviceIcon = ({ type }: { type: UserSession["deviceType"] }) => {
  const Icon = type === "Mobile" ? Smartphone : type === "Tablet" ? Tablet : Monitor;
  return <Icon size={18} />;
};

/**
 * User ke devices (login sessions) — My Profile aur Users page dono me.
 * `userId` diya ho to Owner/Admin mode (kisi user ke devices), warna apne.
 */
export const UserDevicesList = ({ userId }: { userId?: number }) => {
  const { setApiError } = useApiMessage();
  const [sessions, setSessions] = useState<UserSession[] | null>(null);
  const [busyId, setBusyId] = useState<number | "others" | null>(null);

  const load = useCallback(() => {
    (userId ? getUserSessions(userId) : getMySessions())
      .then(setSessions)
      .catch((err: unknown) => {
        setSessions([]);
        setApiError(err, "Unable to load devices");
      });
  }, [setApiError, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const logout = async (session: UserSession) => {
    setBusyId(session.id);
    try {
      await (userId ? logoutUserSession(userId, session.id) : logoutMySession(session.id));
      notificationService.showSuccess(`${session.deviceName ?? "Device"} logged out.`);
      load();
    } catch (err) {
      setApiError(err, "Unable to log out this device");
    } finally {
      setBusyId(null);
    }
  };

  const logoutOthers = async () => {
    setBusyId("others");
    try {
      const count = await logoutMyOtherSessions();
      notificationService.showSuccess(count ? `${count} other device${count === 1 ? "" : "s"} logged out.` : "No other devices were signed in.");
      load();
    } catch (err) {
      setApiError(err, "Unable to log out other devices");
    } finally {
      setBusyId(null);
    }
  };

  if (sessions === null) {
    return <p className="text-sm text-slate-500">Loading devices…</p>;
  }

  const active = sessions.filter((session) => session.status === "ACTIVE");
  const ended = sessions.filter((session) => session.status !== "ACTIVE");
  const othersActive = active.filter((session) => !session.current).length;

  const row = (session: UserSession) => {
    const isActive = session.status === "ACTIVE";
    return (
      <li key={session.id} className="flex items-center gap-3 px-3 py-2.5">
        <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-lg", isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
          <DeviceIcon type={session.deviceType} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="truncate">{session.deviceName ?? "Unknown device"}</span>
            {session.current ? <span className="rounded-full bg-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)] px-2 py-0.5 fs-11 font-bold text-[var(--theme-color)]">This device</span> : null}
          </p>
          <p className="truncate text-xs text-slate-500" title={`Signed in ${formatDateTime(session.loginAt)}`}>
            {[session.ipAddress, isActive ? `Active ${timeAgo(session.lastActiveAt)}` : `${session.endedReason ?? "Ended"} · ${timeAgo(session.endedAt ?? session.lastActiveAt)}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {isActive && !session.current ? (
          <Button type="button" variant="secondary" disabled={busyId !== null} onClick={() => void logout(session)}>
            <LogOut size={14} />
            {busyId === session.id ? "…" : "Logout"}
          </Button>
        ) : null}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      {active.length ? (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">{active.map(row)}</ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">Not signed in on any device.</p>
      )}
      {!userId && othersActive > 0 ? (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" disabled={busyId !== null} onClick={() => void logoutOthers()}>
            <LogOut size={14} />
            {busyId === "others" ? "Logging out…" : "Logout all other devices"}
          </Button>
        </div>
      ) : null}
      {ended.length ? (
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-slate-500">Recent sign-outs ({ended.length})</summary>
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/60">{ended.map(row)}</ul>
        </details>
      ) : null}
    </div>
  );
};
