import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSales, useSaleByBillNo } from "@/hooks/useSales";
import { useProducts } from "@/hooks/useProducts";
import { useUsers } from "@/hooks/useUsers";
import { useSettings } from "@/hooks/useSettings";
import { Search, Eye, Printer, Loader2, X, ReceiptText, RotateCcw, AlertCircle } from "lucide-react";
import QRCode from "qrcode";
import { invoiceLanguageOf, receiptDir, receiptItemName, receiptPayment, receiptQrLabel, receiptSaleType, receiptText, receiptVatLabel } from "./receiptLanguage";

const TAB_SALES = "SALE";
const TAB_RETURNS = "RETURN";

export default function SalesReportPage() {
  const { t, lang } = useLanguage();
  const { data: settings } = useSettings();
  const { data: prodData } = useProducts({ limit: 5000 });
  const allProducts = prodData?.products || [];

  // Tabs
  const [activeTab, setActiveTab] = useState(TAB_SALES);

  // Filters
  const [user, setUser] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination: 100 per page
  const PAGE_SIZE = 100;
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useState({ type: TAB_SALES, page: 1, limit: PAGE_SIZE });

  // Bill detail viewer
  const [viewBillNo, setViewBillNo] = useState(null);
  const [qrBase64, setQrBase64] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  // Data
  const { data, isLoading, isError, error } = useSales(searchParams);
  const { data: userData } = useUsers();
  const users = userData?.users || [];

  const { data: saleDetail, isLoading: detailLoading } = useSaleByBillNo(viewBillNo);
  const records = data?.sales || [];
  const meta = data?.meta || {};

  const totalRecords = Number(
    meta.total || meta.totalRecords || meta.count || meta.totalCount || meta.totalItems || 0
  );
  const totalPages = Math.max(1, Math.ceil((totalRecords || 0) / PAGE_SIZE));
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endRecord = startRecord + records.length - 1;

  // ZATCA Base64 TLV QR Code Generator
  const generateZatcaTlv = (sellerName, vatNumber, timestamp, totalAmount, vatAmount) => {
    const encoder = new TextEncoder();

    const getTlv = (tag, value) => {
      const valueBytes = encoder.encode(String(value));
      const tagByte = tag;
      const lengthByte = valueBytes.length;
      const tlv = new Uint8Array(2 + lengthByte);
      tlv[0] = tagByte;
      tlv[1] = lengthByte;
      tlv.set(valueBytes, 2);
      return tlv;
    };

    const formattedTotal = Number(totalAmount).toFixed(2);
    const formattedVat = Number(vatAmount).toFixed(2);

    let formattedTime = timestamp;
    try {
      formattedTime = new Date(timestamp).toISOString();
    } catch (e) {
      formattedTime = new Date().toISOString();
    }

    const tag1 = getTlv(1, sellerName);
    const tag2 = getTlv(2, vatNumber);
    const tag3 = getTlv(3, formattedTime);
    const tag4 = getTlv(4, formattedTotal);
    const tag5 = getTlv(5, formattedVat);

    const totalLength = tag1.length + tag2.length + tag3.length + tag4.length + tag5.length;
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    [tag1, tag2, tag3, tag4, tag5].forEach((tag) => {
      combined.set(tag, offset);
      offset += tag.length;
    });

    let binary = "";
    for (let i = 0; i < combined.byteLength; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  };

  // Generate QR base64 whenever saleDetail is fetched/loaded
  useEffect(() => {
    if (!saleDetail) {
      setQrBase64("");
      return;
    }

    const generateQr = async () => {
      try {
        const storeName = settings?.storeName;
        const vatNo = settings?.vatNumber;
        const vatRate = Number(saleDetail.vatPercent || 15);
        const saleVatAmt = (Number(saleDetail.netAmount) / (100 + vatRate)) * vatRate;

        const qrTlv = generateZatcaTlv(storeName, vatNo, saleDetail.createdAt, saleDetail.netAmount, saleVatAmt);
        const qrCodeUrl = await QRCode.toDataURL(qrTlv, { width: 140, margin: 1 });
        setQrBase64(qrCodeUrl);
      } catch (err) {
        console.error("ZATCA QR Generation Failed", err);
      }
    };

    generateQr();
  }, [saleDetail, settings]);

  // Elegant print trigger that fires when printing is requested, details are loaded, and QR is ready
  useEffect(() => {
    if (isPrinting && saleDetail && qrBase64) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 400); // small delay to ensure full render
      return () => clearTimeout(timer);
    }
  }, [isPrinting, saleDetail, qrBase64]);

  const handleSearch = () => {
    const params = { type: activeTab, page: 1, limit: PAGE_SIZE };
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (user) params.createdBy = user;
    setSearchParams(params);
    setPage(1);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setViewBillNo(null);
    setIsPrinting(false);
    const params = { type: tab, page: 1, limit: PAGE_SIZE };
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (user) params.createdBy = user;
    setSearchParams(params);
    setPage(1);
  };

  const goToPage = (p) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setPage(next);
    const params = { type: activeTab, page: next, limit: PAGE_SIZE };
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (user) params.createdBy = user;
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrint = (billNo) => {
    setViewBillNo(billNo);
    setIsPrinting(true);
  };

  const isSaleTab = activeTab === TAB_SALES;
  const invoiceMode = invoiceLanguageOf(settings);
  const nameAlign = invoiceMode === "en" ? "text-left" : "text-right";
  const amountAlign = invoiceMode === "en" ? "text-right" : "text-left";

  return (
    <div className="space-y-4">
      <h2 className="pos-page-title">{t("report.salesReport")}</h2>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        <button
          id="tab-sales"
          onClick={() => switchTab(TAB_SALES)}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${isSaleTab
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
        >
          <ReceiptText size={15} />
          {lang === "ar" ? "المبيعات" : "Sales"}
        </button>
        <button
          id="tab-returns"
          onClick={() => switchTab(TAB_RETURNS)}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${!isSaleTab
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
        >
          <RotateCcw size={15} />
          {lang === "ar" ? "مرتجعات المبيعات" : "Sales Returns"}
        </button>
      </div>

      {/* Filters */}
      <div className="pos-card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 flex-wrap">
          <div>
            <label className="pos-label">{t("report.selectUser")}</label>
            <select
              className="pos-select w-40"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            >
              <option value="">{lang === "ar" ? "الكل" : "All Users"}</option>
              {users.map((u) => (
                <option key={u._id} value={u.userId}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="pos-label">{t("report.from")}</label>
            <input
              type="date"
              className="pos-input w-40"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="pos-label">{t("report.to")}</label>
            <input
              type="date"
              className="pos-input w-40"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button
            id="btn-search-report"
            className="pos-btn-primary gap-1"
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {t("report.submit")}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="pos-card overflow-x-auto">
        {/* Tab badge */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isSaleTab
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
              }`}
          >
            {isSaleTab
              ? lang === "ar" ? "مبيعات" : "SALES"
              : lang === "ar" ? "مرتجعات" : "RETURNS"}
          </span>
          <span className="text-xs text-muted-foreground">
            {totalRecords} {lang === "ar" ? "سجل" : "record(s)"}
          </span>
        </div>

        <table className="pos-table">
          <thead>
            <tr>
              <th className="w-14">{t("sales.slNo")}</th>
              <th>{t("report.billNo")}</th>
              <th>{t("report.billDate")}</th>
              <th>{lang === "ar" ? "العميل" : "Customer"}</th>
              <th>{t("report.amount")}</th>
              <th>{t("report.paymentMode")}</th>
              <th>{lang === "ar" ? "بواسطة" : "Created By"}</th>
              <th className="w-16">{t("report.view")}</th>
              <th className="w-16">{t("report.print")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-8">
                  <Loader2 size={20} className="animate-spin inline-block" />
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-destructive bg-destructive/5">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle size={24} />
                    <p className="font-semibold">{lang === "ar" ? "فشل تحميل البيانات" : "Failed to load data"}</p>
                    <p className="text-xs opacity-70">{error?.message || "Unknown error"}</p>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted-foreground py-8">
                  {isSaleTab
                    ? lang === "ar" ? "لا توجد مبيعات" : "No sales found"
                    : lang === "ar" ? "لا توجد مرتجعات" : "No returns found"}
                </td>
              </tr>
            ) : (

              records.map((rec, i) => (
                <tr key={rec._id || i}>
                  <td>{startRecord + i}</td>
                  <td className="font-medium">{rec.billNo}</td>
                  <td>{new Date(rec.createdAt).toLocaleString()}</td>
                  <td>{rec.customer?.customerName || rec.customer || "—"}</td>
                  <td className="pos-amount">{rec.netAmount}</td>
                  <td>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${rec.paymentMode === "CASH" || rec.paymentMode === "Cash"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}>
                      {rec.paymentMode}
                    </span>
                  </td>
                  <td className="text-xs text-muted-foreground">{rec.createdBy || "—"}</td>
                  <td>
                    <button
                      id={`btn-view-${rec.billNo}`}
                      className="text-primary hover:opacity-70"
                      onClick={() => setViewBillNo(rec.billNo)}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                  <td>
                    <button
                      className="text-muted-foreground hover:opacity-70"
                      onClick={() => handlePrint(rec.billNo)}
                    >
                      <Printer size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Totals footer */}
        {records.length > 0 && (
          <div className="px-4 py-3 border-t border-border flex justify-end gap-6 text-sm">
            <span className="text-muted-foreground font-bold text-2xl">
              {lang === "ar" ? "الإجمالي:" : "Total:"}
            </span>
            <span className="font-bold text-primary text-2xl">
              SR {Number(meta.netTotal ?? records.reduce((s, r) => s + (parseFloat(r.netAmount) || 0), 0)).toFixed(2)}
            </span>
          </div>
        )}

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-4 text-sm">
          <div className="text-xs text-muted-foreground">
            {totalRecords === 0 ? (
              lang === "ar" ? "لا سجلات" : "No records"
            ) : (
              <>
                {lang === "ar" ? "عرض" : "Showing"} {startRecord}-{endRecord} {lang === "ar" ? "من" : "of"} {totalRecords}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button className="pos-btn-secondary" onClick={() => goToPage(1)} disabled={page === 1}>
              {lang === "ar" ? "الأولى" : "First"}
            </button>
            <button className="pos-btn-secondary" onClick={() => goToPage(page - 1)} disabled={page === 1}>
              {lang === "ar" ? "السابق" : "Prev"}
            </button>

            {/* Numbered page buttons (windowed, max 7) */}
            <div className="flex items-center gap-1">
              {(() => {
                const maxButtons = 7;
                let start = 1;
                let end = totalPages;
                if (totalPages > maxButtons) {
                  start = Math.max(1, page - Math.floor(maxButtons / 2));
                  end = start + maxButtons - 1;
                  if (end > totalPages) {
                    end = totalPages;
                    start = end - maxButtons + 1;
                  }
                }

                const nodes = [];
                for (let p = start; p <= end; p++) {
                  nodes.push(
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      className={`pos-btn-secondary ${p === page ? "pos-btn-primary" : ""}`}
                      disabled={p === page}
                    >
                      {p}
                    </button>
                  );
                }
                return nodes;
              })()}
            </div>

            <button className="pos-btn-secondary" onClick={() => goToPage(page + 1)} disabled={page === totalPages}>
              {lang === "ar" ? "التالي" : "Next"}
            </button>
            <button className="pos-btn-secondary" onClick={() => goToPage(totalPages)} disabled={page === totalPages}>
              {lang === "ar" ? "الأخيرة" : "Last"}
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {viewBillNo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 print:hidden" id="report-detail-backdrop">
          <div className="bg-card w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg shadow-xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-primary text-primary-foreground">
              <h3 className="font-bold">
                {isSaleTab
                  ? lang === "ar" ? "تفاصيل الفاتورة" : "Invoice Details"
                  : lang === "ar" ? "تفاصيل المرتجع" : "Return Details"}
                {" "}— #{viewBillNo}
              </h3>
              <button
                id="btn-close-detail"
                onClick={() => setViewBillNo(null)}
                className="hover:opacity-70"
              >
                <X size={20} />
              </button>
            </div>
          {/* Body */}
            <div className="p-4 overflow-y-auto flex-1">
              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : saleDetail ? (
                <div className="space-y-4">
                  {/* Meta info */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm bg-accent/10 p-3 rounded-md">
                    <div>
                      <p className="text-muted-foreground text-xs">{lang === "ar" ? "رقم الفاتورة" : "Bill No"}</p>
                      <p className="font-bold text-primary">#{saleDetail.billNo}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{lang === "ar" ? "التاريخ والوقت" : "Date & Time"}</p>
                      <p className="font-semibold">{new Date(saleDetail.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{lang === "ar" ? "العميل" : "Customer"}</p>
                      <p className="font-semibold">{saleDetail.customer?.customerName || saleDetail.customer || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{lang === "ar" ? "طريقة الدفع" : "Payment Mode"}</p>
                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium ${saleDetail.paymentMode === "CASH" || saleDetail.paymentMode === "Cash"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>
                        {saleDetail.paymentMode}
                      </span>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{lang === "ar" ? "بواسطة" : "Created By"}</p>
                      <p className="font-semibold">{saleDetail.createdBy || "—"}</p>
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="overflow-x-auto border rounded-md">
                    <table className="pos-table text-xs min-w-[750px]">
                      <thead>
                        <tr>
                          <th className="w-10">#</th>
                          <th>{lang === "ar" ? "رمز المنتج" : "Code"}</th>
                          <th>{lang === "ar" ? "اسم المنتج" : "Product"}</th>
                          <th>{lang === "ar" ? "اسم المنتج" : "Product"}</th>
                          <th>{lang === "ar" ? "رقم التشغيلة" : "Batch Code"}</th>
                          <th>{lang === "ar" ? "تاريخ الانتهاء" : "Expiry"}</th>
                          <th>{lang === "ar" ? "النوع" : "Type"}</th>
                          <th>{lang === "ar" ? "الكمية" : "Qty"}</th>
                          <th>{lang === "ar" ? "السعر" : "Price"}</th>
                          <th>{lang === "ar" ? "الضريبة" : "VAT"}</th>
                          <th>{lang === "ar" ? "الإجمالي" : "Total"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(saleDetail.items || []).map((item, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td className="font-mono text-xs">{item.code}</td>
                            <td className="font-medium">{item.productName || item.code}</td>
                            <td>{item.batchCode || "—"}</td>
                            <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}</td>
                            <td>
                              <span className="text-[10px] px-1 py-0.5 rounded bg-muted">
                                {item.type || "SINGLE"}
                              </span>
                            </td>
                            <td>{Number(item.quantity).toFixed(1)}</td>
                            <td>{Number(item.price).toFixed(2)}</td>
                            <td>{Number(item.vat || 0).toFixed(2)}</td>
                            <td className="pos-amount font-semibold">{Number(item.total).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals & Payments Section */}
                  <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Payment Info */}
                    <div className="space-y-2 bg-muted/30 p-3 rounded-md">
                      <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        {lang === "ar" ? "تفاصيل الدفع" : "Payment Information"}
                      </h4>
                      <div className="flex justify-between items-center py-1 border-b border-border/50">
                        <span className="text-muted-foreground text-xs">{lang === "ar" ? "طريقة الدفع" : "Payment Mode"}</span>
                        <span className="font-semibold">{saleDetail.paymentMode}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-border/50">
                        <span className="text-muted-foreground text-xs">{lang === "ar" ? "المدفوع" : "Amount Paid"}</span>
                        <span className="font-bold text-success">SR {Number(saleDetail.amountPaid || saleDetail.netAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-muted-foreground text-xs">{lang === "ar" ? "المتبقي / المرجوع" : "Balance / Change"}</span>
                        <span className={`font-bold ${Number(saleDetail.balance || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                          SR {Number(saleDetail.balance || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="space-y-1.5 flex flex-col items-end justify-center pr-2">
                      <div className="flex justify-between w-full max-w-[280px]">
                        <span className="text-muted-foreground">{lang === "ar" ? "المجموع (شامل الضريبة)" : "Total (Inc. VAT)"}</span>
                        <span className="font-semibold">SR {Number(saleDetail.totalAmount || 0).toFixed(2)}</span>
                      </div>
                      {Number(saleDetail.discount || 0) > 0 && (
                        <div className="flex justify-between w-full max-w-[280px] text-destructive">
                          <span>{lang === "ar" ? "الخصم" : "Discount"}</span>
                          <span>-SR {Number(saleDetail.discount).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between w-full max-w-[280px] text-xs text-muted-foreground border-t border-dashed border-border pt-1">
                        <span>{lang === "ar" ? "الصافي بدون ضريبة" : "Subtotal (Excl. VAT)"}</span>
                        <span>SR {(saleDetail.netAmount / (1 + (Number(saleDetail.vatPercent || 15) / 100))).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between w-full max-w-[280px] text-xs text-muted-foreground">
                        <span>{lang === "ar" ? "الضريبة المضافة" : "VAT"} ({Number(saleDetail.vatPercent || 15)}%)</span>
                        <span>SR {((saleDetail.netAmount / (1 + (Number(saleDetail.vatPercent || 15) / 100))) * (Number(saleDetail.vatPercent || 15) / 100)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between w-full max-w-[280px] text-primary font-extrabold text-lg border-t border-border pt-2 mt-1">
                        <span>{lang === "ar" ? "المبلغ المستحق" : "Net Amount"}</span>
                        <span>SR {Number(saleDetail.netAmount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {lang === "ar" ? "لا توجد بيانات" : "No data found"}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                className="pos-btn-secondary gap-1"
                onClick={() => setIsPrinting(true)}
              >
                <Printer size={14} /> {lang === "ar" ? "طباعة" : "Print"}
              </button>
              <button
                className="pos-btn-primary"
                onClick={() => setViewBillNo(null)}
              >
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZATCA Compliant Arabic Thermal Invoice (Fatura) Print-Only Container */}
      {saleDetail && (
        <div id="print-receipt" dir={receiptDir(invoiceMode)}>
          <div className="receipt-header">
            <h2 className="receipt-store-name">
              {settings?.storeName || (invoiceMode === "en" ? "Baqalat Sheemah Khulaif Aayed Al-Enazi Lil-Mawad Al-Ghidha'iyyah" : "بقالة شيمه خليف عايد العنزي للمواد الغذائية")}
            </h2>
            <p className="receipt-subtext">{settings?.storeAddress || "خميس مشيط - مخطط الحسام - الصناعية القديم"}</p>
            <p className="receipt-subtext">{receiptText(invoiceMode, "السجل التجاري", "CR")} : {settings?.crNumber || "7006133065"}</p>
            <p className="receipt-subtext">{receiptText(invoiceMode, "الرقم الضريبي", "VAT No")} : {settings?.vatNumber || "311465715100003"}</p>
            <p className="receipt-subtext">{receiptText(invoiceMode, "جوال", "Mobile")} : {settings?.supportContact || "0555917189"}</p>
          </div>
          
          <div className="receipt-divider-arrow">------------------------------------------</div>
          
          <div className="receipt-invoice-box">
            <div className="receipt-invoice-title">{receiptText(invoiceMode, "فاتورة ضريبية مبسطة", "Simplified Tax Invoice")}</div>
            <div className="receipt-invoice-row">
              <span>{receiptText(invoiceMode, "رقم الفاتورة", "Invoice No")} :</span>
              <span className="font-bold">{saleDetail.billNo}</span>
            </div>
            <div className="receipt-invoice-row">
              <span>{receiptText(invoiceMode, "التاريخ", "Date")} :</span>
              <span>{new Date(saleDetail.createdAt).toLocaleDateString("en-GB").replace(/\//g, "/")}</span>
            </div>
            <div className="receipt-invoice-row">
              <span>{receiptText(invoiceMode, "الوقت", "Time")} :</span>
              <span>{new Date(saleDetail.createdAt).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
            <div className="receipt-invoice-row">
              <span>{receiptText(invoiceMode, "نوع الفاتورة", "Type")} :</span>
              <span>{receiptSaleType(invoiceMode, saleDetail.isReturn ? "RETURN" : "SALE")}</span>
            </div>
            <div className="receipt-invoice-row">
              <span>{receiptText(invoiceMode, "طريقة الدفع", "Payment")} :</span>
              <span>{receiptPayment(invoiceMode, saleDetail.paymentMode)}</span>
            </div>
          </div>

          {(saleDetail.customer?.customerName || (typeof saleDetail.customer === 'string' && saleDetail.customer)) && (
            <>
              <div className="receipt-divider">------------------------------------------</div>
              <div className="receipt-invoice-row">
                <span>{receiptText(invoiceMode, "اسم العميل", "Customer")} :</span>
                <span className="font-semibold">{saleDetail.customer?.customerName || saleDetail.customer}</span>
              </div>
            </>
          )}

          <div className="receipt-divider">------------------------------------------</div>

          <table className="receipt-items-table">
            <thead>
              <tr>
                <th className={nameAlign}>{receiptText(invoiceMode, "الصنف", "Item")}</th>
                <th className="text-center">{receiptText(invoiceMode, "العدد", "Qty")}</th>
                <th className="text-center">{receiptText(invoiceMode, "السعر", "Price")}</th>
                <th className={amountAlign}>{receiptText(invoiceMode, "المجموع", "Total")}</th>
              </tr>
            </thead>
            <tbody>
              {(saleDetail.items || []).map((item, idx) => {
                const names = receiptItemName(invoiceMode, item, allProducts);
                return (
                  <tr key={idx}>
                    <td className={nameAlign}>
                      {names.primary}
                      {names.secondary && <div dir="ltr">{names.secondary}</div>}
                    </td>
                    <td className="text-center">{Number(item.quantity).toFixed(1)}</td>
                    <td className="text-center">{(Number(item.total) / (Number(item.quantity) || 1)).toFixed(2)}</td>
                    <td className={amountAlign}>{Number(item.total).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="receipt-divider">------------------------------------------</div>

          <div className="receipt-summary-box">
            <div className="receipt-summary-row">
              <span>{receiptText(invoiceMode, "اجمالي الفاتورة", "Invoice Total")}</span>
              <span>{Number(saleDetail.totalAmount || 0).toFixed(2)}</span>
            </div>
            <div className="receipt-summary-row">
              <span>{receiptText(invoiceMode, "الخصم", "Discount")}</span>
              <span>{Number(saleDetail.discount || 0).toFixed(2)}</span>
            </div>
            <div className="receipt-summary-row font-semibold">
              <span>{receiptText(invoiceMode, "بدون الضريبة", "Excl. VAT")}</span>
              <span>{(saleDetail.netAmount / (1 + (Number(saleDetail.vatPercent || 15) / 100))).toFixed(2)}</span>
            </div>
            <div className="receipt-summary-row">
              <span>{receiptVatLabel(invoiceMode, saleDetail.vatPercent)}</span>
              <span>{((saleDetail.netAmount / (1 + (Number(saleDetail.vatPercent || 15) / 100))) * (Number(saleDetail.vatPercent || 15) / 100)).toFixed(2)}</span>
            </div>
            <div className="receipt-summary-row font-bold text-lg border-t border-dashed pt-1 mt-1">
              <span>{receiptText(invoiceMode, "المبلغ المستحق", "Amount Due")}</span>
              <span>{Number(saleDetail.netAmount).toFixed(2)}</span>
            </div>
            <div className="receipt-summary-row text-xs opacity-80 mt-1">
              <span>{receiptText(invoiceMode, "إجمالي الكميات", "Total Qty")}</span>
              <span>{(saleDetail.items || []).reduce((sum, item) => sum + Number(item.quantity), 0).toFixed(1)}</span>
            </div>
          </div>

          <div className="receipt-divider">------------------------------------------</div>

          <div className="receipt-payment-row font-semibold">
            <span>{receiptText(invoiceMode, "المدفوع", "Paid")}</span>
            <span>{Number(saleDetail.amountPaid || saleDetail.netAmount).toFixed(2)}</span>
          </div>
          <div className="receipt-payment-row">
            <span>{receiptText(invoiceMode, "المتبقي", "Balance")}</span>
            <span>{Number(saleDetail.balance || 0).toFixed(2)}</span>
          </div>

          <div className="receipt-qr-section">
            {qrBase64 && <img src={qrBase64} alt="ZATCA QR" className="receipt-qr-img" />}
            <div className="receipt-qr-text">{receiptQrLabel(invoiceMode)}</div>
          </div>
        </div>
      )}

      <style>{`
        /* Hide standard app elements when printing */
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-receipt, #print-receipt * {
            visibility: visible !important;
          }
          #print-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 3mm 4mm;
            margin: 0;
            background: #fff !important;
            color: #000 !important;
            font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif !important;
            box-sizing: border-box;
            font-size: 15px !important;
            line-height: 1.5 !important;
          }
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
        }

        /* Receipt Screen styling for debugging/rendering */
        #print-receipt {
          display: none;
        }
        @media print {
          #print-receipt {
            display: block !important;
          }
        }

        .receipt-header {
          text-align: center;
          margin-bottom: 2px;
        }
        .receipt-store-name {
          font-size: 20px;
          font-weight: 900;
          margin: 0 0 3px 0;
          letter-spacing: 0.3px;
        }
        .receipt-subtext {
          font-size: 13px;
          margin: 0 0 2px 0;
          opacity: 0.9;
        }
        .receipt-divider-arrow {
          text-align: center;
          margin: 3px 0;
          letter-spacing: -0.5px;
          font-size: 12px;
        }
        .receipt-divider {
          text-align: center;
          margin: 3px 0;
          letter-spacing: -0.5px;
          font-size: 12px;
        }
        .receipt-invoice-box {
          border: 1.5px solid #000;
          padding: 6px;
          margin: 5px 0;
          border-radius: 4px;
        }
        .receipt-invoice-title {
          font-weight: bold;
          font-size: 16px;
          text-align: center;
          margin-bottom: 4px;
          border-bottom: 1px dashed #000;
          padding-bottom: 3px;
        }
        .receipt-invoice-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          margin-bottom: 2px;
          padding: 1px 0;
        }
        .receipt-items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          margin: 5px 0;
        }
        .receipt-items-table th {
          font-weight: bold;
          border-bottom: 1.5px solid #000;
          border-top: 1.5px solid #000;
          padding: 3px 2px;
          font-size: 13px;
        }
        .receipt-items-table td {
          padding: 4px 2px;
          border-bottom: 1px dotted #999;
        }
        .receipt-summary-box {
          border: 1.5px solid #000;
          padding: 6px;
          margin: 5px 0;
          border-radius: 4px;
        }
        .receipt-summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          margin-bottom: 2px;
          padding: 1px 0;
        }
        .receipt-payment-row {
          display: flex;
          justify-content: space-between;
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 2px;
          padding: 2px 4px;
        }
        .receipt-qr-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 10px;
          text-align: center;
        }
        .receipt-qr-img {
          width: 130px;
          height: 130px;
        }
        .receipt-qr-text {
          font-size: 12px;
          margin-top: 3px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
