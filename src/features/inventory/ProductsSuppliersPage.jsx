import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCreateProductSupplier, useProductSuppliers } from "@/hooks/useProductSuppliers";
import { Search, Link2, Loader2 } from "lucide-react";

export default function ProductsSuppliersPage() {
  const { t, lang } = useLanguage();

  const { data: prodData } = useProducts({ limit: 5000 });
  const allProducts = prodData?.products || [];

  const { data: supData } = useSuppliers();
  const suppliers = supData?.suppliers || [];

  const createLink = useCreateProductSupplier();

  const [keyword, setKeyword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const searchParams = searchTerm ? { searchTerm } : {};
  const { data: linksData, isLoading: linksLoading } = useProductSuppliers(searchParams);
  const links = linksData?.links || [];

  const [form, setForm] = useState({ productCode: "", productName: "", supplierName: "", purchasePrice: "", sellingPrice: "", notes: "" });
  const [errors, setErrors] = useState({});
  const update = (k, v) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === "productCode") {
        const found = allProducts.find((pr) => pr.productCode === v || pr.productId === v);
        if (found) { next.productName = found.productName; next.purchasePrice = String(found.purchasePrice || ""); next.sellingPrice = String(found.sellingPrice || ""); }
      }
      return next;
    });
  };

  const handleSearch = () => setSearchTerm(keyword.trim());

  const validate = () => {
    const next = {};
    if (!form.productCode.trim()) next.productCode = lang === "ar" ? "كود المنتج مطلوب" : "Product code is required";
    if (!form.productName.trim()) next.productName = lang === "ar" ? "اسم المنتج مطلوب" : "Product name is required";
    if (!form.supplierName.trim()) next.supplierName = lang === "ar" ? "اسم المورد مطلوب" : "Supplier name is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createLink.mutate({
      productCode: form.productCode.trim(),
      productName: form.productName.trim(),
      supplierName: form.supplierName.trim(),
      purchasePrice: Number(form.purchasePrice) || undefined,
      sellingPrice: Number(form.sellingPrice) || undefined,
      notes: form.notes.trim() || undefined,
    }, {
      onSuccess: () => setForm({ productCode: "", productName: "", supplierName: "", purchasePrice: "", sellingPrice: "", notes: "" }),
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="pos-page-title">{t("inv.productsSuppliers")}</h2>

      {/* Search */}
      <div className="pos-card p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="pos-input md:col-span-2" placeholder={lang === "ar" ? "بحث بكود أو اسم المنتج أو المورد" : "Search by product code, name, or supplier"} value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
          <button className="pos-btn-primary gap-1" onClick={handleSearch} disabled={linksLoading}>{linksLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} {lang === "ar" ? "بحث" : "Search"}</button>
        </div>
      </div>

      {/* Link Form */}
      <div className="pos-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input className="pos-input" placeholder={lang === "ar" ? "كود المنتج" : "Product Code"} value={form.productCode} onChange={(e) => update("productCode", e.target.value)} />
            {errors.productCode && <p className="text-xs text-destructive mt-1">{errors.productCode}</p>}
          </div>
          <div>
            <input className="pos-input" placeholder={lang === "ar" ? "اسم المنتج" : "Product Name"} value={form.productName} onChange={(e) => update("productName", e.target.value)} />
            {errors.productName && <p className="text-xs text-destructive mt-1">{errors.productName}</p>}
          </div>
          <div>
            <select className="pos-select" value={form.supplierName} onChange={(e) => update("supplierName", e.target.value)}>
              <option value="">{lang === "ar" ? "اختر المورد" : "Select Supplier"}</option>
              {suppliers.map((s) => <option key={s._id} value={s.supplierName}>{s.supplierName} ({s.supplierCode})</option>)}
            </select>
            {errors.supplierName && <p className="text-xs text-destructive mt-1">{errors.supplierName}</p>}
          </div>
          <input className="pos-input" type="number" placeholder={lang === "ar" ? "سعر الشراء" : "Purchase Price"} value={form.purchasePrice} onChange={(e) => update("purchasePrice", e.target.value)} />
          <input className="pos-input" type="number" placeholder={lang === "ar" ? "سعر البيع" : "Selling Price"} value={form.sellingPrice} onChange={(e) => update("sellingPrice", e.target.value)} />
          <input className="pos-input" placeholder={lang === "ar" ? "ملاحظات" : "Notes"} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </div>
        <div className="flex justify-center gap-3 mt-6">
          <button className="pos-btn-primary gap-1" onClick={handleSubmit} disabled={createLink.isPending}>
            {createLink.isPending ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} {lang === "ar" ? "ربط المورد" : "Link Supplier"}
          </button>
        </div>
      </div>

      {/* Linked Products-Suppliers Table */}
      <div className="pos-card overflow-x-auto">
        <table className="pos-table min-w-[700px]">
          <thead><tr><th>{lang === "ar" ? "كود المنتج" : "Product Code"}</th><th>{lang === "ar" ? "اسم المنتج" : "Product Name"}</th><th>{lang === "ar" ? "المورد" : "Supplier"}</th><th>{lang === "ar" ? "سعر الشراء" : "Purchase"}</th><th>{lang === "ar" ? "سعر البيع" : "Selling"}</th><th>{lang === "ar" ? "ملاحظات" : "Notes"}</th></tr></thead>
          <tbody>
            {linksLoading ? <tr><td colSpan={6} className="text-center py-8"><Loader2 size={20} className="animate-spin inline-block" /></td></tr>
            : links.length === 0 ? <tr><td colSpan={6} className="text-center text-muted-foreground py-6">{lang === "ar" ? "لا توجد روابط" : "No links found"}</td></tr>
            : links.map((l) => <tr key={l._id}><td>{l.productCode}</td><td>{l.productName}</td><td>{l.supplierName}</td><td>{l.purchasePrice || "—"}</td><td>{l.sellingPrice || "—"}</td><td>{l.notes || "—"}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}