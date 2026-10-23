import { currentHostname, isLiveHost } from "./hosts";

const IST_TIME_ZONE = "Asia/Kolkata";

// Live EC2 ka MySQL UTC me likhta hai, local Windows MySQL IST me.
// Isliye +5:30 shift SIRF live hosts par: local dev ka time pehle jaisa rahega.
const useUtcSource = () =>
  typeof window !== "undefined" && isLiveHost(currentHostname());

// Backend MySQL DATETIME bhejta hai ("YYYY-MM-DD HH:mm:ss", offset nahi hota).
// Live par ise UTC maan ke IST me dikhate hain; local par browser-legacy parse.
// Offset wali ISO strings (Z / +05:30) ko chhoote nahi — unka offset hi chalega.
const parseServerDateTime = (value: string): Date => {
  const trimmed = value.trim();
  if (/([Zz]|[+-]\d{2}:?\d{2})$/.test(trimmed)) {
    return new Date(trimmed);
  }
  const dbDateTime = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(trimmed);
  if (dbDateTime && useUtcSource()) {
    const [, year, month, day, hour, minute, second] = dbDateTime;
    return new Date(Date.UTC(
      Number(year), Number(month) - 1, Number(day),
      Number(hour), Number(minute), Number(second ?? "0")
    ));
  }
  return new Date(trimmed);
};

const istParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const twelve = to12h(Number(get("hour") || "0"));
  return { day: get("day"), month: get("month"), year: get("year"), minute: get("minute"), ...twelve };
};

const localParts = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    day: pad(date.getDate()),
    month: pad(date.getMonth() + 1),
    year: String(date.getFullYear()),
    minute: pad(date.getMinutes()),
    ...to12h(date.getHours())
  };
};

// 12-hour clock everywhere (e.g. "04:43 PM"): single place so every screen
// shows the same time format.
const to12h = (hour24: number) => {
  const normalized = ((Math.floor(hour24) % 24) + 24) % 24;
  const ampm = normalized < 12 ? "AM" : "PM";
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return { hour: String(hour12).padStart(2, "0"), ampm };
};

const partsFor = (date: Date) => (useUtcSource() ? istParts(date) : localParts(date));

/**
 * Aaj ki LOCAL date "yyyy-MM-dd" me. toISOString() UTC deta hai: IST me raat
 * 12:00-5:29 ke beech kal ki date aa jaati thi.
 */
export const localIsoDate = (date: Date = new Date()) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "--";
  }
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (isoDateOnly) {
    return `${isoDateOnly[3]}-${isoDateOnly[2]}-${isoDateOnly[1]}`;
  }
  const date = parseServerDateTime(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const parts = partsFor(date);
  return `${parts.day}-${parts.month}-${parts.year}`;
};

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "--";
  }
  const date = parseServerDateTime(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const parts = partsFor(date);
  return `${parts.day}-${parts.month}-${parts.year} ${parts.hour}:${parts.minute} ${parts.ampm}`;
};

export const formatDateInputDisplay = (value: string | null | undefined) => formatDate(value);

export const formatTime = (value: string | null | undefined) => {
  if (!value) {
    return "--";
  }
  const date = parseServerDateTime(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const parts = partsFor(date);
  return `${parts.hour}:${parts.minute} ${parts.ampm}`;
};

/** "2m 14s" / "58s" / "1h 05m" — for dump durations (startedAt → finishedAt or now). */
export const formatDuration = (from: string | null | undefined, to?: string | null | undefined) => {
  if (!from) {
    return "--";
  }
  const start = parseServerDateTime(from).getTime();
  const end = to ? parseServerDateTime(to).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return "--";
  }
  const totalSeconds = Math.floor((end - start) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${seconds}s`;
};
