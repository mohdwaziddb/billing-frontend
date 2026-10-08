/**
 * Single static place for the project's own site URLs.
 *
 * Domain kabhi change karna ho (e.g. biziotechnologies.com -> kuch aur)
 * to SIRF yahi file badlo — poora frontend (hosts.ts, App.tsx, LoginPage)
 * yahi se padhta hai. Kahi bhi domain hardcode mat karo.
 *
 * NOTE: third-party vendor URLs (Google Fonts, MSG91, Pinnacle) yaha nahi —
 * wo apne provider constants me rehte hai. Yaha sirf APNI site.
 */

// Production main domain (bare + www dono main host hai).
export const MAIN_DOMAIN = "biziotechnologies.com";
export const WWW_MAIN_HOST = `www.${MAIN_DOMAIN}`;

// Full main-site URLs (redirect targets).
export const MAIN_SITE_URL = `https://${MAIN_DOMAIN}`;
export const PLATFORM_ADMIN_LOGIN_URL = `${MAIN_SITE_URL}/platform-admin/login`;

// Local dev loopback hosts (main hosts me counted hote hai).
export const LOCALHOST = "localhost";
export const LOCAL_LOOPBACK = "127.0.0.1";
export const WWW_LOCALHOST = "www.localhost";

// Local dev API fallback (jab VITE_API_BASE_URL set na ho).
export const LOCAL_API_BASE_URL_FALLBACK = "http://localhost:9009/api";
