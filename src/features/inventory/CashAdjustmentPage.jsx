import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCreateCashAdjustment, useCashAdjustments } from "@/hooks/useCashAdjustments";
import { Save, Loader2 } from "lucide-react";

export default function CashAdjustmentPage() {
  const { t, lang } = useLanguage();
  const createAdj = useCreateCashAdjustment();
  const { data, isLoading } = useCashAdjustments();
  const adjustments = data?.adjustments || [];

  const [form, setForm] = useState({ adjustmentNo: "", type: "In", amount: "", account: "", date: "", remarks: "" });
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    createAdj.mutate({ adjustmentNo: form.adjustmentNo, type: form.type, amount: Number(form.amount), account: form.account || undefined, date: form.date, remarks: form.remarks || undefined },
      { onSuccess: () => setForm({ adjustmentNo: "", type: "In", amount: "", account: "", date: "", remarks: "" }) });
  };

  return (<div className="space-y-4">
    <h2 className="pos-page-title">{t("inv.cashAdjustment")}</h2>
    <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <input className="pos-input" placeholder={lang === "ar" ? "رقم التعديل" : "Adjustment No"} value={form.adjustmentNo} onChange={(e) => update("adjustmentNo", e.target.value)} />
      <select className="pos-select" value={form.type} onChange={(e) => update("type", e.target.value)}><option value="In">{lang === "ar" ? "داخل" : "In"}</option><option value="Out">{lang === "ar" ? "خارج" : "Out"}</option></select>
      <input className="pos-input" type="number" placeholder={lang === "ar" ? "المبلغ" : "Amount"} value={form.amount} onChange={(e) => update("amount", e.target.value)} />
      <input className="pos-input" placeholder={lang === "ar" ? "الحساب" : "Account"} value={form.account} onChange={(e) => update("account", e.target.value)} />
      <input className="pos-input" type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
      <input className="pos-input" placeholder={lang === "ar" ? "ملاحظات" : "Remarks"} value={form.remarks} onChange={(e) => update("remarks", e.target.value)} />
      <div className="md:col-span-2 flex justify-center"><button className="pos-btn-primary gap-1" onClick={handleSave} disabled={createAdj.isPending}>{createAdj.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {lang === "ar" ? "ترحيل التعديل" : "Post Adjustment"}</button></div>
    </div>
    {adjustments.length > 0 && <div className="pos-card overflow-x-auto"><table className="pos-table"><thead><tr><th>No</th><th>Type</th><th>Amount</th><th>Date</th><th>Remarks</th></tr></thead><tbody>{adjustments.map((a) => <tr key={a._id}><td>{a.adjustmentNo}</td><td>{a.type}</td><td>SR {a.amount}</td><td>{new Date(a.date).toLocaleDateString()}</td><td>{a.remarks || "—"}</td></tr>)}</tbody></table></div>}
  </div>);
}