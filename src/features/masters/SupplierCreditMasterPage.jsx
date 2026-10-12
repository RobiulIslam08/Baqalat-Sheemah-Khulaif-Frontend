import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useSupplierCredits, useRecordSupplierPayment, useSettleSupplierInvoice } from "@/hooks/useCredits";
import { Save, CheckCircle2, Loader2 } from "lucide-react";

export default function SupplierCreditMasterPage() {
  const { t, lang } = useLanguage();

  const { data: supData } = useSuppliers();
  const suppliers = supData?.suppliers || [];

  const recordPayment = useRecordSupplierPayment();
  const settleInvoice = useSettleSupplierInvoice();
  const { data: creditData, isLoading } = useSupplierCredits();
  const credits = creditData?.credits || [];

  const [form, setForm] = useState({ supplier: "", invoiceNo: "", dueAmount: "", paidAmount: "", paymentDate: "", paymentMethod: "Cash", reference: "", remarks: "" });
  const [errors, setErrors] = useState({});
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const next = {};
    if (!form.supplier.trim()) next.supplier = lang === "ar" ? "المورد مطلوب" : "Supplier is required";
    if (!form.invoiceNo.trim()) next.invoiceNo = lang === "ar" ? "رقم الفاتورة مطلوب" : "Invoice number is required";
    if (!form.dueAmount || Number(form.dueAmount) <= 0) next.dueAmount = lang === "ar" ? "المبلغ المستحق مطلوب" : "Due amount must be greater than 0";
    if (!form.paidAmount || Number(form.paidAmount) <= 0) next.paidAmount = lang === "ar" ? "المبلغ المدفوع مطلوب" : "Paid amount must be greater than 0";
    if (Number(form.paidAmount) > Number(form.dueAmount)) next.paidAmount = lang === "ar" ? "المدفوع لا يتجاوز المستحق" : "Paid cannot exceed due amount";
    if (!form.paymentDate) next.paymentDate = lang === "ar" ? "تاريخ الدفع مطلوب" : "Payment date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    recordPayment.mutate({
      supplier: form.supplier.trim(),
      invoiceNo: form.invoiceNo.trim(),
      dueAmount: Number(form.dueAmount),
      paidAmount: Number(form.paidAmount),
      paymentDate: form.paymentDate,
      paymentMethod: form.paymentMethod,
      reference: form.reference.trim() || undefined,
      remarks: form.remarks.trim() || undefined,
    }, {
      onSuccess: () => setForm({ supplier: "", invoiceNo: "", dueAmount: "", paidAmount: "", paymentDate: "", paymentMethod: "Cash", reference: "", remarks: "" }),
    });
  };

  const remaining = ((Number(form.dueAmount) || 0) - (Number(form.paidAmount) || 0)).toFixed(2);

  return (
    <div className="space-y-4">
      <h2 className="pos-page-title">{t("masters.supplierCreditMaster")}</h2>

      <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="pos-label">{lang === "ar" ? "المورد" : "Supplier"}</label>
          <select className="pos-select" value={form.supplier} onChange={(e) => update("supplier", e.target.value)}>
            <option value="">{lang === "ar" ? "اختر المورد" : "Select Supplier"}</option>
            {suppliers.map((s) => <option key={s._id} value={s._id}>{s.supplierName} ({s.supplierCode})</option>)}
          </select>
          {errors.supplier && <p className="text-xs text-destructive mt-1">{errors.supplier}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "رقم الفاتورة" : "Invoice No"}</label>
          <input className="pos-input" value={form.invoiceNo} onChange={(e) => update("invoiceNo", e.target.value)} />
          {errors.invoiceNo && <p className="text-xs text-destructive mt-1">{errors.invoiceNo}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "مبلغ الائتمان" : "Credit Amount (Due)"}</label>
          <input className="pos-input" type="number" value={form.dueAmount} onChange={(e) => update("dueAmount", e.target.value)} />
          {errors.dueAmount && <p className="text-xs text-destructive mt-1">{errors.dueAmount}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "المبلغ المسدد" : "Settled Amount (Paid)"}</label>
          <input className="pos-input" type="number" value={form.paidAmount} onChange={(e) => update("paidAmount", e.target.value)} />
          {errors.paidAmount && <p className="text-xs text-destructive mt-1">{errors.paidAmount}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "تاريخ الدفع" : "Payment Date"}</label>
          <input className="pos-input" type="date" value={form.paymentDate} onChange={(e) => update("paymentDate", e.target.value)} />
          {errors.paymentDate && <p className="text-xs text-destructive mt-1">{errors.paymentDate}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "طريقة الدفع" : "Payment Mode"}</label>
          <select className="pos-select" value={form.paymentMethod} onChange={(e) => update("paymentMethod", e.target.value)}>
            <option>Cash</option><option>Card</option><option>Bank Transfer</option>
          </select>
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "المرجع" : "Reference"}</label>
          <input className="pos-input" value={form.reference} onChange={(e) => update("reference", e.target.value)} />
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
        <button className="pos-btn-primary gap-1" onClick={handleSubmit} disabled={recordPayment.isPending}>
          {recordPayment.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {lang === "ar" ? "ترحيل السجل" : "Post Ledger"}
        </button>
      </div>

      {/* Credit Ledger Table */}
      <div className="pos-card overflow-x-auto">
        <table className="pos-table min-w-[800px]">
          <thead><tr><th>{lang === "ar" ? "المورد" : "Supplier"}</th><th>{lang === "ar" ? "الفاتورة" : "Invoice"}</th><th>{lang === "ar" ? "المستحق" : "Due"}</th><th>{lang === "ar" ? "المدفوع" : "Paid"}</th><th>{lang === "ar" ? "التاريخ" : "Date"}</th><th>{lang === "ar" ? "الحالة" : "Status"}</th><th>{lang === "ar" ? "إجراء" : "Action"}</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="text-center py-8"><Loader2 size={20} className="animate-spin inline-block" /></td></tr>
            : credits.length === 0 ? <tr><td colSpan={7} className="text-center text-muted-foreground py-6">{lang === "ar" ? "لا يوجد سجلات" : "No credit records yet"}</td></tr>
            : credits.map((c) => <tr key={c._id}>
              <td>{c.supplier?.supplierName || c.supplier}</td>
              <td>{c.invoiceNo}</td>
              <td>SR {c.dueAmount}</td>
              <td>SR {c.paidAmount}</td>
              <td>{new Date(c.paymentDate).toLocaleDateString()}</td>
              <td>{c.status || (c.dueAmount === c.paidAmount ? "Settled" : "Partial")}</td>
              <td>{c.status !== "Settled" && c.dueAmount !== c.paidAmount && <button className="text-xs text-primary hover:underline" onClick={() => settleInvoice.mutate(c._id)}><CheckCircle2 size={14} className="inline mr-1" />Settle</button>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}