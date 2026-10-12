import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLicense } from "@/contexts/LicenseContext";
import { apiGet, apiPatch, apiPost, tokenStore } from "@/services/api";
import { APP_CONFIG } from "@/config/app.config";
import { showError, showSuccess } from "@/lib/toast-helpers";
import {
  Loader2,
  Power,
  ShieldAlert,
  Lock,
  Unlock,
  Calendar,
  Phone,
  Save,
  KeyRound,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  Sparkles,
} from "lucide-react";

export default function LicensePage() {
  const { lang } = useLanguage();
  const { refreshLicense: globalRefresh } = useLicense();

  const [status, setStatus] = useState(null);
  const [validUntil, setValidUntil] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [note, setNote] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState("");

  const isAr = lang === "ar";
  const text = (en, ar) => (isAr ? ar : en);

  const load = async () => {
    const res = await apiGet("/license/status");
    const data = res?.data || {};
    setStatus(data);
    setValidUntil(data.validUntil || "");
    setSupportPhone(data.supportPhone || "");
    setNote(data.note || "");
  };

  useEffect(() => {
    load().catch((err) =>
      showError(err, text("Could not load license status", "تعذر تحميل حالة الترخيص والنظام"))
    );
  }, []);

  const save = async (payload, key) => {
    setBusy(key);
    try {
      const res = await apiPatch("/license", payload);
      const data = res?.data || {};
      setStatus(data);
      setValidUntil(data.validUntil || "");
      if (globalRefresh) {
        await globalRefresh();
      }
      showSuccess(text("Settings updated successfully ✅", "تم تحديث الإعدادات بنجاح ✅"));
    } catch (err) {
      showError(err, text("Save failed", "فشل الحفظ"));
    } finally {
      setBusy("");
    }
  };

  const downloadBackup = async () => {
    setBusy("backup");
    try {
      const res = await fetch(`${APP_CONFIG.apiBaseUrl}/backup/download`, {
        headers: { Authorization: `Bearer ${tokenStore.getAccess()}` },
      });
      if (!res.ok) throw new Error("Backup failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.db`;
      link.click();
      URL.revokeObjectURL(url);
      showSuccess(text("Backup downloaded successfully", "تم تنزيل النسخة الاحتياطية بنجاح"));
    } catch (err) {
      showError(err, text("Backup failed", "فشل تحميل النسخة الاحتياطية"));
    } finally {
      setBusy("");
    }
  };

  const isSuspended = Boolean(status?.suspended);
  const isReadOnly = Boolean(status?.readOnly);

  // Status computation
  let statusBadge = {
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle2,
    label: text("Website LIVE & Active", "الموقع يعمل بشكل طبيعي (نشط)"),
    desc: text(
      "All normal operations (sales, add, edit, delete) are allowed.",
      "جميع العمليات متاحة بشكل طبيعي للمدير والكاشير."
    ),
  };

  if (isSuspended) {
    statusBadge = {
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      icon: Power,
      label: text("Website OFF (Complete Maintenance)", "الموقع متوقف بالكامل (صيانة شاملة)"),
      desc: text(
        "Website is completely shut down for users & admins. Full maintenance screen is displayed.",
        "الموقع مغلق تماماً أمام المستخدمين والمديرين وتظهر شاشة الصيانة."
      ),
    };
  } else if (isReadOnly) {
    statusBadge = {
      color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: Lock,
      label: text("Read-Only Mode (Add/Edit/Delete Frozen)", "وضع القراءة فقط (تجميد الإضافة والتعديل والحذف)"),
      desc: text(
        "Users and admins can view reports and products, but CANNOT add, edit, or delete any data.",
        "يمكن تصفح التقارير ولكن تم إيقاف إضافة أو تعديل أو حذف أي بيانات منعاً للأخطاء."
      ),
    };
  }

  const StatusIcon = statusBadge.icon;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-1">
            <Sparkles size={14} />
            <span>{text("Developer Control Center", "لوحة تحكم وإدارة المطور")}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {text("Website & License Management", "إدارة الموقع والصيانة والترخيص")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {text(
              "Baqalat Sheemah Khulaif Aayed Al-Enazi Lil-Mawad Al-Ghidha'iyyah",
              "بقالة شيمه خليف عايد العنزي للمواد الغذائية"
            )}
          </p>
        </div>

        {/* Global Status Pill */}
        <div
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${statusBadge.color} shadow-sm backdrop-blur-sm`}
        >
          <StatusIcon size={22} className="shrink-0" />
          <div>
            <div className="text-xs uppercase font-bold tracking-wider">{text("Current Mode", "الوضع الحالي")}</div>
            <div className="text-sm font-bold">{statusBadge.label}</div>
          </div>
        </div>
      </div>

      {/* 🎛️ Master Website Controls Card */}
      <div className="pos-card p-6 border-2 border-primary/20 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Wrench size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold">{text("Master Website Switches", "مفاتيح التحكم الشاملة بالموقع")}</h2>
            <p className="text-xs text-muted-foreground">
              {text(
                "Instantly turn off the entire website or freeze all add, edit, and delete operations during maintenance.",
                "إيقاف الموقع بالكامل أو تجميد عمليات الإضافة والتعديل والحذف لمنع أي تعديلات أثناء العمل على الموقع."
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Switch 1: Website Complete Power (OFF / ON) */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              isSuspended
                ? "bg-red-500/10 border-red-500/40 shadow-inner"
                : "bg-card border-border hover:border-border/80 shadow-sm"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full mb-2 ${
                    isSuspended ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {isSuspended ? text("OFFLINE / مغلق", "الموقع متوقف بالكامل") : text("ONLINE / مفتوح", "الموقع يعمل")}
                </span>
                <h3 className="font-bold text-base">{text("Website Power Switch", "تشغيل / إيقاف الموقع بالكامل")}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {text(
                    "When OFF, regular users & admins cannot log in or use the site. They will see the full maintenance screen with your custom message.",
                    "عند إيقاف الموقع، يُمنع دخول أي مستخدم أو مدير وتظهر شاشة الصيانة مع رسالة المطور ورقم الدعم."
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/40">
              <button
                disabled={!!busy}
                onClick={() =>
                  save(
                    { suspended: !isSuspended, note, supportPhone },
                    "suspend"
                  )
                }
                className={`w-full py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition shadow-md ${
                  isSuspended
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                    : "bg-red-600 hover:bg-red-500 text-white shadow-red-600/30"
                }`}
              >
                {busy === "suspend" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isSuspended ? (
                  <>
                    <Power size={16} />
                    <span>{text("Turn Website ON (Open Website)", "🟢 تشغيل الموقع (فتح الموقع للجميع)")}</span>
                  </>
                ) : (
                  <>
                    <Power size={16} />
                    <span>{text("Turn Website OFF (Full Maintenance)", "🔴 إيقاف الموقع بالكامل (شاشة الصيانة)")}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Switch 2: Freeze Add, Edit, Delete (Read-Only Mode) */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              isReadOnly
                ? "bg-amber-500/10 border-amber-500/40 shadow-inner"
                : "bg-card border-border hover:border-border/80 shadow-sm"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full mb-2 ${
                    isReadOnly ? "bg-amber-500/20 text-amber-400" : "bg-slate-500/20 text-slate-400"
                  }`}
                >
                  {isReadOnly ? text("FROZEN / مجمد", "التعديلات متوقفة") : text("NORMAL / طبيعي", "العمليات متاحة")}
                </span>
                <h3 className="font-bold text-base">
                  {text("Freeze Add, Edit & Delete", "تجميد الإضافة والتعديل والحذف")}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {text(
                    "Blocks all mutations across products, sales, customers, suppliers, inventory, etc. Users can only view data and reports safely.",
                    "يمنع إضافة، تعديل أو حذف أي بيانات (فواتير، أصناف، عملاء، موردين) مع السماح بالعرض والتصفح الآمن فقط."
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/40">
              <button
                disabled={!!busy}
                onClick={() =>
                  save(
                    { readOnly: !isReadOnly, note, supportPhone },
                    "readonly"
                  )
                }
                className={`w-full py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition shadow-md ${
                  isReadOnly
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                    : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30"
                }`}
              >
                {busy === "readonly" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isReadOnly ? (
                  <>
                    <Unlock size={16} />
                    <span>{text("Unfreeze / Allow All Operations", "🟢 إلغاء التجميد (السماح بالإضافات والتعديلات)")}</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>{text("Freeze Add, Edit & Delete Now", "🟡 إيقاف الإضافة والتعديل والحذف الآن")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 📢 Maintenance Message & Developer Support Card */}
      <div className="pos-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Phone size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold">
              {text("Maintenance Notice & Developer Contact", "رسالة الصيانة وهاتف الدعم الفني")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {text(
                "This message and phone number are displayed to users on the maintenance screen and top alert banner.",
                "تظهر هذه الرسالة ورقم الهاتف للمستخدمين عند تفعيل وضع الصيانة أو إيقاف الموقع."
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="pos-label">{text("Developer Support Phone", "رقم هاتف الدعم الفني للمطور")}</label>
            <input
              className="pos-input font-mono"
              placeholder={text("e.g. +966 50 123 4567", "مثال: 0551234567")}
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="pos-label">{text("Custom Maintenance Message", "رسالة / ملاحظة الصيانة للجميع")}</label>
            <input
              className="pos-input"
              placeholder={text(
                "e.g. Upgrading server database. Will be back at 10 PM.",
                "مثال: جاري ترقية النظام وتحديث البيانات، سنعود قريباً."
              )}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-4 pt-2">
            <button
              disabled={!!busy}
              onClick={() => save({ note, supportPhone }, "note")}
              className="pos-btn-primary gap-2"
            >
              {busy === "note" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{text("Save Message & Phone", "حفظ رسالة الصيانة وهاتف الدعم")}</span>
            </button>

            {/* Live user preview pill */}
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>{text("Live Preview:", "معاينة الرسالة:")}</span>
              <span className="font-semibold text-foreground italic">
                {note ? `"${note}"` : text("(Default maintenance message)", "(الرسالة الافتراضية)")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ⏳ License Expiry & Validity Card */}
      <div className="pos-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold">{text("License Expiry & Validity", "صلاحية الترخيص والتمديد")}</h2>
            <p className="text-xs text-muted-foreground">
              {text(
                "Manage POS system license validity date and quick extensions.",
                "إدارة تاريخ انتهاء البرنامج وتمديد فترة العمل بسرعة."
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-xl text-sm">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-muted-foreground" />
            <span>{text("Valid Until:", "صالح حتى:")}</span>
            <strong className="font-mono text-base">{status?.validUntil || "—"}</strong>
          </div>
          {typeof status?.daysLeft === "number" && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                status.daysLeft > 15
                  ? "bg-emerald-500/20 text-emerald-400"
                  : status.daysLeft > 0
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {status.daysLeft} {text("days left", "يوم متبقي")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="pos-label">{text("Specific Expiry Date (YYYY-MM-DD)", "تاريخ انتهاء محدد")}</label>
            <input
              type="date"
              className="pos-input font-mono"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              className="pos-btn-primary w-full"
              disabled={!!busy}
              onClick={() => save({ validUntil, supportPhone, note }, "date")}
            >
              {busy === "date" ? <Loader2 size={16} className="animate-spin" /> : text("Save Date", "حفظ التاريخ")}
            </button>
          </div>

          <div className="md:col-span-2 pt-2">
            <label className="pos-label mb-2 block">{text("Quick Extend Validity:", "تمديد سريع للصلاحية:")}</label>
            <div className="flex flex-wrap gap-2">
              {[30, 90, 180, 365].map((days) => (
                <button
                  key={days}
                  className="pos-btn-secondary"
                  disabled={!!busy}
                  onClick={() => save({ addDays: days, supportPhone, note }, String(days))}
                >
                  +{days} {text("days", "يوم")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 🔐 Passwords Card */}
      <div className="pos-card p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <KeyRound size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold">{text("Password Management", "إدارة كلمات المرور")}</h2>
            <p className="text-xs text-muted-foreground">
              {text(
                "Reset admin account password or update developer account credentials.",
                "إعادة تعيين كلمة مرور المدير أو تغيير كلمة مرور حساب المطور."
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reset Admin Password */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3">
            <h3 className="font-bold text-sm text-foreground">{text("Reset Shop Admin Password", "إعادة تعيين كلمة مرور المدير")}</h3>
            <div>
              <label className="pos-label">{text("New Admin Password", "كلمة المرور الجديدة للمدير")}</label>
              <input
                className="pos-input"
                type="password"
                placeholder={text("Minimum 6 characters", "6 أحرف على الأقل")}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
            <button
              className="pos-btn-primary w-full"
              disabled={!!busy || !adminPassword}
              onClick={async () => {
                setBusy("admin");
                try {
                  await apiPost("/license/reset-admin-password", { password: adminPassword });
                  setAdminPassword("");
                  showSuccess(text("Shop admin password reset successfully ✅", "تم تعيين كلمة مرور المدير بنجاح ✅"));
                } catch (err) {
                  showError(err, text("Reset failed", "فشل التعيين"));
                } finally {
                  setBusy("");
                }
              }}
            >
              {busy === "admin" ? <Loader2 size={16} className="animate-spin" /> : text("Set Admin Password", "تعيين كلمة مرور المدير")}
            </button>
          </div>

          {/* Change Developer Password */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3">
            <h3 className="font-bold text-sm text-foreground">{text("Change Developer Password", "تغيير كلمة مرور المطور")}</h3>
            <div>
              <label className="pos-label">{text("Current Developer Password", "كلمة مرور المطور الحالية")}</label>
              <input
                className="pos-input"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="pos-label">{text("New Developer Password", "كلمة المرور الجديدة")}</label>
              <input
                className="pos-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button
              className="pos-btn-primary w-full"
              disabled={!!busy || !oldPassword || !newPassword}
              onClick={async () => {
                setBusy("dev");
                try {
                  await apiPost("/license/change-developer-password", { oldPassword, newPassword });
                  setOldPassword("");
                  setNewPassword("");
                  showSuccess(
                    text("Developer password changed. Please log in again.", "تم تغيير كلمة مرور المطور بنجاح. سجّل الدخول مجدداً.")
                  );
                  tokenStore.clear();
                  window.location.href = "/login";
                } catch (err) {
                  showError(err, text("Change failed", "فشل تغيير كلمة المرور"));
                  setBusy("");
                }
              }}
            >
              {busy === "dev" ? <Loader2 size={16} className="animate-spin" /> : text("Save Developer Password", "حفظ كلمة مرور المطور")}
            </button>
          </div>
        </div>
      </div>

      {/* 💾 Database Backup Card */}
      <div className="pos-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold">{text("Database Backup & Export", "النسخ الاحتياطي لقاعدة البيانات")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {text(
              "Download an instant backup of all database collections and records.",
              "تنزيل نسخة احتياطية فورية لجميع الجداول والبيانات في النظام."
            )}
          </p>
        </div>

        <button
          className="pos-btn-secondary gap-2 shrink-0 w-full sm:w-auto"
          disabled={!!busy}
          onClick={downloadBackup}
        >
          {busy === "backup" ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          <span>{text("Download Backup", "تنزيل نسخة احتياطية")}</span>
        </button>
      </div>
    </div>
  );
}
