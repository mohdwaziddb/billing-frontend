import { tenantKeySuffix } from "./hosts";

const DISMISS_KEY_PREFIX = "bizio_mfa_enroll_dismissed";

export const mfaEnrollDismissKey = (username: string | null) =>
  `${DISMISS_KEY_PREFIX}${tenantKeySuffix()}:${(username ?? "anon").toLowerCase()}`;

export const isMfaEnrollDismissed = (key: string) => {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

export const markMfaEnrollDismissed = (key: string) => {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // Private / restricted browser modes — banner simply shows again.
  }
};

/**
 * Fresh login par dismiss bhool jao taaki bina-enroll user ko banner phir
 * dikhe. AuthContext.finishUserLogin se call hota hai. Token-refresh isko
 * nahi chhuta — refresh par banner wapas nahi ayega.
 */
export const resetMfaEnrollBanner = (username: string | null) => {
  try {
    sessionStorage.removeItem(mfaEnrollDismissKey(username));
  } catch {
    // Ignore storage errors.
  }
};
