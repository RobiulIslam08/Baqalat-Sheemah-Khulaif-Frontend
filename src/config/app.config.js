/**
 * App Configuration
 * -----------------
 * Baqalat Sheemah Khulaif Aayed Al-Enazi Lil-Mawad Al-Ghidha'iyyah POS
 * بقالة شيمه خليف عايد العنزي للمواد الغذائية
 */

const LOCAL_API_URL = "http://localhost:5100/api/v1";
const LIVE_API_URL = "https://baqalat-sheemah-khulaif-backend.vercel.app/api/v1";

/** Prefer VITE_API_BASE_URL. Ignore a localhost value in production builds. */
export function resolveApiBaseUrl() {
  const fromEnv = String(import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
  const pointsAtLocalhost = !fromEnv || /localhost|127\.0\.0\.1/i.test(fromEnv);
  if (import.meta.env.DEV) return fromEnv || LOCAL_API_URL;
  if (!pointsAtLocalhost) return fromEnv;
  return LIVE_API_URL;
}

export const APP_CONFIG = {
  /** Store identity */
  storeName: {
    en: "Baqalat Sheemah Khulaif Aayed Al-Enazi Lil-Mawad Al-Ghidha'iyyah",
    ar: "بقالة شيمه خليف عايد العنزي للمواد الغذائية",
  },

  /** Currency */
  currency: "SR",

  /** Default VAT percentage */
  vatPercent: 15,

  /** Default language: 'en' | 'ar' */
  defaultLanguage: "ar",

  /** Supported languages */
  supportedLanguages: ["ar", "en"],

  /** Default payment mode */
  defaultPaymentMode: "CREDIT CARD",

  /** Backend API. Local dev uses localhost; a production build uses the live Vercel API. */
  apiBaseUrl: resolveApiBaseUrl(),

  /** Date/time locale */
  dateLocale: "en-GB",
  timeLocale: "en-US",
};
