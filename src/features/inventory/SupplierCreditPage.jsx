import { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSupplierCredits, useRecordSupplierPayment, useSettleSupplierInvoice } from "@/hooks/useCredits";
import { Save, Printer, CheckCircle2, Loader2 } from "lucide-react";

export default function SupplierCreditPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuthContext();
  const operatorRole = user?.role || "cashier";
  const canSettle = operatorRole !== "cashier";

  const [form, setForm] = useState({ supplier: "", invoiceNo: "", dueAmount: "", paidAmount: "", paymentDate: "", paymentMethod: "Cash", reference: "", remarks: "" });
  const [errors, setErrors] = useState({});

  const { data, isLoading } = useSupplierCredits();
  const recordPayment = useRecordSupplierPayment();
  const settleInvoice = useSettleSupplierInvoice();
  const payments = data?.credits || [];

  const remaining = useMemo(() => { return ((Number(form.dueAmount) || 0) - (Number(form.paidAmount) || 0)).toFixed(2); }, [form.dueAmount, form.paidAmount]);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const next = {};
    if (!form.supplier.trim()) next.supplier = lang === "ar" ? "اسم المورد مطلوب" : "Supplier is required";
    if (!form.invoiceNo.trim()) next.invoiceNo = lang === "ar" ? "رقم الفاتورة مطلوب" : "Invoice no is required";
    if (!form.paymentDate) next.paymentDate = lang === "ar" ? "تاريخ الدفع مطلوب" : "Payment date is required";
    const due = Number(form.dueAmount) || 0; const paid = Number(form.paidAmount) || 0;
    if (due <= 0) next.dueAmount = lang === "ar" ? "المبلغ المستحق غير صالح" : "Due amount must be greater than 0";
    if (paid <= 0) next.paidAmount = lang === "ar" ? "المبلغ المدفوع غير صالح" : "Paid amount must be greater than 0";
    if (paid > due) next.paidAmount = lang === "ar" ? "لا يمكن أن يكون المدفوع أكبر من المستحق" : "Paid amount cannot exceed due amount";
    setErrors(next); return Object.keys(next).length === 0;
  };

  const handleSettle = () => {
    const match = payments.find((p) => p.invoiceNo === form.invoiceNo.trim() && p.status !== "Settled" && Number(p.remaining) === 0);
    if (!match) {
      setErrors((prev) => ({ ...prev, invoiceNo: lang === "ar" ? "لا توجد فاتورة مدفوعة بالكامل للتسوية" : "No fully paid invoice is waiting to be settled" }));
      return;
    }
    settleInvoice.mutate(match._id);
  };

  const handleRecord = () => {
    if (!validate()) return;
    recordPayment.mutate({ supplier: form.supplier, invoiceNo: form.invoiceNo, dueAmount: Number(form.dueAmount), paidAmount: Number(form.paidAmount), paymentDate: form.paymentDate, paymentMethod: form.paymentMethod, reference: form.reference || undefined, remarks: form.remarks || undefined },
      { onSuccess: () => setForm({ supplier: "", invoiceNo: "", dueAmount: "", paidAmount: "", paymentDate: "", paymentMethod: "Cash", reference: "", remarks: "" }) });
  };

  return (<div className="space-y-4">
    <h2 className="pos-page-title">{t("inv.supplierCredit")}</h2>
    <div className="pos-card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
      <div><label className="pos-label">{lang === "ar" ? "الدور الحالي" : "Current Role"}</label><div className="pos-input bg-accent/30 cursor-default">{operatorRole}</div></div>
      <div className="md:col-span-2 text-xs text-muted-foreground rounded-md border border-border px-3 py-2 bg-accent/20">{canSettle ? (lang === "ar" ? "يمكنك تسوية رصيد المورد" : "You can settle supplier outstanding") : (lang === "ar" ? "يمكنك تسجيل الدفع فقط بانتظار اعتماد الإدارة" : "You can record payment only, pending management approval")}</div>
    </div>

    <div className="pos-card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
      <div><input className="pos-input" placeholder={lang === "ar" ? "المورد" : "Supplier"} value={form.supplier} onChange={(e) => update("supplier", e.target.value)} />{errors.supplier && <p className="text-xs text-destructive mt-1">{errors.supplier}</p>}</div>
      <div><input className="pos-input" placeholder="Invoice No" value={form.invoiceNo} onChange={(e) => update("invoiceNo", e.target.value)} />{errors.invoiceNo && <p className="text-xs text-destructive mt-1">{errors.invoiceNo}</p>}</div>
      <div><input className="pos-input" type="date" value={form.paymentDate} onChange={(e) => update("paymentDate", e.target.value)} />{errors.paymentDate && <p className="text-xs text-destructive mt-1">{errors.paymentDate}</p>}</div>
    </div>
    <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div><input className="pos-input" placeholder="Due Amount" type="number" value={form.dueAmount} onChange={(e) => update("dueAmount", e.target.value)} />{errors.dueAmount && <p className="text-xs text-destructive mt-1">{errors.dueAmount}</p>}</div>
      <div><input className="pos-input" placeholder="Paid Amount" type="number" value={form.paidAmount} onChange={(e) => update("paidAmount", e.target.value)} />{errors.paidAmount && <p className="text-xs text-destructive mt-1">{errors.paidAmount}</p>}</div>
      <select className="pos-select" value={form.paymentMethod} onChange={(e) => update("paymentMethod", e.target.value)}><option>Cash</option><option>Card</option><option>Bank Transfer</option></select>
      <input className="pos-input" placeholder={lang === "ar" ? "المرجع" : "Reference"} value={form.reference} onChange={(e) => update("reference", e.target.value)} />
      <input className="pos-input md:col-span-2" placeholder="Remarks" value={form.remarks} onChange={(e) => update("remarks", e.target.value)} />
      <div className="md:col-span-2 rounded-md border border-border bg-background/60 px-3 py-2 text-sm flex justify-between"><span>{lang === "ar" ? "المتبقي" : "Remaining"}</span><strong>SR {remaining}</strong></div>
      <div className="md:col-span-2 flex justify-center gap-3">
        <button className="pos-btn-primary gap-1" onClick={handleRecord} disabled={recordPayment.isPending}>{recordPayment.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {lang === "ar" ? "تسجيل الدفع" : "Record Payment"}</button>
        <button className="pos-btn-secondary gap-1" disabled={!canSettle || settleInvoice.isPending} onClick={handleSettle}><CheckCircle2 size={14} /> {lang === "ar" ? "تسوية الفاتورة" : "Settle Invoice"}</button>
        <button className="pos-btn-secondary gap-1" onClick={() => window.print()}><Printer size={14} /> {lang === "ar" ? "طباعة السند" : "Print Receipt"}</button>
      </div>
    </div>

    <div className="pos-card overflow-x-auto">
      <table className="pos-table min-w-[900px]">
        <thead><tr><th>Supplier</th><th>Invoice</th><th>Paid Amount</th><th>Date</th><th>Method</th><th>Status</th></tr></thead>
        <tbody>
          {isLoading ? <tr><td colSpan={6} className="text-center py-8"><Loader2 size={20} className="animate-spin inline-block" /></td></tr>
            : payments.length === 0 ? <tr><td colSpan={6} className="text-center text-muted-foreground">{lang === "ar" ? "لا يوجد دفعات مسجلة" : "No payments recorded"}</td></tr>
              : payments.map((p) => <tr key={p._id}><td>{p.supplier}</td><td>{p.invoiceNo}</td><td>SR {p.paidAmount}</td><td>{new Date(p.paymentDate).toLocaleDateString()}</td><td>{p.paymentMethod}</td><td>{p.status}</td></tr>)}
        </tbody>
      </table>
    </div>
  </div>);
}