import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { APP_CONFIG } from "@/config/app.config";
import { useSettings } from "@/hooks/useSettings";
import { Link } from "react-router-dom";
import { KeyRound, Wrench } from "lucide-react";

export default function Header() {
  const { t, lang, setLang } = useLanguage();
  const { logout, user } = useAuthContext();
  const { data: settings } = useSettings();

  const storeName = settings?.storeName || t("common.storeName");

  const now = new Date();
  const dateStr = now.toLocaleDateString(APP_CONFIG.dateLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString(APP_CONFIG.timeLocale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              {user?.fullName || user?.username || t("nav.admin")}
            </span>
            {user?.role === "developer" && (
              <Link
                to="/license"
                className="pos-btn-primary text-xs px-3 py-1 gap-1 inline-flex items-center"
                title={lang === "ar" ? "لوحة تحكم المطور" : "Developer Dashboard"}
              >
                <Wrench size={12} />
                {lang === "ar" ? "لوحة المطور" : "Dev Panel"}
              </Link>
            )}
            <Link
              to="/change-password"
              className="pos-btn-secondary text-xs px-3 py-1 gap-1 inline-flex items-center"
              title={lang === "ar" ? "تغيير كلمة المرور" : "Change Password"}
            >
              <KeyRound size={12} />
              {lang === "ar" ? "كلمة المرور" : "Password"}
            </Link>
            <button
              className="pos-btn-secondary text-xs px-3 py-1"
              onClick={logout}
            >
              {t("nav.logout")}
            </button>
          </div>

          <h1 className="hidden md:block text-xl md:text-2xl font-bold text-primary text-center flex-1">
            {storeName}
          </h1>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="hidden sm:block text-right">
              <div>{dateStr}</div>
              <div>{timeStr}</div>
            </div>
            <div className="flex items-center gap-2">
              {APP_CONFIG.supportedLanguages.map((l) => (
                <label key={l} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="lang"
                    checked={lang === l}
                    onChange={() => setLang(l)}
                    className="accent-primary"
                  />
                  <span>{l === "en" ? "English" : "العربية"}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <h1 className="md:hidden text-lg font-bold text-primary text-center mt-2">
          {storeName} 
        </h1>
      </div>
    </header>
  );
}
