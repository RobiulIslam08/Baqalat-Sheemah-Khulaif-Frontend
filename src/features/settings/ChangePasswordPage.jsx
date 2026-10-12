import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useChangePassword } from "@/hooks/useUsers";
import { Lock, Eye, EyeOff, Loader2, ShieldCheck, KeyRound } from "lucide-react";

export default function ChangePasswordPage() {
  const { lang } = useLanguage();
  const { user } = useAuthContext();
  const changePassword = useChangePassword();

  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const next = {};
    if (!form.oldPassword) {
      next.oldPassword = lang === "ar" ? "كلمة المرور الحالية مطلوبة" : "Current password is required";
    }
    if (!form.newPassword || form.newPassword.length < 6) {
      next.newPassword = lang === "ar" ? "كلمة المرور الجديدة 6 أحرف على الأقل" : "New password must be at least 6 characters";
    }
    if (form.newPassword !== form.confirmPassword) {
      next.confirmPassword = lang === "ar" ? "كلمات المرور غير متطابقة" : "Passwords do not match";
    }
    if (form.oldPassword && form.newPassword && form.oldPassword === form.newPassword) {
      next.newPassword = lang === "ar" ? "كلمة المرور الجديدة يجب أن تكون مختلفة" : "New password must be different from current password";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    changePassword.mutate(
      { oldPassword: form.oldPassword, newPassword: form.newPassword },
      {
        onSuccess: () => {
          setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
          setErrors({});
        },
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="space-y-4">
      <h2 className="pos-page-title">
        {lang === "ar" ? "تغيير كلمة المرور" : "Change Password"}
      </h2>

      {/* User info card */}
      <div className="pos-card p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
          <ShieldCheck size={22} className="text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">
            {user?.fullName || user?.username || "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {user?.email || "—"} &middot;{" "}
            <span className="capitalize">{user?.role || "—"}</span>
          </p>
        </div>
      </div>

      {/* Change password form */}
      <div className="pos-card p-4 md:p-6 max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound size={18} className="text-primary" />
          <h3 className="font-semibold text-foreground">
            {lang === "ar" ? "تعيين كلمة مرور جديدة" : "Set New Password"}
          </h3>
        </div>

        <div className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="pos-label">
              {lang === "ar" ? "كلمة المرور الحالية" : "Current Password"}
            </label>
            <div className="relative">
              <input
                className="pos-input pr-10"
                type={showOld ? "text" : "password"}
                value={form.oldPassword}
                onChange={(e) => update("oldPassword", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={lang === "ar" ? "أدخل كلمة المرور الحالية" : "Enter current password"}
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.oldPassword && (
              <p className="text-xs text-destructive mt-1">{errors.oldPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="pos-label">
              {lang === "ar" ? "كلمة المرور الجديدة" : "New Password"}
            </label>
            <div className="relative">
              <input
                className="pos-input pr-10"
                type={showNew ? "text" : "password"}
                value={form.newPassword}
                onChange={(e) => update("newPassword", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={lang === "ar" ? "أدخل كلمة المرور الجديدة" : "Enter new password"}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-destructive mt-1">{errors.newPassword}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {lang === "ar" ? "الحد الأدنى 6 أحرف" : "Minimum 6 characters"}
            </p>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="pos-label">
              {lang === "ar" ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}
            </label>
            <div className="relative">
              <input
                className="pos-input pr-10"
                type={showConfirm ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={lang === "ar" ? "أعد إدخال كلمة المرور الجديدة" : "Re-enter new password"}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3 mt-6">
          <button
            className="pos-btn-secondary gap-1"
            onClick={() => {
              setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
              setErrors({});
            }}
          >
            {lang === "ar" ? "إعادة تعيين" : "Reset"}
          </button>
          <button
            className="pos-btn-primary gap-1"
            onClick={handleSubmit}
            disabled={changePassword.isPending}
          >
            {changePassword.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Lock size={14} />
            )}
            {lang === "ar" ? "تغيير كلمة المرور" : "Change Password"}
          </button>
        </div>
      </div>

      {/* Security note */}
      <div className="pos-card p-4 max-w-lg mx-auto">
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground mb-2">
            {lang === "ar" ? "ملاحظات أمنية:" : "Security Notes:"}
          </p>
          <p>• {lang === "ar" ? "استخدم كلمة مرور قوية تحتوي على أحرف وأرقام" : "Use a strong password with letters and numbers"}</p>
          <p>• {lang === "ar" ? "لا تشارك كلمة المرور مع أي شخص" : "Never share your password with anyone"}</p>
          <p>• {lang === "ar" ? "قم بتغيير كلمة المرور بانتظام" : "Change your password regularly"}</p>
        </div>
      </div>
    </div>
  );
}
