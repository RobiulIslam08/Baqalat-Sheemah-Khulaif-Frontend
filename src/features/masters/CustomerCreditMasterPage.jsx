import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCustomers } from "@/hooks/useCustomers";
import { useCustomerCredits, useReceiveCustomerPayment } from "@/hooks/useCredits";
import { Save, Loader2 } from "lucide-react";

export default function CustomerCreditMasterPage() {
  const { t, lang } = useLanguage();

  const { data: custData } = useCustomers();
  const customers = custData?.customers || [];

  const receivePayment = useReceiveCustomerPayment();
  const { data: creditData, isLoading } = useCustomerCredits();
  const credits = creditData?.credits || [];

  const [form, setForm] = useState({ customer: "", billNo: "", dueAmount: "", receivedAmount: "", paymentDate: "", remarks: "" });
  const [errors, setErrors] = useState({});
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const next = {};
    if (!form.customer.trim()) next.customer = lang === "ar" ? "العميل مطلوب" : "Customer is required";
    if (!form.billNo.trim()) next.billNo = lang === "ar" ? "رقم الفاتورة مطلوب" : "Bill number is required";
    if (!form.dueAmount || Number(form.dueAmount) <= 0) next.dueAmount = lang === "ar" ? "المبلغ المستحق مطلوب" : "Due amount must be greater than 0";
    if (!form.receivedAmount || Number(form.receivedAmount) <= 0) next.receivedAmount = lang === "ar" ? "المبلغ المستلم مطلوب" : "Received amount must be greater than 0";
    if (Number(form.receivedAmount) > Number(form.dueAmount)) next.receivedAmount = lang === "ar" ? "المستلم لا يتجاوز المستحق" : "Received cannot exceed due amount";
    if (!form.paymentDate) next.paymentDate = lang === "ar" ? "تاريخ الدفع مطلوب" : "Payment date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    receivePayment.mutate({
      customer: form.customer.trim(),
      billNo: form.billNo.trim(),
      dueAmount: Number(form.dueAmount),
      receivedAmount: Number(form.receivedAmount),
      paymentDate: form.paymentDate,
      remarks: form.remarks.trim() || undefined,
    }, {
      onSuccess: () => setForm({ customer: "", billNo: "", dueAmount: "", receivedAmount: "", paymentDate: "", remarks: "" }),
    });
  };

  const remaining = ((Number(form.dueAmount) || 0) - (Number(form.receivedAmount) || 0)).toFixed(2);

  return (
    <div className="space-y-4">
      <h2 className="pos-page-title">{t("masters.customerCreditMaster")}</h2>

      <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="pos-label">{lang === "ar" ? "العميل" : "Customer"}</label>
          <select className="pos-select" value={form.customer} onChange={(e) => update("customer", e.target.value)}>
            <option value="">{lang === "ar" ? "اختر العميل" : "Select Customer"}</option>
            {customers.map((c) => <option key={c._id} value={c._id}>{c.customerName} ({c.customerCode})</option>)}
          </select>
          {errors.customer && <p className="text-xs text-destructive mt-1">{errors.customer}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "رقم الفاتورة" : "Bill No"}</label>
          <input className="pos-input" value={form.billNo} onChange={(e) => update("billNo", e.target.value)} />
          {errors.billNo && <p className="text-xs text-destructive mt-1">{errors.billNo}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "مبلغ الائتمان" : "Credit Amount (Due)"}</label>
          <input className="pos-input" type="number" value={form.dueAmount} onChange={(e) => update("dueAmount", e.target.value)} />
          {errors.dueAmount && <p className="text-xs text-destructive mt-1">{errors.dueAmount}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "المبلغ المستلم" : "Received Amount"}</label>
          <input className="pos-input" type="number" value={form.receivedAmount} onChange={(e) => update("receivedAmount", e.target.value)} />
          {errors.receivedAmount && <p className="text-xs text-destructive mt-1">{errors.receivedAmount}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "تاريخ الدفع" : "Payment Date"}</label>
          <input className="pos-input" type="date" value={form.paymentDate} onChange={(e) => update("paymentDate", e.target.value)} />
          {errors.paymentDate && <p className="text-xs text-destructive mt-1">{errors.paymentDate}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "ملاحظات" : "Remarks"}</label>
          <input className="pos-input" value={form.remarks} onChange={(e) => update("remarks", e.target.value)} />
        </div>
        <div className="md:col-span-2 rounded-md border border-border bg-background/60 px-3 py-2 text-sm flex justify-between">
          <span>{lang === "ar" ? "المتبقي" : "Remaining"}</span>
          <strong>SR {remaining}</strong>
        </div>
      </div>

      <div className="flex justify-center">
        <button className="pos-btn-primary gap-1" onClick={handleSubmit} disabled={receivePayment.isPending}>
          {receivePayment.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {lang === "ar" ? "ترحيل السجل" : "Post Ledger"}
        </button>
      </div>

      {/* Credit Ledger Table */}
      <div className="pos-card overflow-x-auto">
        <table className="pos-table min-w-[700px]">
          <thead><tr><th>{lang === "ar" ? "العميل" : "Customer"}</th><th>{lang === "ar" ? "الفاتورة" : "Bill"}</th><th>{lang === "ar" ? "المستحق" : "Due"}</th><th>{lang === "ar" ? "المستلم" : "Received"}</th><th>{lang === "ar" ? "التاريخ" : "Date"}</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="text-center py-8"><Loader2 size={20} className="animate-spin inline-block" /></td></tr>
            : credits.length === 0 ? <tr><td colSpan={5} className="text-center text-muted-foreground py-6">{lang === "ar" ? "لا يوجد سجلات" : "No credit records yet"}</td></tr>
            : credits.map((c) => <tr key={c._id}>
              <td>{c.customer?.customerName || c.customer}</td>
              <td>{c.billNo}</td>
              <td>SR {c.dueAmount}</td>
              <td>SR {c.receivedAmount}</td>
              <td>{new Date(c.paymentDate).toLocaleDateString()}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}