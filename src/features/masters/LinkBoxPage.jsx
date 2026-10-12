import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProducts } from "@/hooks/useProducts";
import { useCreateProductLink, useProductLinks } from "@/hooks/useProductLinks";
import { Link2, Loader2 } from "lucide-react";

export default function LinkBoxPage() {
  const { t, lang } = useLanguage();
  const { data: prodData } = useProducts({ limit: 5000 });
  const allProducts = prodData?.products || [];

  const createLink = useCreateProductLink();
  const { data: linksData, isLoading: linksLoading } = useProductLinks();
  const links = linksData?.links || [];

  const [form, setForm] = useState({ boxProductCode: "", singleProductCode: "", boxProductName: "", singleProductName: "", conversionQty: "", remark: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!allProducts.length) return;
    setForm((prev) => {
      const next = { ...prev };
      if (prev.boxProductCode) {
        const found = allProducts.find((pr) => pr.productCode === prev.boxProductCode || pr.productId === prev.boxProductCode);
        if (found) next.boxProductName = lang === "ar" ? (found.arabicName || found.productName) : found.productName;
      }
      if (prev.singleProductCode) {
        const found = allProducts.find((pr) => pr.productCode === prev.singleProductCode || pr.productId === prev.singleProductCode);
        if (found) next.singleProductName = lang === "ar" ? (found.arabicName || found.productName) : found.productName;
      }
      return next;
    });
  }, [lang, allProducts]);

  const update = (k, v) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === "boxProductCode") {
        const found = allProducts.find((pr) => pr.productCode === v || pr.productId === v);
        if (found) next.boxProductName = lang === "ar" ? (found.arabicName || found.productName) : found.productName;
      }
      if (k === "singleProductCode") {
        const found = allProducts.find((pr) => pr.productCode === v || pr.productId === v);
        if (found) next.singleProductName = lang === "ar" ? (found.arabicName || found.productName) : found.productName;
      }
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!form.boxProductCode.trim()) next.boxProductCode = lang === "ar" ? "كود منتج العبوة مطلوب" : "Box product code is required";
    if (!form.boxProductName.trim()) next.boxProductName = lang === "ar" ? "اسم منتج العبوة مطلوب" : "Box product name is required";
    if (!form.singleProductCode.trim()) next.singleProductCode = lang === "ar" ? "كود المنتج الفردي مطلوب" : "Single product code is required";
    if (!form.singleProductName.trim()) next.singleProductName = lang === "ar" ? "اسم المنتج الفردي مطلوب" : "Single product name is required";
    if (!form.conversionQty || Number(form.conversionQty) < 1) next.conversionQty = lang === "ar" ? "كمية التحويل مطلوبة (1 على الأقل)" : "Conversion qty must be at least 1";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createLink.mutate({
      boxProductCode: form.boxProductCode.trim(),
      boxProductName: form.boxProductName.trim(),
      singleProductCode: form.singleProductCode.trim(),
      singleProductName: form.singleProductName.trim(),
      conversionQty: Number(form.conversionQty),
      remark: form.remark.trim() || undefined,
    }, {
      onSuccess: () => setForm({ boxProductCode: "", singleProductCode: "", boxProductName: "", singleProductName: "", conversionQty: "", remark: "" }),
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="pos-page-title">{t("masters.linkBox")}</h2>
      <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="pos-label">{lang === "ar" ? "كود منتج العبوة" : "Box Product Code"}</label>
          <input className="pos-input" value={form.boxProductCode} onChange={(e) => update("boxProductCode", e.target.value)} />
          {errors.boxProductCode && <p className="text-xs text-destructive mt-1">{errors.boxProductCode}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "كود المنتج الفردي" : "Single Product Code"}</label>
          <input className="pos-input" value={form.singleProductCode} onChange={(e) => update("singleProductCode", e.target.value)} />
          {errors.singleProductCode && <p className="text-xs text-destructive mt-1">{errors.singleProductCode}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "اسم منتج العبوة" : "Box Product Name"}</label>
          <input className="pos-input" value={form.boxProductName} onChange={(e) => update("boxProductName", e.target.value)} />
          {errors.boxProductName && <p className="text-xs text-destructive mt-1">{errors.boxProductName}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "اسم المنتج الفردي" : "Single Product Name"}</label>
          <input className="pos-input" value={form.singleProductName} onChange={(e) => update("singleProductName", e.target.value)} />
          {errors.singleProductName && <p className="text-xs text-destructive mt-1">{errors.singleProductName}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "كمية التحويل" : "Conversion Qty"}</label>
          <input className="pos-input" type="number" value={form.conversionQty} onChange={(e) => update("conversionQty", e.target.value)} />
          {errors.conversionQty && <p className="text-xs text-destructive mt-1">{errors.conversionQty}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "ملاحظات" : "Remark"}</label>
          <input className="pos-input" value={form.remark} onChange={(e) => update("remark", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-center">
        <button className="pos-btn-primary gap-1" onClick={handleSubmit} disabled={createLink.isPending}>
          {createLink.isPending ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} {lang === "ar" ? "ربط المنتج" : "Link Product"}
        </button>
      </div>

      {/* Linked Products Table */}
      <div className="pos-card overflow-x-auto">
        <table className="pos-table min-w-[700px]">
          <thead><tr><th>{lang === "ar" ? "كود العبوة" : "Box Code"}</th><th>{lang === "ar" ? "اسم العبوة" : "Box Name"}</th><th>{lang === "ar" ? "كود الفردي" : "Single Code"}</th><th>{lang === "ar" ? "اسم الفردي" : "Single Name"}</th><th>{lang === "ar" ? "كمية التحويل" : "Conv. Qty"}</th><th>{lang === "ar" ? "ملاحظات" : "Remark"}</th></tr></thead>
          <tbody>
            {linksLoading ? <tr><td colSpan={6} className="text-center py-8"><Loader2 size={20} className="animate-spin inline-block" /></td></tr>
            : links.length === 0 ? <tr><td colSpan={6} className="text-center text-muted-foreground py-6">{lang === "ar" ? "لا توجد روابط بعد" : "No links yet"}</td></tr>
            : links.map((l) => <tr key={l._id}><td>{l.boxProductCode}</td><td>{l.boxProductName}</td><td>{l.singleProductCode}</td><td>{l.singleProductName}</td><td>{l.conversionQty}</td><td>{l.remark || "—"}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}