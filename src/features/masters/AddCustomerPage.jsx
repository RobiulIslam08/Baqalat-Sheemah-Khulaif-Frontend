import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCreateCustomer } from "@/hooks/useCustomers";
import { Save, Loader2 } from "lucide-react";

export default function AddCustomerPage() {
  const { t, lang } = useLanguage();
  const createCustomer = useCreateCustomer();
  const [form, setForm] = useState({ customerCode: "", customerName: "", mobile: "", email: "", creditLimit: "", address: "" });
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const labels = { code: lang === "ar" ? "كود العميل" : "Customer Code", name: lang === "ar" ? "اسم العميل" : "Customer Name", mobile: lang === "ar" ? "الجوال" : "Mobile", email: lang === "ar" ? "البريد الإلكتروني" : "Email", credit: lang === "ar" ? "حد الائتمان" : "Credit Limit", address: lang === "ar" ? "العنوان" : "Address", save: lang === "ar" ? "تسجيل عميل" : "Register Customer" };

  const handleSave = () => {
    createCustomer.mutate({ customerCode: form.customerCode.trim(), customerName: form.customerName.trim(), mobile: form.mobile.trim() || undefined, email: form.email.trim() || undefined, creditLimit: Number(form.creditLimit) || 0, address: form.address.trim() || undefined },
      { onSuccess: () => setForm({ customerCode: "", customerName: "", mobile: "", email: "", creditLimit: "", address: "" }) });
  };

  return (<div className="space-y-4">
    <h2 className="pos-page-title">{t("masters.addCustomer")}</h2>
    <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div><label className="pos-label">{labels.code}</label><input className="pos-input" value={form.customerCode} onChange={(e) => update("customerCode", e.target.value)} /></div>
      <div><label className="pos-label">{labels.name}</label><input className="pos-input" value={form.customerName} onChange={(e) => update("customerName", e.target.value)} /></div>
      <div><label className="pos-label">{labels.mobile}</label><input className="pos-input" value={form.mobile} onChange={(e) => update("mobile", e.target.value)} /></div>
      <div><label className="pos-label">{labels.email}</label><input className="pos-input" value={form.email} onChange={(e) => update("email", e.target.value)} /></div>
      <div><label className="pos-label">{labels.credit}</label><input className="pos-input" type="number" value={form.creditLimit} onChange={(e) => update("creditLimit", e.target.value)} /></div>
      <div><label className="pos-label">{labels.address}</label><input className="pos-input" value={form.address} onChange={(e) => update("address", e.target.value)} /></div>
    </div>
    <div className="flex justify-center"><button className="pos-btn-primary gap-1" onClick={handleSave} disabled={createCustomer.isPending}>{createCustomer.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {labels.save}</button></div>
  </div>);
}