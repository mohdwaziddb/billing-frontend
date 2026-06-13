const readSession = <T,>(key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeSession = (key: string, value: unknown) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore session storage errors in private / restricted browser modes.
  }
};

const clearSession = (key: string) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore session storage errors in private / restricted browser modes.
  }
};

export const sessionCache = {
  get: readSession,
  set: writeSession,
  clear: clearSession
};
