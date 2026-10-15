import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSettings, useUpdateSettings, useResetDemo, useDeleteAllData } from "@/hooks/useSettings";
import { Save, ShieldCheck, Printer, Loader2, X, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { apiGet } from "@/services/api";

const LOGO_MAX_EDGE = 900;
const LOGO_MAX_CHARS = 1_200_000;

function resizeLogo(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      reject(new Error("type"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
      const encode = (edge) => {
        const scale = Math.min(1, edge / img.width, edge / img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return mime === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.92);
      };
      let edge = LOGO_MAX_EDGE;
      let dataUrl = encode(edge);
      while (dataUrl.length > LOGO_MAX_CHARS && edge > 360) {
        edge = Math.round(edge * 0.85);
        dataUrl = encode(edge);
      }
      if (dataUrl.length > LOGO_MAX_CHARS) {
        reject(new Error("size"));
        return;
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}

export default function SettingsPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuthContext();
  const operatorRole = user?.role || "cashier";
  const canSave = operatorRole === "admin" || operatorRole === "developer";
  const canDiagnose = operatorRole !== "cashier";

  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const resetDemo = useResetDemo();
  const deleteAll = useDeleteAllData();

  const [form, setForm] = useState({
    storeName: "",
    storeNameAr: "",
    storeNameEn: "",
    vatNumber: "",
    invoicePrefix: "",
    defaultPayment: "Cash",
    timezone: "Asia/Riyadh",
    supportContact: "",
    lowStockAlert: 10,
    allowNegativeStock: "no",
    storeAddress: "",
    crNumber: "",
    invoiceLanguage: "both",
    logo: "",
  });
  const [errors, setErrors] = useState({});
  const [logoError, setLogoError] = useState("");
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  useEffect(() => {
    if (settings) setForm((p) => ({ ...p, ...settings }));
  }, [settings]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleLogoFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canSave) return;
    setLogoError("");
    try {
      const dataUrl = await resizeLogo(file);
      update("logo", dataUrl);
    } catch (err) {
      const typeError = lang === "ar" ? "يُقبل PNG أو JPEG أو WebP فقط" : "Only PNG, JPEG, or WebP images are accepted";
      const sizeError = lang === "ar" ? "الشعار كبير جداً. اختر صورة أصغر" : "Logo is too large. Choose a smaller image";
      setLogoError(err?.message === "size" ? sizeError : typeError);
    }
  };

  const validate = () => {
    const next = {};
    if (!form.storeName.trim()) next.storeName = lang === "ar" ? "اسم المتجر مطلوب" : "Store name is required";
    if (!/^\d{15}$/.test(form.vatNumber))
      next.vatNumber = lang === "ar" ? "الرقم الضريبي السعودي يجب أن يكون 15 رقم" : "Saudi VAT number must be 15 digits";
    if (!form.invoicePrefix.trim()) next.invoicePrefix = lang === "ar" ? "بادئة الفاتورة مطلوبة" : "Invoice prefix is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!canSave || !validate()) return;
    const submissionData = {
      ...form,
      lowStockAlert: form.lowStockAlert === "" ? undefined : Number(form.lowStockAlert),
    };
    updateSettings.mutate(submissionData);
  };

  const runDiagnostics = async () => {
    setIsDiagnosing(true);
    setDiagResult(null);
    const results = [];

    try {
      // 1. API Check
      const start = Date.now();
      await apiGet("/users/me");
      results.push({ name: "API Connectivity", status: "ok", detail: `${Date.now() - start}ms response` });
    } catch (err) {
      results.push({ name: "API Connectivity", status: "error", detail: "Cannot reach backend server" });
    }

    // 2. Auth Check
    results.push({ name: "User Session", status: user ? "ok" : "error", detail: user ? `Logged in as ${user.username}` : "Not authenticated" });

    // 3. Database Sync
    results.push({ name: "Settings Sync", status: settings ? "ok" : "warning", detail: settings ? "Synchronized" : "Local fallback active" });

    // 4. Browser Environment
    results.push({ name: "Browser Support", status: "ok", detail: navigator.userAgent.slice(0, 30) + "..." });

    setDiagResult(results);
    setIsDiagnosing(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="pos-page-title">{t("nav.settings")}</h2>

      <div className="pos-card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="pos-label">{lang === "ar" ? "الدور الحالي" : "Current Role"}</label>
          <div className="pos-input bg-accent/30 cursor-default">{operatorRole}</div>
        </div>
        <div className="md:col-span-2 text-xs text-muted-foreground rounded-md border border-border px-3 py-2 bg-accent/20">
          {canSave
            ? lang === "ar" ? "يمكنك حفظ إعدادات النظام" : "You can save system configuration"
            : lang === "ar" ? "الحفظ متاح فقط للإدارة" : "Saving settings is restricted to admin"}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="pos-label">{lang === "ar" ? "اسم المتجر" : "Store Name"}</label>
            <input
              className="pos-input"
              value={form.storeName}
              onChange={(e) => update("storeName", e.target.value)}
            />
            {errors.storeName && <p className="text-xs text-destructive mt-1">{errors.storeName}</p>}
          </div>
          <div>
            <label className="pos-label">{lang === "ar" ? "اسم المتجر (عربي) — للفاتورة" : "Store Name (Arabic) — for Invoice"}</label>
            <input
              className="pos-input"
              dir="rtl"
              value={form.storeNameAr || ""}
              onChange={(e) => update("storeNameAr", e.target.value)}
              placeholder="بقالة شيمه خليف عايد العنزي للمواد الغذائية"
            />
          </div>
          <div>
            <label className="pos-label">{lang === "ar" ? "اسم المتجر (إنجليزي) — للفاتورة" : "Store Name (English) — for Invoice"}</label>
            <input
              className="pos-input"
              dir="ltr"
              value={form.storeNameEn || ""}
              onChange={(e) => update("storeNameEn", e.target.value)}
              placeholder="Baqalat Sheemah Khulaif Aayed Al-Enazi"
            />
          </div>
          <div className="md:col-span-2">
            <label className="pos-label">{lang === "ar" ? "شعار المتجر" : "Store Logo"}</label>
            <div className="flex flex-wrap items-center gap-3">
              {form.logo ? (
                <img src={form.logo} alt="" className="h-24 w-auto max-w-[12rem] object-contain rounded-md border border-border bg-white" />
              ) : (
                <div className="h-16 w-16 rounded-md border border-dashed border-border bg-accent/20" />
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="text-sm"
                disabled={!canSave}
                onChange={handleLogoFile}
              />
              {form.logo && canSave && (
                <button type="button" className="pos-btn-secondary text-xs" onClick={() => update("logo", "")}>
                  {lang === "ar" ? "إزالة الشعار" : "Remove logo"}
                </button>
              )}
            </div>
            {logoError && <p className="text-xs text-destructive mt-1">{logoError}</p>}
          </div>
          <div>
            <label className="pos-label">{lang === "ar" ? "الرقم الضريبي" : "VAT Number"}</label>
            <input
              className="pos-input"
              value={form.vatNumber}
              onChange={(e) => update("vatNumber", e.target.value)}
            />
            {errors.vatNumber && <p className="text-xs text-destructive mt-1">{errors.vatNumber}</p>}
          </div>
          <div>
            <label className="pos-label">{lang === "ar" ? "السجل التجاري" : "CR Number"}</label>
            <input
              className="pos-input"
              value={form.crNumber || ""}
              onChange={(e) => update("crNumber", e.target.value)}
              placeholder="e.g. 7006133065"
            />
          </div>
          <div>
            <label className="pos-label">{lang === "ar" ? "عنوان المتجر" : "Store Address"}</label>
            <input
              className="pos-input"
              value={form.storeAddress || ""}
              onChange={(e) => update("storeAddress", e.target.value)}
              placeholder="e.g. خميس مشيط - مخطط الحسام"
            />
          </div>
          <div>
            <label className="pos-label">{lang === "ar" ? "بادئة الفاتورة" : "Invoice Prefix"}</label>
            <input
              className="pos-input"
              value={form.invoicePrefix}
              onChange={(e) => update("invoicePrefix", e.target.value)}
            />
            {errors.invoicePrefix && <p className="text-xs text-destructive mt-1">{errors.invoicePrefix}</p>}
          </div>
          <div>
            <label className="pos-label">{lang === "ar" ? "لغة الفاتورة" : "Invoice Language"}</label>
            <select
              className="pos-select"
              value={form.invoiceLanguage || "both"}
              onChange={(e) => update("invoiceLanguage", e.target.value)}
            >
              <option value="ar">{lang === "ar" ? "الفاتورة بالعربية فقط" : "Invoice Arabic"}</option>
              <option value="en">{lang === "ar" ? "الفاتورة بالإنجليزية فقط" : "Invoice English"}</option>
              <option value="both">{lang === "ar" ? "الفاتورة بالعربية والإنجليزية" : "Invoice Arabic and English"}</option>
            </select>
          </div>
          <div>
            <label className="pos-label">{lang === "ar" ? "الدفع الافتراضي" : "Default Payment"}</label>
            <select className="pos-select" value={form.defaultPayment} onChange={(e) => update("defaultPayment", e.target.value)}>
              <option>Cash</option>
              <option>Card</option>
              <option>Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="pos-label">{lang === "ar" ? "المنطقة الزمنية" : "Timezone"}</label>
            <select className="pos-select" value={form.timezone} onChange={(e) => update("timezone", e.target.value)}>
              <option>Asia/Riyadh</option>
              <option>UTC</option>
            </select>
          </div>
          <div>
            <label className="pos-label">{lang === "ar" ? "جهة الدعم" : "Support Contact"}</label>
            <input
              className="pos-input"
              value={form.supportContact}
              onChange={(e) => update("supportContact", e.target.value)}
            />
          </div>
          <div>
            <label className="pos-label">{t("settings.lowStockAlert")}</label>
            <input
              className="pos-input"
              type="number"
              value={form.lowStockAlert}
              onChange={(e) => {
                const val = e.target.value;
                update("lowStockAlert", val === "" ? "" : Number(val));
              }}
            />
          </div>
          <div>
            <label className="pos-label">{lang === "ar" ? "إدارة المخزون السالب" : "Negative Stock Management"}</label>
            <select
              className="pos-select"
              value={form.allowNegativeStock}
              onChange={(e) => update("allowNegativeStock", e.target.value)}
            >
              <option value="no">{lang === "ar" ? "منع المخزون السالب" : "Disallow Negative Stock"}</option>
              <option value="yes">{lang === "ar" ? "السماح بالمخزون السالب" : "Allow Negative Stock"}</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-3">
        <button className="pos-btn-secondary gap-1" disabled={!canDiagnose} onClick={runDiagnostics}>
          {isDiagnosing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          {lang === "ar" ? "تشخيص" : "Diagnostics"}
        </button>
        <button className="pos-btn-primary gap-1" disabled={!canSave || updateSettings.isPending} onClick={handleSave}>
          {updateSettings.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {lang === "ar" ? "حفظ الإعدادات" : "Save Settings"}
        </button>
        <button className="pos-btn-secondary gap-1" onClick={() => window.print()}>
          <Printer size={14} /> {lang === "ar" ? "طباعة الملخص" : "Print Summary"}
        </button>
      </div>

      <div className="pos-card p-4 md:p-5 print:shadow-none print:border-none">
        <h3 className="font-semibold mb-3">{lang === "ar" ? "ملخص الإعدادات" : "Configuration Summary"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div>
            <strong>Store:</strong> {form.storeName}
          </div>
          <div>
            <strong>VAT:</strong> {form.vatNumber}
          </div>
          <div>
            <strong>CR Number:</strong> {form.crNumber || "—"}
          </div>
          <div>
            <strong>Address:</strong> {form.storeAddress || "—"}
          </div>
          <div>
            <strong>Invoice Prefix:</strong> {form.invoicePrefix}
          </div>
          <div>
            <strong>Invoice Language:</strong>{" "}
            {form.invoiceLanguage === "ar" ? "Arabic" : form.invoiceLanguage === "en" ? "English" : "Arabic and English"}
          </div>
          <div>
            <strong>Default Payment:</strong> {form.defaultPayment}
          </div>
          <div>
            <strong>Timezone:</strong> {form.timezone}
          </div>
          <div>
            <strong>Support:</strong> {form.supportContact}
          </div>
        </div>
      </div>

      {canSave && (
        <div className="pos-card p-4 md:p-5 border-destructive/40">
          <h3 className="font-semibold mb-2">{lang === "ar" ? "بدء التشغيل من جديد" : "Start fresh"}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {lang === "ar"
              ? "يحذف المبيعات والمشتريات والعملاء والموردين والمصروفات وكل المستخدمين ما عدا حسابك الحالي. تبقى المنتجات وإعدادات المتجر."
              : "Deletes sales, purchases, customers, suppliers, expenses, and every user except the account you are using. Products and store settings stay."}
          </p>
          <button className="pos-btn-secondary gap-1 text-destructive" onClick={() => setResetOpen(true)}>
            <Trash2 size={14} /> {lang === "ar" ? "مسح بيانات التجربة" : "Clear demo data"}
          </button>
        </div>
      )}

      {canSave && (
        <div className="pos-card p-4 md:p-5 border-destructive/40">
          <h3 className="font-semibold mb-2">{lang === "ar" ? "حذف كل البيانات" : "Delete all data"}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {lang === "ar"
              ? "يحذف المنتجات والمبيعات والمشتريات والعملاء والموردين والمستخدمين الآخرين. يبقى حسابك الحالي وإعدادات المتجر والرخصة."
              : "Deletes products, sales, purchases, customers, suppliers, and every other user. Your current account, store settings, and the license stay."}
          </p>
          <button className="pos-btn-secondary gap-1 text-destructive" onClick={() => setDeleteAllOpen(true)}>
            <Trash2 size={14} /> {lang === "ar" ? "حذف كل البيانات" : "Delete all data"}
          </button>
        </div>
      )}

      {deleteAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card w-full max-w-md rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-accent/30">
              <h3 className="font-bold">{lang === "ar" ? "تأكيد حذف كل البيانات" : "Confirm delete all data"}</h3>
              <button onClick={() => setDeleteAllOpen(false)} className="hover:opacity-70" disabled={deleteAll.isPending}>
                <X size={20} />
              </button>
            </div>
            <div className="p-5 text-sm text-muted-foreground space-y-2">
              <p>
                {lang === "ar"
                  ? "سيتم حذف بيانات المتجر نهائياً. لا يمكن التراجع عن هذا."
                  : "Store records will be deleted permanently. This cannot be undone."}
              </p>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button className="pos-btn-secondary" onClick={() => setDeleteAllOpen(false)} disabled={deleteAll.isPending}>
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                className="pos-btn-primary gap-1"
                disabled={deleteAll.isPending}
                onClick={() => deleteAll.mutate(undefined, { onSuccess: () => setDeleteAllOpen(false) })}
              >
                {deleteAll.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {lang === "ar" ? "نعم، احذف الكل" : "Yes, delete all data"}
              </button>
            </div>
          </div>
        </div>
      )}
      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card w-full max-w-md rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-accent/30">
              <h3 className="font-bold">{lang === "ar" ? "تأكيد المسح" : "Confirm reset"}</h3>
              <button onClick={() => setResetOpen(false)} className="hover:opacity-70" disabled={resetDemo.isPending}>
                <X size={20} />
              </button>
            </div>
            <div className="p-5 text-sm text-muted-foreground space-y-2">
              <p>
                {lang === "ar"
                  ? "سيتم حذف السجلات التجريبية نهائياً. لا يمكن التراجع عن هذا."
                  : "Demo records will be deleted permanently. This cannot be undone."}
              </p>
              <p>
                {lang === "ar"
                  ? "ستبقى المنتجات والتركيبات وإعدادات المتجر والرخصة وحسابك الحالي."
                  : "Products, formulations, store settings, the license, and your current account will be kept."}
              </p>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button className="pos-btn-secondary" onClick={() => setResetOpen(false)} disabled={resetDemo.isPending}>
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                className="pos-btn-primary gap-1"
                disabled={resetDemo.isPending}
                onClick={() => resetDemo.mutate(undefined, { onSuccess: () => setResetOpen(false) })}
              >
                {resetDemo.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {lang === "ar" ? "نعم، امسح البيانات" : "Yes, clear demo data"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Modal */}
      {diagResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card w-full max-w-md rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-accent/30">
              <h3 className="font-bold flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" />
                {lang === "ar" ? "نتائج التشخيص" : "System Diagnostics"}
              </h3>
              <button onClick={() => setDiagResult(null)} className="hover:opacity-70">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {diagResult.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  {item.status === "ok" ? (
                    <CheckCircle2 size={18} className="text-emerald-500 mt-0.5" />
                  ) : item.status === "warning" ? (
                    <AlertCircle size={18} className="text-amber-500 mt-0.5" />
                  ) : (
                    <X size={18} className="text-destructive mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button className="pos-btn-primary" onClick={() => setDiagResult(null)}>
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}