/**
 * Login Page
 * Professional login screen for Baqalat Sheemah Khulaif Aayed Al-Enazi Lil-Mawad Al-Ghidha'iyyah with JWT authentication.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, LogIn, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast-helpers";
import { apiGet } from "@/services/api";

export default function LoginPage() {
  const { login } = useAuthContext();
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [license, setLicense] = useState(null);
  const [logo, setLogo] = useState("");

  useEffect(() => {
    apiGet("/license/status", {}, { skipAuth: true })
      .then((res) => setLicense(res?.data || null))
      .catch(() => setLicense(null));
    apiGet("/settings/branding", {}, { skipAuth: true })
      .then((res) => setLogo(res?.data?.logo || ""))
      .catch(() => setLogo(""));
  }, []);

  const labels = {
    title: lang === "ar" ? "بقالة شيمه خليف عايد العنزي للمواد الغذائية" : "Baqalat Sheemah Khulaif Aayed Al-Enazi Lil-Mawad Al-Ghidha'iyyah",
    subtitle: lang === "ar" ? "تسجيل الدخول إلى حسابك" : "Sign in to your account",
    username: lang === "ar" ? "اسم المستخدم" : "Username",
    password: lang === "ar" ? "كلمة المرور" : "Password",
    login: lang === "ar" ? "تسجيل الدخول" : "Sign In",
    loading: lang === "ar" ? "جارِ التحقق..." : "Signing in...",
    errorGeneric: lang === "ar" ? "فشل تسجيل الدخول" : "Login failed",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.username.trim() || !form.password.trim()) {
      setError(lang === "ar" ? "جميع الحقول مطلوبة" : "All fields are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(form);
      showSuccess(lang === "ar" ? "تم تسجيل الدخول بنجاح" : "Login successful ✅");
      const stored = JSON.parse(localStorage.getItem("pos_user") || "null");
      navigate(stored?.role === "developer" ? "/license" : "/", { replace: true });
    } catch (err) {
      const msg = err?.message || labels.errorGeneric;
      setError(msg);
      showError(err, labels.errorGeneric);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          {logo ? (
            <img src={logo} alt="" className="login-logo" />
          ) : (
            <div className="login-icon">
              <LogIn size={28} />
            </div>
          )}
          <h1 className="login-title">{labels.title}</h1>
          <p className="login-subtitle">{labels.subtitle}</p>
        </div>

        {license?.suspended ? (
          <div className="login-error text-left rtl:text-right space-y-1.5 p-3.5 border border-red-500/40 bg-red-500/10 text-red-200 rounded-lg">
            <div className="flex items-center gap-1.5 font-bold text-red-400 text-sm">
              <ShieldAlert size={16} className="shrink-0" />
              <span>
                {lang === "ar"
                  ? "الموقع متوقف للصيانة حالياً (دخول المطور فقط)"
                  : "Website Offline for Maintenance (Developer Access Only)"}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {license.note || (lang === "ar"
                ? "يقوم المطور بإجراء صيانة للنظام. تم إيقاف دخول المستخدمين مؤقتاً."
                : "Maintenance is in progress. User logins are temporarily suspended.")}
            </p>
            {license.supportPhone && (
              <p className="text-xs font-mono font-bold text-emerald-400 pt-0.5">
                📞 {lang === "ar" ? "هاتف الدعم:" : "Support:"} {license.supportPhone}
              </p>
            )}
          </div>
        ) : license && !license.open ? (
          <div className="login-error">
            {lang === "ar" ? "انتهت صلاحية البرنامج. اتصل بالمطور." : "License expired. Contact the developer."}
            {license.supportPhone ? ` ${license.supportPhone}` : ""}
          </div>
        ) : null}

        {/* Error */}
        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div>
            <label className="pos-label">{labels.username}</label>
            <input
              type="text"
              className="pos-input"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              placeholder={labels.username}
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="pos-label">{labels.password}</label>
            <div className="login-password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className="pos-input"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder={labels.password}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((p) => !p)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="pos-btn-primary login-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {labels.loading}
              </>
            ) : (
              <>
                <LogIn size={16} />
                {labels.login}
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, hsl(220 25% 10%) 0%, hsl(220 25% 18%) 100%);
          padding: 1rem;
        }
        .login-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 1rem;
          padding: 2rem;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .login-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .login-logo {
          display: block;
          width: 160px;
          max-width: 100%;
          height: auto;
          max-height: 110px;
          object-fit: contain;
          margin: 0 auto 0.75rem;
        }
        .login-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          margin-bottom: 0.75rem;
        }
        .login-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: hsl(var(--foreground));
          margin: 0;
        }
        .login-subtitle {
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
          margin: 0.25rem 0 0;
        }
        .login-error {
          background: hsl(var(--destructive) / 0.15);
          color: hsl(var(--destructive));
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.85rem;
          text-align: center;
          margin-bottom: 1rem;
          border: 1px solid hsl(var(--destructive) / 0.3);
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .login-password-wrapper {
          position: relative;
        }
        .login-password-wrapper .pos-input {
          padding-right: 2.5rem;
        }
        .login-password-toggle {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: hsl(var(--muted-foreground));
          cursor: pointer;
          padding: 0;
          display: flex;
        }
        .login-password-toggle:hover {
          color: hsl(var(--foreground));
        }
        .login-submit {
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          gap: 0.5rem;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
