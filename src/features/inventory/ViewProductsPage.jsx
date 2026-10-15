import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProducts, useUpdateProduct } from "@/hooks/useProducts";
import { useFormulations } from "@/hooks/useFormulations";
import { Search, Pencil, X, Loader2 } from "lucide-react";

export default function ViewProductsPage() {
  const { t, lang } = useLanguage();
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
    setEditForm({
      productId: product.productId || "",
      productCode: product.productCode || "",
      productName: product.productName || "",
      arabicName: product.arabicName || "",
      vat: String(product.vat ?? "15"),
      mrp: product.mrp ?? "",
      purchasePrice: product.purchasePrice ?? "",
      sellingPrice: product.sellingPrice ?? "",
      quantity: product.quantity ?? "",
      packageVal: product.packageVal || "",
      productType: product.productType || "SINGLE",
      boxQty: product.boxQty ?? "1",
      minQty: product.minQty ?? "1",
      storage: product.storage || "",
      formulation: product.formulation || "",
      batchCode: product.batchCode || "",
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split("T")[0] : "",
    });
  }, []);

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = () => {
    if (!String(editForm.productCode || "").trim() || !String(editForm.productName || "").trim()) return;
    updateProduct.mutate({
      id: editingId,
      data: {
        productCode: editForm.productCode.trim(),
        productName: editForm.productName.trim(),
        arabicName: editForm.arabicName.trim() || undefined,
        vat: Number(editForm.vat) || 0,
        mrp: Number(editForm.mrp) || 0,
        purchasePrice: Number(editForm.purchasePrice) || 0,
        sellingPrice: Number(editForm.sellingPrice) || 0,
        quantity: Number(editForm.quantity) || 0,
        packageVal: editForm.packageVal.trim() || undefined,
        productType: editForm.productType || "SINGLE",
        boxQty: Number(editForm.boxQty) || 1,
        minQty: Number(editForm.minQty) || 0,
        storage: editForm.storage || undefined,
        formulation: editForm.formulation || undefined,
        batchCode: editForm.batchCode.trim() || undefined,
        expiryDate: editForm.expiryDate || undefined,
      },
    }, { onSuccess: cancelEdit });
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
            <td>{p.productName}</td>
            <td>{p.formulation || "—"}</td>
            <td>{`${p.vat}%`}</td>
            <td>{p.arabicName || "—"}</td>
            <td>{p.storage || "—"}</td>
            <td>{p.batchCode || "—"}</td>
            <td>{(p.expiryDate ? new Date(p.expiryDate).toISOString().split("T")[0] : "—")}</td>
            <td>{p.quantity}</td>
            <td>{p.minQty}</td>
            <td>{p.mrp}</td>
            <td>{p.purchasePrice}</td>
            <td>{p.sellingPrice}</td>
            <td><button onClick={() => startEdit(p)} className="text-primary hover:opacity-70" title={t("viewProducts.edit")}><Pencil size={14} /></button></td>
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

    {editingId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={cancelEdit}>
        <div className="bg-card w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 border-b flex justify-between items-center bg-primary text-primary-foreground">
            <h3 className="font-bold">{t("viewProducts.edit")}</h3>
            <button type="button" onClick={cancelEdit} className="hover:opacity-70"><X size={20} /></button>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-6">
            <section>
              <h3 className="pos-form-section-title">{t("addProduct.sectionIdentity")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="pos-label">{t("addProduct.productId")}</label>
                  <input className="pos-input bg-muted/40 cursor-not-allowed" value={editForm.productId || ""} readOnly />
                </div>
                <div>
                  <label className="pos-label">{t("addProduct.productCode")}</label>
                  <input className="pos-input" value={editForm.productCode || ""} onChange={(e) => ef("productCode", e.target.value)} />
                </div>
              </div>
            </section>
            <section>
              <h3 className="pos-form-section-title">{t("addProduct.sectionNames")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="pos-label">{t("addProduct.productName")}</label>
                  <input className="pos-input" value={editForm.productName || ""} onChange={(e) => ef("productName", e.target.value)} />
                </div>
                <div>
                  <label className="pos-label">{t("addProduct.arabicName")}</label>
                  <input className="pos-input" dir="rtl" value={editForm.arabicName || ""} onChange={(e) => ef("arabicName", e.target.value)} />
                </div>
              </div>
            </section>
            <section>
              <h3 className="pos-form-section-title">{t("addProduct.sectionPricing")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="pos-label">{t("addProduct.purchasePrice")}</label>
                  <input type="number" className="pos-input" value={editForm.purchasePrice ?? ""} onChange={(e) => ef("purchasePrice", e.target.value)} />
                </div>
                <div>
                  <label className="pos-label">{t("addProduct.sellingPrice")}</label>
                  <input type="number" className="pos-input" value={editForm.sellingPrice ?? ""} onChange={(e) => ef("sellingPrice", e.target.value)} />
                </div>
                <div>
                  <label className="pos-label">{t("addProduct.mrp")}</label>
                  <input type="number" className="pos-input" value={editForm.mrp ?? ""} onChange={(e) => ef("mrp", e.target.value)} />
                </div>
                <div>
                  <label className="pos-label">{t("addProduct.vat")}</label>
                  <select className="pos-select" value={editForm.vat ?? "15"} onChange={(e) => ef("vat", e.target.value)}>
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="15">15%</option>
                  </select>
                </div>
              </div>
            </section>
            <section>
              <h3 className="pos-form-section-title">{t("addProduct.sectionQuantity")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="pos-label">{t("addProduct.quantity")}</label>
                  <input type="number" className="pos-input" value={editForm.quantity ?? ""} onChange={(e) => ef("quantity", e.target.value)} />
                </div>
                <div>
                  <label className="pos-label">{t("addProduct.package")}</label>
                  <input className="pos-input" value={editForm.packageVal || ""} onChange={(e) => ef("packageVal", e.target.value)} />
                </div>
                <div>
                  <label className="pos-label">{t("addProduct.productType")}</label>
                  <select className="pos-select" value={editForm.productType || "SINGLE"} onChange={(e) => ef("productType", e.target.value)}>
                    <option value="SINGLE">{t("sales.single")}</option>
                    <option value="BOX">BOX</option>
                  </select>
                </div>
                <div>
                  <label className="pos-label">{t("addProduct.boxQty")}</label>
                  <input type="number" className="pos-input" value={editForm.boxQty ?? ""} onChange={(e) => ef("boxQty", e.target.value)} />
                </div>
                <div>
                  <label className="pos-label">{t("addProduct.minQty")}</label>
                  <input type="number" className="pos-input" value={editForm.minQty ?? ""} onChange={(e) => ef("minQty", e.target.value)} />
                </div>
              </div>
            </section>
            <section>
              <h3 className="pos-form-section-title">{t("addProduct.sectionBatch")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="pos-label">{t("sales.batchCode")}</label>
                  <input className="pos-input" value={editForm.batchCode || ""} onChange={(e) => ef("batchCode", e.target.value)} />
                </div>
                <div>
                  <label className="pos-label">{t("addProduct.expiryDate")}</label>
                  <input type="date" className="pos-input" value={editForm.expiryDate || ""} onChange={(e) => ef("expiryDate", e.target.value)} />
                </div>
              </div>
            </section>
            <section>
              <h3 className="pos-form-section-title">{t("addProduct.sectionClassification")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="pos-label">{t("addProduct.storage")}</label>
                  <select className="pos-select" value={editForm.storage || ""} onChange={(e) => ef("storage", e.target.value)}>
                    <option value="">—</option>
                    {editForm.storage && editForm.storage !== "Main Warehouse" && editForm.storage !== "Secondary Warehouse" && (
                      <option value={editForm.storage}>{editForm.storage}</option>
                    )}
                    <option value="Main Warehouse">Main Warehouse</option>
                    <option value="Secondary Warehouse">Secondary Warehouse</option>
                  </select>
                </div>
                <div>
                  <label className="pos-label">{t("addProduct.formulation")}</label>
                  <select className="pos-select" value={editForm.formulation || ""} onChange={(e) => ef("formulation", e.target.value)}>
                    <option value="">{t("addProduct.select")}</option>
                    {formulations.map((f) => <option key={f._id} value={f.formulationName}>{f.formulationName}</option>)}
                  </select>
                </div>
              </div>
            </section>
          </div>
          <div className="p-4 border-t flex justify-end gap-2">
            <button type="button" className="pos-btn-secondary" onClick={cancelEdit}>{lang === "ar" ? "إلغاء" : "Cancel"}</button>
            <button type="button" className="pos-btn-primary gap-1" onClick={saveEdit} disabled={updateProduct.isPending}>
              {updateProduct.isPending && <Loader2 size={14} className="animate-spin" />}
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>);
}
