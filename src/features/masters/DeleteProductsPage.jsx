import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProducts, useDeleteProduct } from "@/hooks/useProducts";
import { productService } from "@/services/product.service";
import { Trash2, Search, Loader2 } from "lucide-react";

export default function DeleteProductsPage() {
  const { t, lang } = useLanguage();
  const deleteProduct = useDeleteProduct();
  const [code, setCode] = useState("");
  const [foundProduct, setFoundProduct] = useState(null);
  const [reason, setReason] = useState("Duplicate");
  const [remarks, setRemarks] = useState("");
  const [listSearch, setListSearch] = useState("");
  const PAGE_SIZE = 100;
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useState({ page: 1, limit: PAGE_SIZE });

  const { data: prodData, isLoading: isLoadingProducts } = useProducts(searchParams);
  const products = prodData?.products || [];
  const meta = prodData?.meta || {};
  const totalRecords = Number(meta.total || meta.totalRecords || meta.count || meta.totalCount || meta.totalItems || 0);
  const totalPages = Math.max(1, Math.ceil((totalRecords || 0) / PAGE_SIZE));
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const fetchByCode = async (val) => {
    const trimmed = val.trim();
    if (!trimmed) { setFoundProduct(null); return; }
    try {
      const res = await productService.getAll({ productCode: trimmed });
      const found = (res?.data || [])[0] || null;
      setFoundProduct(found);
    } catch (e) {
      setFoundProduct(null);
    }
  };

  const handleCodeChange = (val) => {
    setCode(val);
    if (!val.trim()) setFoundProduct(null);
  };

  const handleSearch = () => {
    fetchByCode(code);
  };

  const handleDelete = () => {
    if (!foundProduct) return;
    deleteProduct.mutate(foundProduct._id, { onSuccess: () => { setFoundProduct(null); setCode(""); setRemarks(""); } });
  };

  const filteredProducts = products.filter((p) => {
    const s = listSearch.toLowerCase();
    return (
      p.productCode?.toLowerCase().includes(s) ||
      p.productName?.toLowerCase().includes(s) ||
      p.arabicName?.toLowerCase().includes(s)
    );
  });

  return (<div className="space-y-4">
    <h2 className="pos-page-title">{t("masters.deleteProducts")}</h2>
    <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex gap-2"><input className="pos-input flex-1" placeholder={lang === "ar" ? "كود المنتج" : "Product Code"} value={code} onChange={(e) => handleCodeChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /><button className="pos-btn-primary gap-1" onClick={handleSearch}><Search size={14} /></button></div>
      <input className="pos-input" placeholder={lang === "ar" ? "اسم المنتج" : "Product Name"} value={foundProduct?.productName || ""} readOnly />
      <input className="pos-input" type="number" placeholder={lang === "ar" ? "الكمية الحالية" : "Current Qty"} value={foundProduct?.quantity ?? ""} readOnly />
      <select className="pos-select" value={reason} onChange={(e) => setReason(e.target.value)}><option value="Duplicate">{lang === "ar" ? "مكرر" : "Duplicate"}</option><option value="Discontinued">{lang === "ar" ? "متوقف" : "Discontinued"}</option><option value="Wrong Entry">{lang === "ar" ? "إدخال خاطئ" : "Wrong Entry"}</option></select>
      <input className="pos-input md:col-span-2" placeholder={lang === "ar" ? "ملاحظات" : "Remarks"} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
    </div>
    <div className="flex justify-center"><button className="pos-btn-primary gap-1" style={{ background: "hsl(var(--destructive))" }} onClick={handleDelete} disabled={!foundProduct || deleteProduct.isPending}>{deleteProduct.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {lang === "ar" ? "طلب حذف" : "Request Delete"}</button></div>

    {/* Product List Table */}
    <div className="pos-card p-4 md:p-6 space-y-4 mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-lg font-semibold text-foreground">
          {lang === "ar" ? "قائمة المنتجات" : "Product List"}
        </h3>
        <div className="relative w-full sm:w-72">
          <input
            className="pos-input w-full pl-8"
            placeholder={lang === "ar" ? "بحث في القائمة..." : "Search in list..."}
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
          />
          <span className="absolute left-2.5 top-0 bottom-0 flex items-center text-muted-foreground pointer-events-none">
            <Search size={14} />
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="pos-table min-w-[800px]">
          <thead>
            <tr>
              <th>#</th>
              <th>{lang === "ar" ? "كود المنتج" : "Product Code"}</th>
              <th>{lang === "ar" ? "اسم المنتج" : "Product Name"}</th>
              <th>{lang === "ar" ? "الكمية" : "Quantity"}</th>
              <th>{lang === "ar" ? "سعر البيع" : "Selling Price"}</th>
              <th className="text-center w-24">{lang === "ar" ? "إجراء" : "Action"}</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingProducts ? (
              <tr>
                <td colSpan={5} className="text-center py-8">
                  <Loader2 size={20} className="animate-spin inline-block text-primary" />
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground py-8">
                  {lang === "ar" ? "لم يتم العثور على منتجات" : "No products found"}
                </td>
              </tr>
              ) : (
              filteredProducts.map((p, idx) => {
                const isDeletingThis = deleteProduct.isPending && deleteProduct.variables === p._id;
                return (
                  <tr key={p._id} className="hover:bg-accent/30 transition-colors">
                    <td className="font-medium">{startRecord + idx}</td>
                    <td className="font-medium">{p.productCode}</td>
                    <td>
                      <div className="font-semibold text-foreground">{p.productName}</div>
                      {p.arabicName && <div className="text-xs text-muted-foreground mt-0.5" dir="rtl">{p.arabicName}</div>}
                    </td>
                    <td>{p.quantity}</td>
                    <td>{p.sellingPrice}</td>
                    <td className="text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(lang === "ar" ? `هل أنت متأكد من حذف ${p.productName}؟` : `Are you sure you want to delete ${p.productName}?`)) {
                            deleteProduct.mutate(p._id);
                          }
                        }}
                        disabled={deleteProduct.isPending}
                        className="text-destructive hover:opacity-70 p-1.5 rounded-full hover:bg-destructive/10 transition-colors disabled:opacity-50 inline-flex items-center justify-center"
                        title={lang === "ar" ? "حذف" : "Delete"}
                      >
                        {isDeletingThis ? (
                          <Loader2 size={16} className="animate-spin text-destructive" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="p-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{totalRecords > 0 ? `Showing ${startRecord}-${Math.min(startRecord + products.length - 1, totalRecords)} of ${totalRecords}` : "No records"}</div>
        <div className="flex items-center gap-2">
          <button className="pos-btn-secondary" onClick={() => { setPage(1); setSearchParams((p) => ({ ...p, page: 1, limit: PAGE_SIZE })); }} disabled={page === 1}>First</button>
          <button className="pos-btn-secondary" onClick={() => { const np = Math.max(1, page - 1); setPage(np); setSearchParams((p) => ({ ...p, page: np, limit: PAGE_SIZE })); }} disabled={page === 1}>Prev</button>
          {(() => {
            const maxButtons = 7;
            let start = Math.max(1, page - Math.floor(maxButtons / 2));
            let end = Math.min(totalPages, start + maxButtons - 1);
            if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
            const nums = [];
            for (let i = start; i <= end; i++) nums.push(i);
            return nums.map((n) => (
              <button key={n} className={"pos-btn-secondary" + (n === page ? " bg-primary text-white" : "")} onClick={() => { setPage(n); setSearchParams((p) => ({ ...p, page: n, limit: PAGE_SIZE })); }}>{n}</button>
            ));
          })()}
          <button className="pos-btn-secondary" onClick={() => { const np = Math.min(totalPages, page + 1); setPage(np); setSearchParams((p) => ({ ...p, page: np, limit: PAGE_SIZE })); }} disabled={page === totalPages}>Next</button>
          <button className="pos-btn-secondary" onClick={() => { setPage(totalPages); setSearchParams((p) => ({ ...p, page: totalPages, limit: PAGE_SIZE })); }} disabled={page === totalPages}>Last</button>
        </div>
      </div>
    </div>
  </div>);
}