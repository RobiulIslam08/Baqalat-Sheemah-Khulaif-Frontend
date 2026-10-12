import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProducts, useUpdateProduct } from "@/hooks/useProducts";
import { useFormulations } from "@/hooks/useFormulations";
import { Search, Pencil, Check, X, Loader2 } from "lucide-react";

export default function ViewProductsPage() {
  const { t } = useLanguage();
  const [keyword, setKeyword] = useState("");
  const [searchBy, setSearchBy] = useState("Select");
  const PAGE_SIZE = 100;
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useState({ page: 1, limit: PAGE_SIZE });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const { data, isLoading, isFetching } = useProducts(searchParams);
  const { data: formulationData } = useFormulations();
  const updateProduct = useUpdateProduct();
  const products = data?.products || [];
  const meta = data?.meta || {};
  const totalRecords = Number(meta.total || meta.totalRecords || meta.count || meta.totalCount || meta.totalItems || 0);
  const totalPages = Math.max(1, Math.ceil((totalRecords || 0) / PAGE_SIZE));
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const formulations = formulationData?.formulations || [];

  const handleSearch = () => {
    if (!keyword.trim() || searchBy === "Select") { setSearchParams({ page: 1, limit: PAGE_SIZE }); setPage(1); return; }
    const p = { page: 1, limit: PAGE_SIZE };
    if (searchBy === "name") p.searchTerm = keyword;
    else if (searchBy === "code") p.productCode = keyword;
    setSearchParams(p);
    setPage(1);
  };

  const startEdit = useCallback((product) => {
    setEditingId(product._id);
    setEditForm({ productName: product.productName, formulation: product.formulation || "", arabicName: product.arabicName || "", vat: product.vat, mrp: product.mrp, purchasePrice: product.purchasePrice, sellingPrice: product.sellingPrice, quantity: product.quantity, minQty: product.minQty, storage: product.storage || "", batchCode: product.batchCode || "", expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split("T")[0] : "" });
  }, []);

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = () => {
    updateProduct.mutate({ id: editingId, data: { productName: editForm.productName, formulation: editForm.formulation || undefined, arabicName: editForm.arabicName || undefined, vat: Number(editForm.vat), mrp: Number(editForm.mrp), purchasePrice: Number(editForm.purchasePrice), sellingPrice: Number(editForm.sellingPrice), minQty: Number(editForm.minQty), storage: editForm.storage || undefined, batchCode: editForm.batchCode || undefined, expiryDate: editForm.expiryDate || undefined } }, { onSuccess: cancelEdit });
  };

  const ef = (key, val) => setEditForm((f) => ({ ...f, [key]: val }));

  const goToPage = (p) => {
    if (!p || p < 1 || p > totalPages) return;
    setPage(p);
    setSearchParams((prev) => ({ ...prev, page: p, limit: PAGE_SIZE }));
  };

  return (<div className="space-y-4">
    <h2 className="pos-page-title">{t("viewProducts.title")}</h2>
    <div className="pos-card p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
        <div><label className="pos-label">{t("viewProducts.keyword")}</label><input type="text" className="pos-input w-60" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
        <div><label className="pos-label">{t("viewProducts.searchBy")}</label><select className="pos-select w-40" value={searchBy} onChange={(e) => setSearchBy(e.target.value)}><option value="Select">Select</option><option value="name">{t("sales.productName")}</option><option value="code">{t("sales.code")}</option></select></div>
        <button className="pos-btn-primary gap-1" onClick={handleSearch} disabled={isFetching}>{isFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} {t("viewProducts.search")}</button>
      </div>
    </div>
    <div className="pos-card overflow-x-auto">
      <table className="pos-table min-w-[1400px]">
        <thead>
          <tr>
            <th>#</th>
            <th>{t("addProduct.productCode")}</th>
            <th>{t("sales.productName")}</th>
            <th>{t("viewProducts.formulation")}</th>
            <th>{t("addProduct.vat")}</th>
            <th>{t("viewProducts.arabicName")}</th>
            <th>{t("viewProducts.storage")}</th>
            <th>{t("sales.batchCode")}</th>
            <th>{t("sales.expiryDate")}</th>
            <th>{t("sales.quantity")}</th>
            <th>{t("viewProducts.minQty")}</th>
            <th>{t("viewProducts.mrp")}</th>
            <th>{t("viewProducts.purchasePrice")}</th>
            <th>{t("viewProducts.sellingPrice")}</th>
            <th>{t("viewProducts.edit")}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (<tr><td colSpan={14} className="text-center py-8"><Loader2 size={20} className="animate-spin inline-block" /></td></tr>)
          : products.length === 0 ? (<tr><td colSpan={14} className="text-center text-muted-foreground py-8">{t("viewProducts.search")}</td></tr>)
          : products.map((p, idx) => (<tr key={p._id}>
            <td>{startRecord + idx}</td>
            <td>{p.productCode}</td>
            <td>{editingId === p._id ? <input className="pos-input" value={editForm.productName} onChange={(e) => ef("productName", e.target.value)} /> : p.productName}</td>
            <td>
              {editingId === p._id ? (
                <select className="pos-select" value={editForm.formulation} onChange={(e) => ef("formulation", e.target.value)}>
                  <option value="">—</option>
                  {formulations.map((f) => <option key={f._id} value={f.formulationName}>{f.formulationName}</option>)}
                </select>
              ) : (
                p.formulation || "—"
              )}
            </td>
            <td>{editingId === p._id ? <select className="pos-select" value={editForm.vat} onChange={(e) => ef("vat", e.target.value)}><option value="0">0%</option><option value="5">5%</option><option value="15">15%</option></select> : `${p.vat}%`}</td>
            <td>{editingId === p._id ? <input className="pos-input" dir="rtl" value={editForm.arabicName} onChange={(e) => ef("arabicName", e.target.value)} /> : p.arabicName || "—"}</td>
            <td>{editingId === p._id ? <input className="pos-input" value={editForm.storage} onChange={(e) => ef("storage", e.target.value)} /> : p.storage || "—"}</td>
            <td>{editingId === p._id ? <input className="pos-input w-28" type="text" placeholder="Batch" value={editForm.batchCode} onChange={(e) => ef("batchCode", e.target.value)} /> : p.batchCode || "—"}</td>
            <td>{editingId === p._id ? <input className="pos-input w-32" type="date" value={editForm.expiryDate} onChange={(e) => ef("expiryDate", e.target.value)} /> : (p.expiryDate ? new Date(p.expiryDate).toISOString().split("T")[0] : "—")}</td>
            <td>{p.quantity}</td>
            <td>{editingId === p._id ? <input className="pos-input w-20" type="number" value={editForm.minQty} onChange={(e) => ef("minQty", e.target.value)} /> : p.minQty}</td>
            <td>{editingId === p._id ? <input className="pos-input w-24" type="number" value={editForm.mrp} onChange={(e) => ef("mrp", e.target.value)} /> : p.mrp}</td>
            <td>{editingId === p._id ? <input className="pos-input w-24" type="number" value={editForm.purchasePrice} onChange={(e) => ef("purchasePrice", e.target.value)} /> : p.purchasePrice}</td>
            <td>{editingId === p._id ? <input className="pos-input w-24" type="number" value={editForm.sellingPrice} onChange={(e) => ef("sellingPrice", e.target.value)} /> : p.sellingPrice}</td>
            <td>{editingId === p._id ? (<div className="flex gap-1"><button onClick={saveEdit} className="text-green-500 hover:opacity-70" disabled={updateProduct.isPending}>{updateProduct.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button><button onClick={cancelEdit} className="text-destructive hover:opacity-70"><X size={14} /></button></div>) : (<button onClick={() => startEdit(p)} className="text-primary hover:opacity-70"><Pencil size={14} /></button>)}</td>
          </tr>))}
        </tbody>
      </table>
      <div className="p-3 flex items-center justify-between print:hidden">
        <div className="text-sm text-muted-foreground">{totalRecords > 0 ? `Showing ${startRecord}-${Math.min(startRecord + products.length - 1, totalRecords)} of ${totalRecords}` : "No records"}</div>
        <div className="flex items-center gap-2">
          <button className="pos-btn-secondary" onClick={() => goToPage(1)} disabled={page === 1}>First</button>
          <button className="pos-btn-secondary" onClick={() => goToPage(page - 1)} disabled={page === 1}>Prev</button>
          {(() => {
            const maxButtons = 7;
            let start = Math.max(1, page - Math.floor(maxButtons / 2));
            let end = Math.min(totalPages, start + maxButtons - 1);
            if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
            const nums = [];
            for (let i = start; i <= end; i++) nums.push(i);
            return nums.map((n) => (
              <button key={n} className={"pos-btn-secondary" + (n === page ? " bg-primary text-white" : "")} onClick={() => goToPage(n)}>{n}</button>
            ));
          })()}
          <button className="pos-btn-secondary" onClick={() => goToPage(page + 1)} disabled={page === totalPages}>Next</button>
          <button className="pos-btn-secondary" onClick={() => goToPage(totalPages)} disabled={page === totalPages}>Last</button>
        </div>
      </div>
    </div>
  </div>);
}
