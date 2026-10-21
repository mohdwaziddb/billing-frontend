import type { AxiosRequestConfig } from "axios";

export type PageLoadingState = "idle" | "loading" | "blocking";

export type PageLoaderRequestConfig = AxiosRequestConfig & {
  skipPageLoader?: boolean;
  _pageLoaderId?: number;
};

type TrackedRequest = {
  blocking: boolean;
  timer?: number;
};

const REQUEST_SAFETY_TIMEOUT_MS = 120_000;

let activeCount = 0;
let blockingCount = 0;
let nextRequestId = 0;
let state: PageLoadingState = "idle";

const trackedRequests = new Map<number, TrackedRequest>();
const listeners = new Set<() => void>();

const isBlockingMethod = (method?: string) => {
  const normalized = method?.toLowerCase();
  return normalized !== "get" && normalized !== "head" && normalized !== "options";
};

const emit = () => {
  const nextState: PageLoadingState =
    blockingCount > 0 ? "blocking" : activeCount > 0 ? "loading" : "idle";

  if (nextState === state) {
    return;
  }

  state = nextState;
  listeners.forEach((listener) => listener());
};

const clearTimer = (entry: TrackedRequest) => {
  if (typeof window === "undefined" || !entry.timer) {
    return;
  }
  window.clearTimeout(entry.timer);
  entry.timer = undefined;
};

const finish = (config?: PageLoaderRequestConfig) => {
  const requestId = config?._pageLoaderId;
  if (!requestId) {
    return;
  }

  const entry = trackedRequests.get(requestId);
  if (!entry) {
    return;
  }

  clearTimer(entry);
  trackedRequests.delete(requestId);
  activeCount = Math.max(0, activeCount - 1);

  if (entry.blocking) {
    blockingCount = Math.max(0, blockingCount - 1);
  }

  emit();
};

const start = (config: PageLoaderRequestConfig) => {
  if (config.skipPageLoader) {
    return;
  }

  if (config._pageLoaderId && trackedRequests.has(config._pageLoaderId)) {
    return;
  }

  const requestId = ++nextRequestId;
  const entry: TrackedRequest = {
    blocking: isBlockingMethod(config.method)
  };

  config._pageLoaderId = requestId;
  trackedRequests.set(requestId, entry);
  activeCount += 1;

  if (entry.blocking) {
    blockingCount += 1;
  }

  if (typeof window !== "undefined") {
    entry.timer = window.setTimeout(() => finish(config), REQUEST_SAFETY_TIMEOUT_MS);
  }

  emit();
};

const reset = () => {
  trackedRequests.forEach(clearTimer);
  trackedRequests.clear();
  activeCount = 0;
  blockingCount = 0;
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => state;

export const pageLoadingService = {
  start,
  finish,
  reset,
  subscribe,
  getSnapshot
};
