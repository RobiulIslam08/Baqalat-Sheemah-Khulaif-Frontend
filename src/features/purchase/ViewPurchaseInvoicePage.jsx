import { useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSettings } from "@/hooks/useSettings";
import { useSuppliers } from "@/hooks/useSuppliers";
import { usePurchases } from "@/hooks/usePurchases";
import { Search, Loader2 } from "lucide-react";
import { printReceipt } from "@/lib/printReceipt";

export default function ViewPurchaseInvoicePage() {
  const { t } = useLanguage();
  const { data: settings } = useSettings();
  const [searchType, setSearchType] = useState("date");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [purchaseOrderNo, setPurchaseOrderNo] = useState("");
  const [searchParams, setSearchParams] = useState({});

  const { data: supData } = useSuppliers();
  const { data, isLoading } = usePurchases(searchParams);
  const suppliers = supData?.suppliers || [];
  const purchases = data?.purchases || [];

  const [selectedPurchase, setSelectedPurchase] = useState(null);

  const handleSearch = () => {
    const p = {};
    if (searchType === "date") { if (fromDate) p.fromDate = fromDate; if (toDate) p.toDate = toDate; }
    else if (searchType === "invoice" && invoiceNo) p.invoiceNo = invoiceNo;
    else if (searchType === "supplier" && supplierName) p.supplier = supplierName;
    else if (searchType === "po" && purchaseOrderNo) p.purchaseOrderNo = purchaseOrderNo;
    setSearchParams(p);
  };

  return (<div className="space-y-4">
    <h2 className="pos-page-title">{t("viewPurchase.title")}</h2>
    <div className="pos-card p-4">
      <div className="space-y-3">
        <label className="flex items-center gap-2"><input type="radio" name="searchType" value="date" checked={searchType === "date"} onChange={() => setSearchType("date")} className="accent-primary" /><span className="text-sm">{t("viewPurchase.selectDate")}</span><input type="date" className="pos-input w-40 ml-2" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /><span className="text-sm">{t("viewPurchase.to")}</span><input type="date" className="pos-input w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
        <label className="flex items-center gap-2"><input type="radio" name="searchType" value="invoice" checked={searchType === "invoice"} onChange={() => setSearchType("invoice")} className="accent-primary" /><span className="text-sm">{t("viewPurchase.invoiceNo")}</span><input type="text" className="pos-input w-48 ml-2" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></label>
        <label className="flex items-center gap-2"><input type="radio" name="searchType" value="supplier" checked={searchType === "supplier"} onChange={() => setSearchType("supplier")} className="accent-primary" /><span className="text-sm">{t("viewPurchase.supplierName")}</span><select className="pos-select w-48 ml-2" value={supplierName} onChange={(e) => setSupplierName(e.target.value)}><option value="">{t("purchase.selectSupplier")}</option>{suppliers.map((s) => <option key={s._id} value={s._id}>{s.supplierName}</option>)}</select></label>
        <label className="flex items-center gap-2"><input type="radio" name="searchType" value="po" checked={searchType === "po"} onChange={() => setSearchType("po")} className="accent-primary" /><span className="text-sm">{t("viewPurchase.purchaseOrderNo")}</span><input type="text" className="pos-input w-48 ml-2" value={purchaseOrderNo} onChange={(e) => setPurchaseOrderNo(e.target.value)} /></label>
        <button className="pos-btn-primary gap-1 mt-2" onClick={handleSearch} disabled={isLoading}>{isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} {t("viewPurchase.search")}</button>
      </div>
    </div>
    <div className="pos-card overflow-x-auto">
      <table className="pos-table">
        <thead><tr><th className="w-14">{t("viewPurchase.no")}</th><th>{t("viewPurchase.invoiceNo")}</th><th>{t("purchase.invoiceDate")}</th><th>{t("purchase.supplier")}</th><th>{t("viewPurchase.purchaseOrderNo")}</th><th>{t("viewPurchase.totalAmount")}</th><th>{t("viewPurchase.viewEdit")}</th></tr></thead>
        <tbody>
          {isLoading ? <tr><td colSpan={7} className="text-center py-8"><Loader2 size={20} className="animate-spin inline-block" /></td></tr>
            : purchases.length === 0 ? <tr><td colSpan={7} className="text-center text-muted-foreground py-8">{t("viewPurchase.search")}</td></tr>
              : purchases.map((p, i) => <tr key={p._id}><td>{i + 1}</td><td>{p.invoiceNo}</td><td>{new Date(p.invoiceDate).toLocaleDateString()}</td><td>{p.supplier?.supplierName || "—"}</td><td>{p.purchaseOrderNo || "—"}</td><td>{p.totalAmount}</td><td><button onClick={() => setSelectedPurchase(p)} className="text-primary text-sm font-medium hover:underline">{t("report.view")}</button></td></tr>)}
        </tbody>
      </table>
    </div>

    {/* Detail Modal */}
    {selectedPurchase && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 purchase-modal-backdrop">
        <div id="purchase-invoice-printable" className="bg-card w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg shadow-xl flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-primary text-primary-foreground">
            <h3 className="font-bold">{t("viewPurchase.title")} - {selectedPurchase.invoiceNo}</h3>
            <button onClick={() => setSelectedPurchase(null)} className="text-2xl hover:opacity-70">&times;</button>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-muted-foreground">{t("purchase.invoiceNo")}</p><p className="font-semibold">{selectedPurchase.invoiceNo}</p></div>
              <div><p className="text-muted-foreground">{t("purchase.invoiceDate")}</p><p className="font-semibold">{new Date(selectedPurchase.invoiceDate).toLocaleDateString()}</p></div>
              <div><p className="text-muted-foreground">{t("purchase.supplier")}</p><p className="font-semibold">{selectedPurchase.supplier?.supplierName || "—"}</p></div>
              <div><p className="text-muted-foreground">{t("purchase.paymentMethod")}</p><p className="font-semibold uppercase">{selectedPurchase.paymentMethod}</p></div>
            </div>
            <table className="pos-table text-xs">
              <thead><tr><th>{t("purchase.itemName")}</th><th>{t("purchase.batch")}</th><th>{t("sales.expiryDate")}</th><th>{t("purchase.totalQty")}</th><th>{t("purchase.purchasePrice")}</th><th>{t("purchase.netAmount")}</th></tr></thead>
              <tbody>
                {selectedPurchase.items?.map((item, idx) => (
                  <tr key={idx}><td>{item.itemName}</td><td>{item.batch || "—"}</td><td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}</td><td>{item.totalQty}</td><td>{item.purchasePrice}</td><td>{item.netAmount}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col items-end gap-1 border-t pt-2">
              <div className="flex gap-10"><span>{t("purchase.netAmount")}</span><span className="font-bold">{selectedPurchase.netAmount}</span></div>
              <div className="flex gap-10"><span>{t("sales.discount")}</span><span className="font-bold">{selectedPurchase.discount}</span></div>
              <div className="flex gap-10 text-primary text-lg font-bold"><span>{t("sales.totalAmount")}</span><span>{selectedPurchase.totalAmount}</span></div>
            </div>
          </div>
          <div className="p-4 border-t flex justify-end gap-2">
            <button onClick={() => printReceipt()} className="pos-btn-secondary">{t("common.print")}</button>
            <button onClick={() => setSelectedPurchase(null)} className="pos-btn-primary">{t("common.reset")}</button>
          </div>
        </div>
      </div>
    )}

    {/* ── Hidden Print Div — SalesPage/SalesReportPage এর মতো একই receipt-* class ── */}
    {selectedPurchase && typeof document !== "undefined" && createPortal(
      <div id="purchase-print-receipt">
        <div className="receipt-header">
          {settings?.logo && <img src={settings.logo} alt="" className="receipt-logo" />}
          <h2 className="receipt-store-name">PURCHASE INVOICE</h2>
          <p className="receipt-subtext">فاتورة مشتريات</p>
        </div>

        <div className="receipt-divider-arrow">------------------------------------------</div>

        <div className="receipt-invoice-box">
          <div className="receipt-invoice-title">{"فاتورة مشتريات\n\u2066Purchase Invoice\u2069"}</div>
          <div className="receipt-invoice-row">
            <span>{"رقم الفاتورة :\n\u2066Invoice No :\u2069"}</span>
            <span style={{fontWeight:'bold'}}>{selectedPurchase.invoiceNo}</span>
          </div>
          <div className="receipt-invoice-row">
            <span>{"التاريخ :\n\u2066Date :\u2069"}</span>
            <span>{new Date(selectedPurchase.invoiceDate).toLocaleDateString("en-GB")}</span>
          </div>
          <div className="receipt-invoice-row">
            <span>{"المورد :\n\u2066Supplier :\u2069"}</span>
            <span style={{fontWeight:'bold'}}>{selectedPurchase.supplier?.supplierName || "—"}</span>
          </div>
          {selectedPurchase.purchaseOrderNo && (
            <div className="receipt-invoice-row">
              <span>{"رقم الطلب :\n\u2066PO No :\u2069"}</span>
              <span>{selectedPurchase.purchaseOrderNo}</span>
            </div>
          )}
          <div className="receipt-invoice-row">
            <span>{"الدفع :\n\u2066Payment :\u2069"}</span>
            <span style={{textTransform:'uppercase'}}>{selectedPurchase.paymentMethod}</span>
          </div>
        </div>

        <div className="receipt-divider">------------------------------------------</div>

        <table className="receipt-items-table">
          <thead>
            <tr>
              <th style={{textAlign:'left'}}>#</th>
              <th style={{textAlign:'right'}}>{"الصنف\n\u2066Item\u2069"}</th>
              <th style={{textAlign:'center'}}>Qty</th>
              <th style={{textAlign:'right'}}>Price</th>
              <th style={{textAlign:'right'}}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {selectedPurchase.items?.map((item, idx) => (
              <tr key={idx}>
                <td style={{textAlign:'left'}}>{idx + 1}</td>
                <td style={{textAlign:'left'}}>{item.itemName}{item.batch ? ` (${item.batch})` : ""}</td>
                <td style={{textAlign:'center'}}>{item.totalQty}</td>
                <td style={{textAlign:'right'}}>{Number(item.purchasePrice).toFixed(2)}</td>
                <td style={{textAlign:'right'}}>{Number(item.netAmount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-divider">------------------------------------------</div>

        <div className="receipt-summary-box">
          <div className="receipt-summary-row">
            <span>{"المبلغ الصافي\n\u2066Net Amount\u2069"}</span>
            <span>{Number(selectedPurchase.netAmount).toFixed(2)}</span>
          </div>
          <div className="receipt-summary-row">
            <span>{"الخصم\n\u2066Discount\u2069"}</span>
            <span>{Number(selectedPurchase.discount || 0).toFixed(2)}</span>
          </div>
          <div className="receipt-summary-row" style={{fontWeight:700, fontSize:'16px', borderTop:'1.5px solid #000', paddingTop:'4px', marginTop:'3px'}}>
            <span>{"الإجمالي\n\u2066TOTAL\u2069"}</span>
            <span>{Number(selectedPurchase.totalAmount).toFixed(2)}</span>
          </div>
          <div className="receipt-summary-row" style={{fontSize:'15px', fontWeight:700, marginTop:'3px'}}>
            <span>{"عدد الأصناف\n\u2066Total Items\u2069"}</span>
            <span>{selectedPurchase.items?.length || 0}</span>
          </div>
        </div>

        <div className="receipt-divider">------------------------------------------</div>

        <div style={{textAlign:'center', marginTop:'8px', fontSize:'15px', fontWeight:700, whiteSpace:'pre-line', letterSpacing:0, lineHeight:1.55}}>
          <div>{"استلم من قبل : _______________\n\u2066Received By\u2069"}</div>
          <div style={{marginTop:'16px', fontWeight:700, fontSize:'15px'}}>{"شكراً\n\u2066Thank you\u2069"}</div>
        </div>
      </div>,
      document.body
    )}

    {/* ── Print-only CSS ── */}
    <style>{`
      /* Screen: hide the print div */
      #purchase-print-receipt {
        display: none;
      }

      @media print {
        @page {
          size: auto;
          margin: 0mm;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          height: auto !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }
        #root {
          display: none !important;
        }
        #purchase-print-receipt,
        #purchase-print-receipt * {
          visibility: visible !important;
          opacity: 1 !important;
          color: #000 !important;
          font-family: "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif !important;
          letter-spacing: 0 !important;
          font-synthesis: none !important;
          -webkit-font-smoothing: auto !important;
          text-rendering: geometricPrecision !important;
        }
        #purchase-print-receipt {
          display: block !important;
          position: static !important;
          width: 70mm !important;
          max-width: 70mm !important;
          min-width: 70mm !important;
          padding: 1mm 2mm !important;
          margin: 0 !important;
          background: #fff !important;
          color: #000 !important;
          font-weight: 700 !important;
          font-size: 11.5px !important;
          line-height: 1.25 !important;
          box-sizing: border-box !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          overflow: hidden !important;
        }
      }
    `}</style>
  </div>);
}
