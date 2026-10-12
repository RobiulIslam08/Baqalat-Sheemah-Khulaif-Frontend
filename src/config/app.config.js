/**
 * App Configuration
 * -----------------
 * Baqalat Sheemah Khulaif Aayed Al-Enazi Lil-Mawad Al-Ghidha'iyyah POS
 * بقالة شيمه خليف عايد العنزي للمواد الغذائية
 */

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

  /** Backend API. Desktop and local dev use this PC; Vite proxies /api to port 5100. Supports custom URL for cPanel. */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1",

  /** Date/time locale */
  dateLocale: "en-GB",
  timeLocale: "en-US",
};
