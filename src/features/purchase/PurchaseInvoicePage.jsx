import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import { useCreatePurchase } from "@/hooks/usePurchases";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function PurchaseInvoicePage() {
  const { t, lang } = useLanguage();
  const { user } = useAuthContext();
  const { data: supData } = useSuppliers();
  const { data: prodData } = useProducts({ limit: 5000 });
  const createPurchase = useCreatePurchase();
  const suppliers = supData?.suppliers || [];
  const allProducts = prodData?.products || [];

  const emptyRow = (id) => ({ id, barcode: "", itemName: "", batch: "", expiryDate: "", totalQty: "", free: "", sellingPrice: "", discountAmt: "", discountPercent: "", purchasePrice: "", netAmount: "" });
  const [rows, setRows] = useState(Array.from({ length: 5 }, (_, i) => emptyRow(i + 1)));
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [supplier, setSupplier] = useState("");
  const [purchaseOrderNo, setPurchaseOrderNo] = useState("");
  const [detailedSearch, setDetailedSearch] = useState(false);
  const [discountTotal, setDiscountTotal] = useState("0");
  const [vatTotal, setVatTotal] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("readyCash");

  const netAmount = rows.reduce((sum, r) => sum + (parseFloat(r.netAmount) || 0), 0);
  const totalAmount = netAmount - (parseFloat(discountTotal) || 0) + (parseFloat(vatTotal) || 0);

  // Sync rows' item names when language changes
  useEffect(() => {
    if (!allProducts.length) return;
    setRows((prev) =>
      prev.map((row) => {
        if (!row.barcode) return row;
        const found = allProducts.find((p) => p.productCode === row.barcode || p.productId === row.barcode);
        if (found) {
          const translatedName = lang === "ar" ? (found.arabicName || found.productName) : found.productName;
          return { ...row, itemName: translatedName };
        }
        return row;
      })
    );
  }, [lang, allProducts]);

  const updateRow = (id, field, value) => {
    setRows((prev) => {
      let productFound = false;
      const newRows = prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === "barcode") {
          const found = allProducts.find((p) => p.productCode === value || p.productId === value);
          if (found) { 
            productFound = true;
            updated.barcode = found.productCode;
            updated.itemName = lang === "ar" ? (found.arabicName || found.productName) : found.productName; 
            updated.sellingPrice = String(found.sellingPrice || ""); 
            updated.purchasePrice = String(found.purchasePrice || ""); 
            updated.expiryDate = found.expiryDate ? new Date(found.expiryDate).toISOString().split("T")[0] : "";
            
            // Auto set quantity to 1 if it's empty
            if (!updated.totalQty) {
              updated.totalQty = "1";
            }
          }
        }
        const qty = parseFloat(updated.totalQty) || 0;
        const price = parseFloat(updated.purchasePrice) || 0;
        const gross = qty * price;
        let disc = parseFloat(updated.discountAmt) || 0;
        if (!disc && parseFloat(updated.discountPercent)) {
          disc = gross * (parseFloat(updated.discountPercent) / 100);
          updated.discountAmt = disc ? disc.toFixed(2) : "";
        }
        if (disc > gross) disc = gross;
        updated.netAmount = (gross - disc).toFixed(2);
        return updated;
      });

      if (productFound && newRows[newRows.length - 1].id === id) {
        const nextId = newRows.length > 0 ? Math.max(...newRows.map(r => r.id)) + 1 : 1;
        newRows.push(emptyRow(nextId));
      }

      return newRows;
    });
  };

  const handleSave = () => {
    const validItems = rows.filter((r) => r.itemName && r.totalQty && r.purchasePrice);
    if (validItems.length === 0) return;
    createPurchase.mutate({
      invoiceNo, invoiceDate, supplier: supplier || undefined, purchaseOrderNo: purchaseOrderNo || undefined,
      items: validItems.map((r) => ({ barcode: r.barcode || undefined, itemName: r.itemName, batch: r.batch || undefined, expiryDate: r.expiryDate || undefined, totalQty: Number(r.totalQty), free: Number(r.free) || 0, sellingPrice: Number(r.sellingPrice) || 0, discountAmt: Number(r.discountAmt) || 0, discountPercent: Number(r.discountPercent) || 0, purchasePrice: Number(r.purchasePrice), netAmount: Number(r.netAmount) })),
      netAmount, discount: Number(discountTotal) || 0, vat: Number(vatTotal) || 0, totalAmount, paymentMethod, createdBy: user?.username || "system",
    }, { onSuccess: () => { setRows(Array.from({ length: 5 }, (_, i) => emptyRow(i + 1))); setInvoiceNo(""); setInvoiceDate(""); setSupplier(""); } });
  };

  return (<div className="space-y-4">
    <h2 className="pos-page-title">{t("purchase.title")}</h2>
    <div className="pos-card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div><label className="pos-label">{t("purchase.invoiceNo")}</label><input type="text" className="pos-input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></div>
        <div><label className="pos-label">{t("purchase.invoiceDate")}</label><input type="date" className="pos-input" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
        <div><label className="pos-label">{t("purchase.supplier")}</label><select className="pos-select" value={supplier} onChange={(e) => setSupplier(e.target.value)}><option value="">{t("purchase.selectSupplier")}</option>{suppliers.map((s) => <option key={s._id} value={s._id}>{s.supplierName} ({s.supplierCode})</option>)}</select></div>
        <div><label className="pos-label">{t("purchase.purchaseOrderNo")}</label><input type="text" className="pos-input" value={purchaseOrderNo} onChange={(e) => setPurchaseOrderNo(e.target.value)} /></div>
      </div>
      <div className="mt-3 flex items-center gap-2"><input type="checkbox" id="detailedSearch" checked={detailedSearch} onChange={(e) => setDetailedSearch(e.target.checked)} className="accent-primary" /><label htmlFor="detailedSearch" className="text-sm">{t("purchase.detailedSearch")}</label></div>
    </div>

    <div className="pos-card overflow-x-auto">
      <div className="flex justify-end p-3"><button onClick={() => setRows((p) => [...p, emptyRow(p.length > 0 ? Math.max(...p.map(r => r.id)) + 1 : 1)])} className="pos-btn-secondary gap-1"><Plus size={14} /> {t("purchase.addRow")}</button></div>
      <table className="pos-table min-w-[1100px]">
        <thead><tr><th className="w-14">{t("purchase.itemNo")}</th><th className="w-28">{t("purchase.itemBarcode")}</th><th>{t("purchase.itemName")}</th><th>{t("purchase.batch")}</th><th>{t("sales.expiryDate")}</th><th className="w-20">{t("purchase.totalQty")}</th><th className="w-16">{t("purchase.free")}</th><th>{t("purchase.sellingPrice")}</th><th>{t("purchase.discountAmt")}</th><th>{t("purchase.discountPercent")}</th><th>{t("purchase.purchasePrice")}</th><th>{t("purchase.netAmount")}</th><th className="w-10"></th></tr></thead>
        <tbody>{rows.map((row) => (<tr key={row.id}><td>{row.id}</td><td><input type="text" className="pos-input" value={row.barcode} onChange={(e) => updateRow(row.id, "barcode", e.target.value)} /></td><td><input type="text" className="pos-input" value={row.itemName} onChange={(e) => updateRow(row.id, "itemName", e.target.value)} /></td><td><input type="text" className="pos-input" value={row.batch} onChange={(e) => updateRow(row.id, "batch", e.target.value)} /></td><td><input type="date" className="pos-input" value={row.expiryDate} onChange={(e) => updateRow(row.id, "expiryDate", e.target.value)} /></td><td><input type="number" className="pos-input" value={row.totalQty} onChange={(e) => updateRow(row.id, "totalQty", e.target.value)} /></td><td><input type="number" className="pos-input" value={row.free} onChange={(e) => updateRow(row.id, "free", e.target.value)} /></td><td><input type="number" className="pos-input" value={row.sellingPrice} onChange={(e) => updateRow(row.id, "sellingPrice", e.target.value)} /></td><td><input type="number" className="pos-input" value={row.discountAmt} onChange={(e) => updateRow(row.id, "discountAmt", e.target.value)} /></td><td><input type="number" className="pos-input" value={row.discountPercent} onChange={(e) => updateRow(row.id, "discountPercent", e.target.value)} /></td><td><input type="number" className="pos-input" value={row.purchasePrice} onChange={(e) => updateRow(row.id, "purchasePrice", e.target.value)} /></td><td className="pos-amount text-sm">{row.netAmount}</td><td><button onClick={() => rows.length > 1 && setRows((p) => p.filter((r) => r.id !== row.id))} className="text-destructive hover:opacity-70"><Trash2 size={14} /></button></td></tr>))}</tbody>
      </table>
      <div className="p-4 space-y-2">
        <div className="flex justify-end items-center gap-4"><span className="font-semibold">{t("purchase.netAmount")}</span><span className="pos-amount text-lg">{netAmount.toFixed(2)}</span></div>
        <div className="flex justify-end items-center gap-4"><span className="font-semibold">{t("sales.discount")}</span><input type="number" className="pos-input w-32" value={discountTotal} onChange={(e) => setDiscountTotal(e.target.value)} /></div>
        <div className="flex justify-end items-center gap-4"><span className="font-semibold">{lang === "ar" ? "الضريبة" : "VAT"}</span><input type="number" className="pos-input w-32" value={vatTotal} onChange={(e) => setVatTotal(e.target.value)} /></div>
        <div className="flex justify-end items-center gap-4"><span className="font-semibold">{t("sales.totalAmount")}</span><span className="pos-amount text-xl">{totalAmount.toFixed(2)}</span></div>
        <div className="flex justify-end items-center gap-4"><span className="font-semibold">{t("purchase.paymentMethod")}</span><select className="pos-select w-40" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="readyCash">{t("purchase.readyCash")}</option><option value="creditCard">{t("sales.creditCard")}</option></select></div>
        <div className="flex justify-center mt-4"><button className="pos-btn-primary gap-1" onClick={handleSave} disabled={createPurchase.isPending}>{createPurchase.isPending && <Loader2 size={14} className="animate-spin" />} {t("sales.save")}</button></div>
      </div>
    </div>
  </div>);
}
