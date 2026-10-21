import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { pageLoadingService, type PageLoadingState } from "../services/pageLoadingService";

const SHOW_DELAY_MS = 120;
const MIN_VISIBLE_MS = 220;
const DOT_DELAYS = ["-0.32s", "-0.16s", "0s"];

export const CommonPageLoader = () => {
  const state = useSyncExternalStore(
    pageLoadingService.subscribe,
    pageLoadingService.getSnapshot,
    () => "idle" as PageLoadingState
  );
  const [visible, setVisible] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    let showTimer: number | undefined;
    let hideTimer: number | undefined;

    if (state !== "idle") {
      if (visible) {
        setBlocking(state === "blocking");
      } else {
        showTimer = window.setTimeout(() => {
          setBlocking(state === "blocking");
          setVisible(true);
        }, SHOW_DELAY_MS);
      }
    } else if (visible) {
      hideTimer = window.setTimeout(() => {
        setVisible(false);
        setBlocking(false);
      }, MIN_VISIBLE_MS);
    }

    return () => {
      if (showTimer) {
        window.clearTimeout(showTimer);
      }
      if (hideTimer) {
        window.clearTimeout(hideTimer);
      }
    };
  }, [state, visible]);

  if (!visible) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-y-0 right-0 z-[10000] flex items-center justify-center bg-slate-950/10 backdrop-blur-[2px] dark:bg-slate-950/25 ${
        blocking ? "pointer-events-auto cursor-wait" : "pointer-events-none"
      }`}
      style={{ left: "var(--app-content-left, 0px)" }}
      role="status"
      aria-live="polite"
      aria-label="Please wait"
    >
      <div className="flex min-w-[170px] flex-col items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white px-6 py-4 text-center shadow-[0_18px_50px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Please wait...</span>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          {DOT_DELAYS.map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 rounded-full bg-[var(--theme-color)] animate-loader-dot"
              style={{ animationDelay: delay }}
            />
          ))}
        </span>
      </div>
    </div>,
    document.body
  );
};
