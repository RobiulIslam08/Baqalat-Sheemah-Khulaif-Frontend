import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCustomers } from "@/hooks/useCustomers";
import { useReceiveCustomerPayment, useCustomerCredits } from "@/hooks/useCredits";
import { Save, Loader2 } from "lucide-react";

export default function CustomerCreditPage() {
  const { t, lang } = useLanguage();
  const { data: custData } = useCustomers();
  const { data: creditData, isLoading } = useCustomerCredits();
  const receivePayment = useReceiveCustomerPayment();
  const customers = custData?.customers || [];
  const credits = creditData?.credits || [];

  const [form, setForm] = useState({ customer: "", billNo: "", dueAmount: "", receivedAmount: "", paymentDate: "", remarks: "" });
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    const due = Number(form.dueAmount) || 0;
    const received = Number(form.receivedAmount) || 0;
    if (received > due) return;
    receivePayment.mutate({ customer: form.customer, billNo: form.billNo, dueAmount: due, receivedAmount: received, paymentDate: form.paymentDate, remarks: form.remarks || undefined },
      { onSuccess: () => setForm({ customer: "", billNo: "", dueAmount: "", receivedAmount: "", paymentDate: "", remarks: "" }) });
  };

  return (<div className="space-y-4">
    <h2 className="pos-page-title">{t("inv.customerCredit")}</h2>
    <div className="pos-card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
      <select className="pos-select" value={form.customer} onChange={(e) => update("customer", e.target.value)}><option value="">{lang === "ar" ? "العميل" : "Customer"}</option>{customers.map((c) => <option key={c._id} value={c._id}>{c.customerName}</option>)}</select>
      <input className="pos-input" placeholder={lang === "ar" ? "رقم الفاتورة" : "Bill No"} value={form.billNo} onChange={(e) => update("billNo", e.target.value)} />
      <input className="pos-input" type="date" value={form.paymentDate} onChange={(e) => update("paymentDate", e.target.value)} />
    </div>
    <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <input className="pos-input" type="number" placeholder={lang === "ar" ? "المبلغ المستحق" : "Due Amount"} value={form.dueAmount} onChange={(e) => update("dueAmount", e.target.value)} />
      <input className="pos-input" type="number" placeholder={lang === "ar" ? "المبلغ المستلم" : "Received Amount"} value={form.receivedAmount} onChange={(e) => update("receivedAmount", e.target.value)} />
      <input className="pos-input md:col-span-2" placeholder={lang === "ar" ? "ملاحظات" : "Remarks"} value={form.remarks} onChange={(e) => update("remarks", e.target.value)} />
      <div className="md:col-span-2 flex justify-center"><button className="pos-btn-primary gap-1" onClick={handleSave} disabled={receivePayment.isPending}>{receivePayment.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {lang === "ar" ? "استلام دفعة" : "Receive Payment"}</button></div>
    </div>
    {credits.length > 0 && <div className="pos-card overflow-x-auto"><table className="pos-table"><thead><tr><th>Customer</th><th>Bill</th><th>Amount</th><th>Date</th></tr></thead><tbody>{credits.map((c) => <tr key={c._id}><td>{c.customer}</td><td>{c.billNo}</td><td>SR {c.receivedAmount}</td><td>{new Date(c.paymentDate).toLocaleDateString()}</td></tr>)}</tbody></table></div>}
  </div>);
}