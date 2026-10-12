import { useState, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { DatabaseBackup, RotateCcw, Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { tokenStore } from "@/services/api";
import { APP_CONFIG } from "@/config/app.config";
import { showSuccess, showError } from "@/lib/toast-helpers";

export default function BackupPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuthContext();
  const canBackup = user?.role === "admin" || user?.role === "developer";
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    backupName: "",
    backupType: "Full",
    destination: "Local Download",
    schedule: "Manual",
  });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleBackup = async () => {
    if (!canBackup) {
      showError(null, lang === "ar" ? "فقط المسؤول يمكنه إنشاء نسخة احتياطية" : "Only admins can create backups");
      return;
    }
    setIsBackingUp(true);

    try {
      const res = await fetch(`${APP_CONFIG.apiBaseUrl}/backup/download`, {
        headers: { Authorization: `Bearer ${tokenStore.getAccess()}` },
      });
      if (!res.ok) throw new Error("Backup failed");
      const blob = await res.blob();
      const name = (form.backupName || `pos-backup-${new Date().toISOString().slice(0, 10)}`).replace(/\s+/g, "_");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastBackup({
        name,
        date: new Date().toISOString(),
        records: "full",
        collections: 1,
        type: "Database file",
      });

      showSuccess(lang === "ar" ? "تم تنزيل نسخة قاعدة البيانات" : "Database file downloaded");
    } catch (err) {
      showError(err, lang === "ar" ? "فشل النسخ الاحتياطي" : "Backup failed");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setRestorePreview({
      name: file.name,
      date: new Date(file.lastModified).toISOString(),
      records: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      collections: 1,
      collectionNames: ["pos.db"],
    });
  };

  const handleRestore = async () => {
    if (!restoreFile || !canBackup) return;
    setIsRestoring(true);
    try {
      const buffer = await restoreFile.arrayBuffer();
      const res = await fetch(`${APP_CONFIG.apiBaseUrl}/backup/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenStore.getAccess()}`,
          "Content-Type": "application/octet-stream",
        },
        body: buffer,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Restore failed");
      tokenStore.clear();
      showSuccess(lang === "ar" ? "تمت الاستعادة. سجّل الدخول مرة أخرى." : "Database restored. Sign in again.");
      window.location.href = "/login";
    } catch (err) {
      showError(err, lang === "ar" ? "فشلت الاستعادة" : "Restore failed");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="pos-page-title">{t("nav.backup")}</h2>

      {/* Role Info */}
      {!canBackup && (
        <div className="pos-card p-3 flex items-center gap-2 text-sm text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle size={16} />
          {lang === "ar" ? "النسخ الاحتياطي متاح للمسؤولين فقط" : "Backup/Restore is available to admins only"}
        </div>
      )}

      {/* Backup Form */}
      <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="pos-label">{lang === "ar" ? "اسم النسخة" : "Backup Name"}</label>
          <input className="pos-input" placeholder={lang === "ar" ? "مثال: نسخة مايو" : "e.g. May 2026 Backup"} value={form.backupName} onChange={(e) => update("backupName", e.target.value)} />
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "نوع النسخة" : "Backup Type"}</label>
          <select className="pos-select" value={form.backupType} onChange={(e) => update("backupType", e.target.value)}>
            <option value="Full">{lang === "ar" ? "نسخة كاملة" : "Full (All Data)"}</option>
            <option value="Database">{lang === "ar" ? "البيانات الأساسية" : "Masters Only"}</option>
          </select>
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "الوجهة" : "Destination"}</label>
          <input className="pos-input bg-accent/30 cursor-default" value={lang === "ar" ? "ملف على هذا الجهاز (.db)" : "File on this PC (.db)"} readOnly />
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "الجدولة" : "Schedule"}</label>
          <select className="pos-select" value={form.schedule} onChange={(e) => update("schedule", e.target.value)}>
            <option value="Manual">{lang === "ar" ? "يدوي" : "Manual"}</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <button className="pos-btn-secondary gap-1" onClick={() => fileInputRef.current?.click()} disabled={!canBackup}>
          <RotateCcw size={14} /> {lang === "ar" ? "استعادة" : "Restore"}
        </button>
        <input ref={fileInputRef} type="file" accept=".db" className="hidden" onChange={handleRestoreFileChange} />
        <button className="pos-btn-primary gap-1" onClick={handleBackup} disabled={isBackingUp || !canBackup}>
          {isBackingUp ? <Loader2 size={14} className="animate-spin" /> : <DatabaseBackup size={14} />}
          {lang === "ar" ? "إنشاء نسخة" : "Create Backup"}
        </button>
      </div>

      {/* Last Backup Info */}
      {lastBackup && (
        <div className="pos-card p-4 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-emerald-500 mt-0.5 shrink-0" />
          <div className="text-sm space-y-1">
            <div className="font-semibold">{lang === "ar" ? "آخر نسخة احتياطية" : "Last Backup"}</div>
            <div className="text-muted-foreground">
              <strong>{lastBackup.name}</strong> — {lastBackup.type} — {lastBackup.records} {lang === "ar" ? "سجل" : "records"} ({lastBackup.collections} {lang === "ar" ? "جدول" : "collections"})
            </div>
            <div className="text-xs text-muted-foreground">{new Date(lastBackup.date).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Restore Preview */}
      {restorePreview && (
        <div className="pos-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Upload size={16} className="text-primary" />
            <span className="font-semibold text-sm">{lang === "ar" ? "معاينة الاستعادة" : "Restore Preview"}</span>
          </div>
          <div className="text-sm space-y-1 text-muted-foreground">
            <p><strong>{lang === "ar" ? "الاسم:" : "Name:"}</strong> {restorePreview.name}</p>
            <p><strong>{lang === "ar" ? "التاريخ:" : "Date:"}</strong> {new Date(restorePreview.date).toLocaleString()}</p>
            <p><strong>{lang === "ar" ? "السجلات:" : "Records:"}</strong> {restorePreview.records}</p>
            <p><strong>{lang === "ar" ? "الجداول:" : "Collections:"}</strong> {restorePreview.collectionNames.join(", ")}</p>
          </div>
          <button className="pos-btn-primary gap-1 mt-3" onClick={handleRestore} disabled={isRestoring}>
            {isRestoring ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {lang === "ar" ? "استعادة هذا الملف" : "Restore this file"}
          </button>
        </div>
      )}

      {/* Backup Guide */}
      <div className="pos-card p-4">
        <div className="text-sm font-semibold mb-2">{lang === "ar" ? "دليل النسخ الاحتياطي" : "Backup Guide"}</div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• {lang === "ar" ? "ملف واحد (.db) فيه كل بيانات هذا الجهاز: منتجات، مبيعات، مشتريات، مستخدمين." : "One .db file holds everything on this PC: products, sales, purchases, and users."}</p>
          <p>• {lang === "ar" ? "احفظ الملف على فلاشة. إذا تعطل الجهاز، ثبّت البرنامج على جهاز جديد ثم استعد الملف." : "Keep the file on a USB drive. If this PC fails, install the app on a new PC and restore the file."}</p>
          <p>• {lang === "ar" ? "عند فتح البرنامج كل يوم تُحفظ نسخة تلقائية لآخر 7 أيام على نفس الجهاز." : "Each day the app keeps an automatic copy for the last 7 days on this PC."}</p>
        </div>
      </div>
    </div>
  );
}