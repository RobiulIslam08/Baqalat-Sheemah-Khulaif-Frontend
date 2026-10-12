import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCreateSupplier } from "@/hooks/useSuppliers";
import { Save, Loader2 } from "lucide-react";

export default function AddSupplierPage() {
  const { t, lang } = useLanguage();
  const createSupplier = useCreateSupplier();
  const [form, setForm] = useState({ supplierCode: "", supplierName: "", contactPerson: "", phone: "", creditLimit: "", address: "" });
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const labels = { code: lang === "ar" ? "كود المورد" : "Supplier Code", name: lang === "ar" ? "اسم المورد" : "Supplier Name", contact: lang === "ar" ? "جهة الاتصال" : "Contact Person", phone: lang === "ar" ? "الهاتف" : "Phone", credit: lang === "ar" ? "حد الائتمان" : "Credit Limit", address: lang === "ar" ? "العنوان" : "Address", save: lang === "ar" ? "تسجيل مورد" : "Register Supplier" };

  const handleSave = () => {
    createSupplier.mutate({ supplierCode: form.supplierCode.trim(), supplierName: form.supplierName.trim(), contactPerson: form.contactPerson.trim() || undefined, phone: form.phone.trim() || undefined, creditLimit: Number(form.creditLimit) || 0, address: form.address.trim() || undefined },
      { onSuccess: () => setForm({ supplierCode: "", supplierName: "", contactPerson: "", phone: "", creditLimit: "", address: "" }) });
  };

  return (<div className="space-y-4">
    <h2 className="pos-page-title">{t("masters.addSupplier")}</h2>
    <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div><label className="pos-label">{labels.code}</label><input className="pos-input" value={form.supplierCode} onChange={(e) => update("supplierCode", e.target.value)} /></div>
      <div><label className="pos-label">{labels.name}</label><input className="pos-input" value={form.supplierName} onChange={(e) => update("supplierName", e.target.value)} /></div>
      <div><label className="pos-label">{labels.contact}</label><input className="pos-input" value={form.contactPerson} onChange={(e) => update("contactPerson", e.target.value)} /></div>
      <div><label className="pos-label">{labels.phone}</label><input className="pos-input" value={form.phone} onChange={(e) => update("phone", e.target.value)} /></div>
      <div><label className="pos-label">{labels.credit}</label><input className="pos-input" type="number" value={form.creditLimit} onChange={(e) => update("creditLimit", e.target.value)} /></div>
      <div><label className="pos-label">{labels.address}</label><input className="pos-input" value={form.address} onChange={(e) => update("address", e.target.value)} /></div>
    </div>
    <div className="flex justify-center"><button className="pos-btn-primary gap-1" onClick={handleSave} disabled={createSupplier.isPending}>{createSupplier.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {labels.save}</button></div>
  </div>);
}