import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProducts } from "@/hooks/useProducts";
import { useCreateSalesReturn, useSaleByBillNo } from "@/hooks/useSales";
import { Trash2, Plus, Loader2, Search, FileText, Package } from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Tab 1 — Product Code Return (original, unchanged logic)
   ────────────────────────────────────────────────────────────── */
function ProductCodeReturn({ t, lang, user }) {
  const { data: prodData } = useProducts({ limit: 5000 });
  const createReturn = useCreateSalesReturn();
  const allProducts = prodData?.products || [];

  const emptyRow = (id) => ({ id, code: "", productName: "", batchCode: "", expiryDate: "", type: "SINGLE", quantity: "", price: "", total: "" });
  const [rows, setRows] = useState([emptyRow(1)]);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [discount, setDiscount] = useState("");
  const [vatPercent, setVatPercent] = useState("15");
  const [amountPaid, setAmountPaid] = useState("");
  const [balance, setBalance] = useState("");
  const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
  const discountAmt = parseFloat(discount) || 0;
  const netAmount = totalAmount - discountAmt;
  const vatAmt = (netAmount / (100 + (parseFloat(vatPercent) || 0))) * (parseFloat(vatPercent) || 0);

  // Auto-calculate balance
  useEffect(() => {
    const amtPaid = parseFloat(amountPaid) || 0;
    const bal = amtPaid - netAmount;
    setBalance(bal.toFixed(2));
  }, [netAmount, amountPaid]);

  // Sync rows' product names when language changes
  useEffect(() => {
    if (!allProducts.length) return;
    setRows((prev) =>
      prev.map((row) => {
        if (!row.code) return row;
        const found = allProducts.find((p) => p.productCode === row.code || p.productId === row.code);
        if (found) {
          const translatedName = lang === "ar" ? (found.arabicName || found.productName) : found.productName;
          return { ...row, productName: translatedName };
        }
        return row;
      })
    );
  }, [lang, allProducts]);

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === "code") {
        const found = allProducts.find((p) => p.productCode === value || p.productId === value);
        if (found) {
          updated.productName = lang === "ar" ? (found.arabicName || found.productName) : found.productName;
          updated.price = String(found.sellingPrice || "");
          updated.batchCode = found.batchCode || "";
          updated.expiryDate = found.expiryDate ? new Date(found.expiryDate).toISOString().split("T")[0] : "";

          // Auto set quantity to 1 if it's empty
          if (!updated.quantity) {
            updated.quantity = "1";
          }
        } else {
          updated.batchCode = "";
          updated.expiryDate = "";
        }
      }
      const qty = parseFloat(updated.quantity) || 0;
      const price = parseFloat(updated.price) || 0;
      updated.total = (qty * price).toFixed(2);
      return updated;
    }));
  };

  const handleSave = () => {
    const validItems = rows.filter((r) => r.code && r.quantity && r.price);
    if (validItems.length === 0) return;
    createReturn.mutate({
      items: validItems.map((r) => {
        const lineTotal = Number(r.total) || 0;
        const rate = Number(vatPercent) || 0;
        return { code: r.code, productName: r.productName, batchCode: r.batchCode || undefined, expiryDate: r.expiryDate || undefined, type: r.type, quantity: Number(r.quantity), price: Number(r.price), vat: Number(((lineTotal / (100 + rate)) * rate).toFixed(2)), total: lineTotal };
      }),
      totalAmount, discount: discountAmt, vatPercent: Number(vatPercent), netAmount,
      amountPaid: Number(amountPaid) || 0, balance: Number(balance) || 0, paymentMode, createdBy: user?.username || "system",

    }, { onSuccess: () => { setRows([emptyRow(1)]); setAmountPaid(""); setBalance(""); setDiscount(""); } });
  };

  return (<>
    <div className="pos-summary-bar"><div className="pos-summary-cell pos-summary-cell-header">{t("sales.grandTotal")}</div><div className="pos-summary-cell pos-summary-cell-header">{t("sales.productName")}</div><div className="pos-summary-cell pos-summary-cell-header hidden md:block">{t("sales.productPrice")}</div><div className="pos-summary-cell pos-summary-cell-header hidden md:block">{t("sales.remainingQty")}</div></div>
    <div className="pos-summary-bar"><div className="pos-summary-cell pos-summary-cell-value">{t("common.sr")} {totalAmount.toFixed(2)}</div><div className="pos-summary-cell pos-summary-cell-value text-sm"></div><div className="pos-summary-cell pos-summary-cell-value text-sm hidden md:block"></div><div className="pos-summary-cell pos-summary-cell-value text-sm hidden md:block"></div></div>

    <div className="pos-card overflow-x-auto">
      <table className="pos-table min-w-[800px]">
        <thead><tr><th className="w-14">{t("sales.slNo")}</th><th className="w-36">{t("sales.code")}</th><th>{t("sales.productName")}</th><th>{t("sales.batchCode")}</th><th>{t("sales.expiryDate")}</th><th className="w-24">{t("sales.type")}</th><th className="w-20">{t("sales.quantity")}</th><th className="w-24">{t("sales.price")}</th><th className="w-24">{t("sales.total")}</th><th className="w-10"></th></tr></thead>
        <tbody>{rows.map((row) => (<tr key={row.id}><td>{row.id}</td><td><input type="text" className="pos-input" value={row.code} onChange={(e) => updateRow(row.id, "code", e.target.value)} /></td><td><input type="text" className="pos-input" value={row.productName} onChange={(e) => updateRow(row.id, "productName", e.target.value)} /></td><td><input type="text" className="pos-input" value={row.batchCode} onChange={(e) => updateRow(row.id, "batchCode", e.target.value)} /></td><td><input type="date" className="pos-input" value={row.expiryDate} onChange={(e) => updateRow(row.id, "expiryDate", e.target.value)} /></td><td><select className="pos-select" value={row.type} onChange={(e) => updateRow(row.id, "type", e.target.value)}><option value="SINGLE">{t("sales.single")}</option></select></td><td><input type="number" className="pos-input" value={row.quantity} onChange={(e) => updateRow(row.id, "quantity", e.target.value)} /></td><td><input type="number" className="pos-input" value={row.price} onChange={(e) => updateRow(row.id, "price", e.target.value)} /></td><td className="pos-amount text-sm">{row.total}</td><td><button onClick={() => rows.length > 1 && setRows((p) => p.filter((r) => r.id !== row.id))} className="text-destructive hover:opacity-70"><Trash2 size={14} /></button></td></tr>))}</tbody>
      </table>
      <div className="flex justify-between items-center p-3"><button onClick={() => setRows((p) => [...p, emptyRow(p.length + 1)])} className="pos-btn-secondary gap-1"><Plus size={14} /> {t("purchase.addRow")}</button><div><span className="font-semibold mr-3">{t("sales.totalAmount")}</span><span className="pos-amount text-xl">{t("common.sr")} {totalAmount.toFixed(2)}</span></div></div>
    </div>

    <div className="pos-card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div><label className="pos-label">{t("sales.paymentMode")}</label><select className="pos-select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}><option value="CASH">{t("sales.cash")}</option><option value="CREDIT CARD">{t("sales.creditCard")}</option></select></div>
        <div><label className="pos-label">{t("sales.discount")}</label><input type="number" className="pos-input" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
        <div><label className="pos-label">{t("sales.vatPercent")}</label><input type="number" className="pos-input" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} /></div>
        <div><label className="pos-label">{t("sales.netAmount")}</label><div className="text-sm font-semibold">{netAmount.toFixed(2)}</div></div>
        <div><label className="pos-label">{t("sales.amountPaid")}</label><input type="number" className="pos-input" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} /></div>
        <div><label className="pos-label">{t("sales.balance")}</label><input type="number" className="pos-input" value={balance} onChange={(e) => setBalance(e.target.value)} /></div>
      </div>
      <div className="flex justify-center gap-3 mt-6">
        <button onClick={() => window.print()} className="pos-btn-secondary">{t("sales.print")}</button>
        <button className="pos-btn-primary gap-1" onClick={handleSave} disabled={createReturn.isPending}>{createReturn.isPending && <Loader2 size={14} className="animate-spin" />} {t("sales.save")}</button>
      </div>
    </div>
  </>);
}

/* ──────────────────────────────────────────────────────────────
   Tab 2 — Invoice Return (new functionality)
   ────────────────────────────────────────────────────────────── */
function InvoiceReturn({ t, lang, user }) {
  const createReturn = useCreateSalesReturn();

  const [invoiceNo, setInvoiceNo] = useState("");
  const [searchBillNo, setSearchBillNo] = useState("");
  const { data: invoiceData, isLoading: invoiceLoading, isError, error } = useSaleByBillNo(searchBillNo);

  const [rows, setRows] = useState([]);
  const [invoiceLoaded, setInvoiceLoaded] = useState(false);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [discount, setDiscount] = useState("");
  const [vatPercent, setVatPercent] = useState("15");
  const [amountPaid, setAmountPaid] = useState("");
  const [balance, setBalance] = useState("");

  // When invoice data loads, populate rows
  useEffect(() => {
    if (invoiceData && invoiceData.items && invoiceData.items.length > 0) {
      const mapped = invoiceData.items.map((item, idx) => {
        const qty = Number(item.quantity) || 0;
        const lineTotal = Number(item.total) || 0;
        return {
          id: idx + 1,
          code: item.code || "",
          productName: item.productName || "",
          batchCode: item.batchCode || "",
          expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split("T")[0] : "",
          type: item.type || "SINGLE",
          quantity: String(qty),
          maxQty: qty,
          unitInclusive: qty ? lineTotal / qty : 0,
          price: String(item.price || ""),
          total: lineTotal.toFixed(2),
          vat: item.vat,
        };
      });
      setRows(mapped);
      setPaymentMode(invoiceData.paymentMode || "CASH");
      setDiscount(String(invoiceData.discount || ""));
      setVatPercent(String(invoiceData.vatPercent ?? "15"));
      setInvoiceLoaded(true);
    }
  }, [invoiceData]);

  const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
  const originalTotal = Number(invoiceData?.totalAmount) || 0;
  const discountAmt = originalTotal > 0 ? (Number(invoiceData?.discount) || 0) * (totalAmount / originalTotal) : (parseFloat(discount) || 0);
  const netAmount = totalAmount - discountAmt;
  const vatAmt = (netAmount / (100 + (parseFloat(vatPercent) || 0))) * (parseFloat(vatPercent) || 0);

  // Auto-calculate balance
  useEffect(() => {
    const amtPaid = parseFloat(amountPaid) || 0;
    const bal = amtPaid - netAmount;
    setBalance(bal.toFixed(2));
  }, [netAmount, amountPaid]);

  const handleSearch = () => {
    const trimmed = invoiceNo.trim();
    if (!trimmed) return;
    // Reset state before searching
    setRows([]);
    setInvoiceLoaded(false);
    setAmountPaid("");
    setBalance("");
    setDiscount("");
    setSearchBillNo(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      let qty = parseFloat(updated.quantity) || 0;
      if (updated.maxQty && qty > updated.maxQty) qty = updated.maxQty;
      updated.quantity = qty ? String(qty) : "";
      updated.total = ((updated.unitInclusive || 0) * qty).toFixed(2);
      return updated;
    }));
  };

  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleSave = () => {
    const validItems = rows.filter((r) => r.code && r.quantity && r.price);
    if (validItems.length === 0) return;
    createReturn.mutate({
      returnReference: Number(searchBillNo) || undefined,
      items: validItems.map((r) => ({
        code: r.code,
        productName: r.productName,
        batchCode: r.batchCode || undefined,
        expiryDate: r.expiryDate || undefined,
        type: r.type,
        quantity: Number(r.quantity),
        price: Number(r.price),
        vat: Number(r.vat) || 0,
        total: Number(r.total),
      })),
      totalAmount,
      discount: discountAmt,
      vatPercent: Number(vatPercent),
      netAmount,
      amountPaid: Number(amountPaid) || 0,
      balance: Number(balance) || 0,
      paymentMode,
      createdBy: user?.username || "system",
    }, {
      onSuccess: () => {
        setRows([]);
        setInvoiceNo("");
        setSearchBillNo("");
        setInvoiceLoaded(false);
        setAmountPaid("");
        setBalance("");
        setDiscount("");
      },
    });
  };

  return (<>
    {/* Invoice Search Bar */}
    <div className="pos-card p-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div className="flex-1">
          <label className="pos-label">{lang === "ar" ? "رقم الفاتورة" : "Invoice No"}</label>
          <input
            type="number"
            className="pos-input"
            placeholder={lang === "ar" ? "أدخل رقم الفاتورة..." : "Enter invoice number..."}
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          className="pos-btn-primary gap-1 h-[38px]"
          onClick={handleSearch}
          disabled={invoiceLoading || !invoiceNo.trim()}
        >
          {invoiceLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {lang === "ar" ? "بحث" : "Search"}
        </button>
      </div>

      {/* Error message */}
      {isError && searchBillNo && (
        <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error?.message || (lang === "ar" ? "لم يتم العثور على الفاتورة" : "Invoice not found")}
        </div>
      )}

      {/* Invoice info banner */}
      {invoiceLoaded && invoiceData && (
        <div className="mt-3 p-3 rounded-md bg-primary/10 border border-primary/30 text-sm flex flex-wrap gap-4">
          <span><strong>{lang === "ar" ? "رقم الفاتورة:" : "Bill No:"}</strong> {invoiceData.billNo}</span>
          <span><strong>{lang === "ar" ? "التاريخ:" : "Date:"}</strong> {invoiceData.createdAt ? new Date(invoiceData.createdAt).toLocaleDateString() : "—"}</span>
          <span><strong>{lang === "ar" ? "الدفع:" : "Payment:"}</strong> {invoiceData.paymentMode}</span>
          <span><strong>{lang === "ar" ? "إجمالي:" : "Total:"}</strong> {t("common.sr")} {invoiceData.netAmount?.toFixed(2)}</span>
          <span><strong>{lang === "ar" ? "بواسطة:" : "By:"}</strong> {invoiceData.createdBy}</span>
        </div>
      )}
    </div>

    {/* Invoice Items Table */}
    {invoiceLoaded && rows.length > 0 && (<>
      <div className="pos-summary-bar">
        <div className="pos-summary-cell pos-summary-cell-header">{t("sales.grandTotal")}</div>
        <div className="pos-summary-cell pos-summary-cell-header">{lang === "ar" ? "عدد المنتجات" : "Total Items"}</div>
        <div className="pos-summary-cell pos-summary-cell-header hidden md:block">{lang === "ar" ? "رقم الفاتورة" : "Invoice No"}</div>
        <div className="pos-summary-cell pos-summary-cell-header hidden md:block">{lang === "ar" ? "الحالة" : "Status"}</div>
      </div>
      <div className="pos-summary-bar">
        <div className="pos-summary-cell pos-summary-cell-value">{t("common.sr")} {totalAmount.toFixed(2)}</div>
        <div className="pos-summary-cell pos-summary-cell-value text-sm">{rows.length}</div>
        <div className="pos-summary-cell pos-summary-cell-value text-sm hidden md:block">{searchBillNo}</div>
        <div className="pos-summary-cell pos-summary-cell-value text-sm hidden md:block">{lang === "ar" ? "مرتجع" : "Return"}</div>
      </div>

      <div className="pos-card overflow-x-auto">
        <table className="pos-table min-w-[800px]">
          <thead>
            <tr>
              <th className="w-14">{t("sales.slNo")}</th>
              <th>{t("sales.productName")}</th>
              <th>{t("sales.batchCode")}</th>
              <th>{t("sales.expiryDate")}</th>
              <th className="w-24">{t("sales.type")}</th>
              <th className="w-20">{t("sales.quantity")}</th>
              <th className="w-24">{t("sales.price")}</th>
              <th className="w-24">{t("sales.total")}</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td><input type="text" className="pos-input" value={row.productName} readOnly /></td>
                <td><input type="text" className="pos-input" value={row.batchCode} readOnly /></td>
                <td><input type="date" className="pos-input" value={row.expiryDate} readOnly /></td>
                <td><input type="text" className="pos-input" value={row.type} readOnly /></td>
                <td><input type="number" className="pos-input" value={row.quantity} onChange={(e) => updateRow(row.id, "quantity", e.target.value)} min="0" /></td>
                <td><input type="number" className="pos-input" value={row.price} readOnly /></td>
                <td className="pos-amount text-sm">{row.total}</td>
                <td>
                  <button onClick={() => removeRow(row.id)} className="text-destructive hover:opacity-70">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end items-center p-3">
          <div>
            <span className="font-semibold mr-3">{t("sales.totalAmount")}</span>
            <span className="pos-amount text-xl">{t("common.sr")} {totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment section */}
      <div className="pos-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><label className="pos-label">{t("sales.paymentMode")}</label><select className="pos-select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}><option value="CASH">{t("sales.cash")}</option><option value="CREDIT CARD">{t("sales.creditCard")}</option></select></div>
          <div><label className="pos-label">{t("sales.discount")}</label><input type="number" className="pos-input" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
          <div><label className="pos-label">{t("sales.vatPercent")}</label><input type="number" className="pos-input" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} /></div>
          <div><label className="pos-label">{t("sales.netAmount")}</label><div className="text-sm font-semibold">{netAmount.toFixed(2)}</div></div>
          <div><label className="pos-label">{t("sales.amountPaid")}</label><input type="number" className="pos-input" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} /></div>
          <div><label className="pos-label">{t("sales.balance")}</label><input type="number" className="pos-input" value={balance} onChange={(e) => setBalance(e.target.value)} /></div>
        </div>
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={() => window.print()} className="pos-btn-secondary">{t("sales.print")}</button>
          <button className="pos-btn-primary gap-1" onClick={handleSave} disabled={createReturn.isPending}>
            {createReturn.isPending && <Loader2 size={14} className="animate-spin" />} {t("sales.save")}
          </button>
        </div>
      </div>
    </>)}

    {/* Empty state when no invoice loaded */}
    {!invoiceLoaded && !invoiceLoading && (
      <div className="pos-card p-8 text-center text-muted-foreground">
        <FileText size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">{lang === "ar" ? "أدخل رقم الفاتورة وابحث لعرض منتجات الفاتورة" : "Enter an invoice number and search to view invoice products"}</p>
      </div>
    )}
  </>);
}

/* ──────────────────────────────────────────────────────────────
   Main Page — Tab Container
   ────────────────────────────────────────────────────────────── */
export default function SalesReturnPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState("product");

  const tabs = [
    { key: "product", label: lang === "ar" ? "بكود المنتج" : "By Product Code", icon: Package },
    { key: "invoice", label: lang === "ar" ? "بالفاتورة" : "By Invoice", icon: FileText },
  ];

  return (
    <div className="space-y-4">
      <h2 className="pos-page-title">{t("salesReturn.title")}</h2>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-lg bg-accent/40 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "product" && <ProductCodeReturn t={t} lang={lang} user={user} />}
      {activeTab === "invoice" && <InvoiceReturn t={t} lang={lang} user={user} />}
    </div>
  );
}
