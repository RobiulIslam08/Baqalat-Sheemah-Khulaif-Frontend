import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { APP_CONFIG } from "@/config/app.config";
import enTranslations from "@/i18n/en.json";
import arTranslations from "@/i18n/ar.json";

const translationMap = {
  en: enTranslations,
  ar: arTranslations,
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem("pos-lang") || APP_CONFIG.defaultLanguage;
  });

  const setLang = useCallback((l) => {
    setLangState(l);
    localStorage.setItem("pos-lang", l);
  }, []);

  const t = useCallback(
    (key, params) => {
      const value = translationMap[lang]?.[key] || translationMap.en?.[key] || key;
      if (params) {
        return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
      }
      return value;
    },
    [lang]
  );

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [dir, lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
