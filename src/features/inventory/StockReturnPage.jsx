import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProcessStockReturn } from "@/hooks/useStock";
import { useProducts } from "@/hooks/useProducts";
import { Save, Search, Loader2 } from "lucide-react";

export default function StockReturnPage() {
  const { t, lang } = useLanguage();
  const processReturn = useProcessStockReturn();
  const { data: prodData } = useProducts({ limit: 5000 });
  const allProducts = prodData?.products || [];

  const [form, setForm] = useState({ invoiceNo: "", productCode: "", productName: "", returnQty: "", reason: "Expired", remarks: "" });
  const update = (k, v) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === "productCode") {
        const found = allProducts.find((pr) => pr.productCode === v || pr.productId === v);
        if (found) next.productName = found.productName;
      }
      return next;
    });
  };

  const handleSave = () => {
    processReturn.mutate({ invoiceNo: form.invoiceNo || undefined, productCode: form.productCode, productName: form.productName, returnQty: Number(form.returnQty), reason: form.reason, remarks: form.remarks || undefined },
      { onSuccess: () => setForm({ invoiceNo: "", productCode: "", productName: "", returnQty: "", reason: "Expired", remarks: "" }) });
  };

  return (<div className="space-y-4">
    <h2 className="pos-page-title">{t("inv.stockReturn")}</h2>
    <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <input className="pos-input" placeholder={lang === "ar" ? "رقم الفاتورة" : "Invoice No"} value={form.invoiceNo} onChange={(e) => update("invoiceNo", e.target.value)} />
      <input className="pos-input" placeholder={lang === "ar" ? "كود المنتج" : "Product Code"} value={form.productCode} onChange={(e) => update("productCode", e.target.value)} />
      <input className="pos-input" placeholder={lang === "ar" ? "اسم المنتج" : "Product Name"} value={form.productName} onChange={(e) => update("productName", e.target.value)} />
      <input className="pos-input" type="number" placeholder={lang === "ar" ? "كمية الإرجاع" : "Return Qty"} value={form.returnQty} onChange={(e) => update("returnQty", e.target.value)} />
      <select className="pos-select" value={form.reason} onChange={(e) => update("reason", e.target.value)}><option value="Expired">{lang === "ar" ? "منتهي الصلاحية" : "Expired"}</option><option value="Damaged">{lang === "ar" ? "تالف" : "Damaged"}</option></select>
      <input className="pos-input" placeholder={lang === "ar" ? "ملاحظات" : "Remarks"} value={form.remarks} onChange={(e) => update("remarks", e.target.value)} />
      <div className="md:col-span-2 flex justify-center"><button className="pos-btn-primary gap-1" onClick={handleSave} disabled={processReturn.isPending}>{processReturn.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {lang === "ar" ? "معالجة الإرجاع" : "Process Return"}</button></div>
    </div>
  </div>);
}