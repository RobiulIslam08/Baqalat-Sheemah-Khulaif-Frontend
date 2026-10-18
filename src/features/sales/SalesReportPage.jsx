import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSales, useSaleByBillNo } from "@/hooks/useSales";
import { useProducts } from "@/hooks/useProducts";
import { useUsers } from "@/hooks/useUsers";
import { useSettings } from "@/hooks/useSettings";
import { Search, Eye, Printer, Loader2, X, ReceiptText, RotateCcw, AlertCircle, FileDown, QrCode, CheckCircle2, Maximize2 } from "lucide-react";
import QRCode from "qrcode";
import { invoiceLanguageOf, receiptDir, receiptItemName, receiptMeta, receiptPayment, receiptQrLabel, receiptSaleType, receiptText, receiptVatLabel } from "./receiptLanguage";
import { downloadMonthlySalesPdf } from "./monthlySalesPdf";
import { saleService } from "@/services/sale.service";
import { showError } from "@/lib/toast-helpers";
import { printReceipt } from "@/lib/printReceipt";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** "YYYY-MM" -> { from: "YYYY-MM-01", to: "YYYY-MM-<lastDay>" } */
function monthRange(month) {
  if (!month) return { from: "", to: "" };
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

const TAB_SALES = "SALE";
const TAB_RETURNS = "RETURN";

export default function SalesReportPage() {
  const { t, lang } = useLanguage();
  const { data: settings } = useSettings();
  const { data: prodData } = useProducts({ limit: 5000 });
  const allProducts = prodData?.products || [];

  // Tabs
  const [activeTab, setActiveTab] = useState(TAB_SALES);

  // Monthly report selector — the table below always reflects this month
  const [reportMonth, setReportMonth] = useState(currentMonthValue());
  const [pdfLoading, setPdfLoading] = useState(false);
  const initialRange = monthRange(currentMonthValue());

  // Filters
  const [user, setUser] = useState("");
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);

  // Pagination: 100 per page
  const PAGE_SIZE = 100;
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useState({
    type: TAB_SALES,
    page: 1,
    limit: PAGE_SIZE,
    fromDate: initialRange.from,
    toDate: initialRange.to,
  });

  // Bill detail viewer
  const [viewBillNo, setViewBillNo] = useState(null);
  const [qrBase64, setQrBase64] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  // Dedicated ZATCA Phase 2 QR Modal State (matching /zatca)
  const [qrModalSale, setQrModalSale] = useState(null);
  const [qrModalUrl, setQrModalUrl] = useState("");

  const handleOpenQrModal = async (sale) => {
    setQrModalSale(sale);
    setQrModalUrl("");
    try {
      let payload = sale?.qrCodePayload;
      let activeSale = sale;

      // If payload is not in the row object, fetch full sale details from backend
      if (!payload && sale?.billNo) {
        try {
          const res = await saleService.getByBillNo(sale.billNo);
          if (res?.data) {
            activeSale = res.data;
            payload = res.data.qrCodePayload;
            setQrModalSale(activeSale);
          }
        } catch (fetchErr) {
          console.warn("Could not fetch full sale for QR modal:", fetchErr);
        }
      }

      if (payload) {
        const url = await QRCode.toDataURL(payload, {
          width: 340,
          margin: 3,
          errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#ffffff" },
        });
        setQrModalUrl(url);
      } else {
        const storeName = settings?.storeName;
        const vatNo = settings?.vatNumber;
        const vatRate = Number(activeSale?.vatPercent || 15);
        const saleVatAmt = (Number(activeSale?.netAmount) / (100 + vatRate)) * vatRate;
        const qrTlv = generateZatcaTlv(storeName, vatNo, activeSale?.createdAt, activeSale?.netAmount, saleVatAmt);
        const url = await QRCode.toDataURL(qrTlv, {
          width: 340,
          margin: 3,
          errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#ffffff" },
        });
        setQrModalUrl(url);
      }
    } catch (err) {
      console.error("QR modal generation error:", err);
      setQrModalUrl("");
    }
  };

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
        if (saleDetail.qrCodePayload) {
          const qrCodeUrl = await QRCode.toDataURL(saleDetail.qrCodePayload, {
            width: 340,
            margin: 3,
            errorCorrectionLevel: "M",
            color: { dark: "#000000", light: "#ffffff" },
          });
          setQrBase64(qrCodeUrl);
        } else {
          const storeName = settings?.storeName;
          const vatNo = settings?.vatNumber;
          const vatRate = Number(saleDetail.vatPercent || 15);
          const saleVatAmt = (Number(saleDetail.netAmount) / (100 + vatRate)) * vatRate;

          const qrTlv = generateZatcaTlv(storeName, vatNo, saleDetail.createdAt, saleDetail.netAmount, saleVatAmt);
          const qrCodeUrl = await QRCode.toDataURL(qrTlv, {
            width: 340,
            margin: 3,
            errorCorrectionLevel: "M",
            color: { dark: "#000000", light: "#ffffff" },
          });
          setQrBase64(qrCodeUrl);
        }
      } catch (err) {
        console.error("ZATCA QR Generation Failed", err);
      }
    };

    generateQr();
  }, [saleDetail, settings]);

  // Elegant print trigger that fires when printing is requested, details are loaded, and QR is ready
  useEffect(() => {
    if (isPrinting && saleDetail && qrBase64) {
      const timer = setTimeout(async () => {
        await printReceipt();
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

  // Selecting a month immediately filters the table below to that month,
  // with its totals, across all tabs/pages.
  const applyMonth = (month) => {
    setReportMonth(month);
    const { from, to } = monthRange(month);
    setFromDate(from);
    setToDate(to);
    setPage(1);
    const params = { type: activeTab, page: 1, limit: PAGE_SIZE, fromDate: from, toDate: to };
    if (user) params.createdBy = user;
    setSearchParams(params);
  };

  const handleDownloadMonthlyPdf = async () => {
    if (!reportMonth) return;
    setPdfLoading(true);
    try {
      const { from: fromDate, to: toDate } = monthRange(reportMonth);

      const res = await saleService.getAll({
        type: activeTab,
        fromDate,
        toDate,
        limit: 5000,
      });
      const monthSales = res?.data || [];

      if (monthSales.length === 0) {
        showError(null, lang === "ar" ? "لا توجد بيانات لهذا الشهر" : "No records found for this month");
        return;
      }

      downloadMonthlySalesPdf({
        month: reportMonth,
        sales: monthSales,
        settings,
        isReturn: !isSaleTab,
      });
    } catch (err) {
      showError(err, "Failed to generate the monthly PDF report");
    } finally {
      setPdfLoading(false);
    }
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

      {/* Monthly PDF Report */}
      <div className="pos-card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 flex-wrap">
          <div>
            <label className="pos-label">{lang === "ar" ? "التقرير الشهري" : "Monthly Report"}</label>
            <input
              type="month"
              className="pos-input w-44"
              value={reportMonth}
              onChange={(e) => applyMonth(e.target.value)}
            />
          </div>
          <button
            className="pos-btn-primary gap-1"
            onClick={handleDownloadMonthlyPdf}
            disabled={pdfLoading || !reportMonth}
          >
            {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            {lang === "ar" ? "تنزيل PDF" : "Download PDF"}
          </button>
          <span className="text-xs text-muted-foreground">
            {lang === "ar"
              ? "يعرض الجدول أدناه بيانات الشهر المحدد مع الإجمالي، ويمكنك أيضاً تنزيله كملف PDF"
              : "The table below shows this month's records with the total, and you can also download it as a PDF"}
          </span>
        </div>
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
              <th className="w-14">{lang === "ar" ? "باركود" : "QR"}</th>
              <th className="w-14">{t("report.view")}</th>
              <th className="w-14">{t("report.print")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="text-center py-8">
                  <Loader2 size={20} className="animate-spin inline-block" />
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-destructive bg-destructive/5">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle size={24} />
                    <p className="font-semibold">{lang === "ar" ? "فشل تحميل البيانات" : "Failed to load data"}</p>
                    <p className="text-xs opacity-70">{error?.message || "Unknown error"}</p>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center text-muted-foreground py-8">
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
                      title={lang === "ar" ? "معاينة باركود المرحلة الثانية (ZATCA QR)" : "Preview ZATCA Phase 2 QR"}
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 p-1.5 rounded-lg transition-colors inline-flex items-center justify-center"
                      onClick={() => handleOpenQrModal(rec)}
                    >
                      <QrCode size={17} />
                    </button>
                  </td>
                  <td>
                    <button
                      id={`btn-view-${rec.billNo}`}
                      className="text-primary hover:opacity-70 p-1.5"
                      onClick={() => setViewBillNo(rec.billNo)}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                  <td>
                    <button
                      className="text-muted-foreground hover:opacity-70 p-1.5"
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

                      {/* ZATCA Phase 2 QR Display */}
                      {qrBase64 && (
                        <div className="mt-3 p-3 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-center gap-4">
                          <div
                            onClick={() => handleOpenQrModal(saleDetail)}
                            className="p-2 bg-white rounded-xl shadow-sm border border-black/10 shrink-0 cursor-pointer group relative hover:shadow-md transition-all"
                            title={lang === "ar" ? "اضغط لتكبير الباركود للمسح بالجوال" : "Click to enlarge QR for phone scan"}
                          >
                            <img
                              src={qrBase64}
                              alt="ZATCA Phase 2 QR"
                              className="w-36 h-36 rounded block select-none"
                              style={{ imageRendering: "pixelated" }}
                            />
                            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1 transition-opacity">
                              <Maximize2 size={16} />
                              <span>{lang === "ar" ? "تكبير" : "Enlarge"}</span>
                            </div>
                          </div>
                          <div className="text-xs space-y-1.5 flex-1">
                            <div className="font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                              <span className={`w-2.5 h-2.5 rounded-full ${saleDetail.qrCodePayload ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                              {lang === "ar" ? "باركود هيئة الزكاة (ZATCA Phase 2)" : "ZATCA Phase 2 QR Code"}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {saleDetail.qrCodePayload
                                ? (lang === "ar" ? "معتمد ومشفّر بالختم الرقمي (ECDSA / XAdES-EPES)" : "Cryptographically Signed & Verified")
                                : (lang === "ar" ? "باركود ضريبي مبسط (المرحلة الأولى)" : "Standard Tax QR (Phase 1)")}
                            </p>
                            {saleDetail.zatcaStatus && (
                              <div className="pt-0.5">
                                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  saleDetail.zatcaStatus === "cleared" || saleDetail.zatcaStatus === "reported"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-amber-100 text-amber-800"
                                }`}>
                                  <CheckCircle2 size={10} />
                                  {saleDetail.zatcaStatus}
                                </span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenQrModal(saleDetail)}
                              className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[11px] transition-colors"
                            >
                              <Maximize2 size={12} />
                              {lang === "ar" ? "تكبير الباركود للمسح المباشر" : "Enlarge QR for Phone Scan"}
                            </button>
                          </div>
                        </div>
                      )}
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

      {/* Dedicated Phase 2 QR Preview Modal (Matching /zatca) */}
      {qrModalSale && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setQrModalSale(null);
              setQrModalUrl("");
            }
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-muted/40">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-primary" />
                <h3 className="font-bold text-sm text-foreground">
                  {lang === "ar" ? "باركود الفاتورة الإلكترونية (ZATCA Phase 2)" : "ZATCA Phase 2 QR Code"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setQrModalSale(null);
                  setQrModalUrl("");
                }}
                className="hover:opacity-70 p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col items-center text-center space-y-4">
              {qrModalUrl ? (
                <div className="p-4 bg-white rounded-2xl shadow-md border border-black/10 inline-block">
                  <img
                    src={qrModalUrl}
                    alt="ZATCA Phase 2 QR Code"
                    className="w-64 h-64 mx-auto select-none block"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-muted/40 rounded-2xl border border-dashed border-border">
                  <Loader2 className="animate-spin text-primary" size={28} />
                </div>
              )}

              <div>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono font-bold text-base text-foreground">
                    {qrModalSale.billNo ? `Bill #${qrModalSale.billNo}` : qrModalSale.invoiceNumber}
                  </span>
                  {qrModalSale.qrCodePayload && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 size={12} />
                      Phase 2 Compliant
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(qrModalSale.createdAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-GB")}
                </p>
              </div>

              {/* Invoice Summary */}
              <div className="w-full text-xs text-start bg-muted/50 p-3.5 rounded-xl space-y-2 border border-border/60">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "نوع الفاتورة:" : "Invoice Type:"}</span>
                  <span className="font-semibold">
                    {qrModalSale.isReturn
                      ? (lang === "ar" ? "إشعار دائن (مرتجع)" : "Credit Note (Return)")
                      : (lang === "ar" ? "فاتورة ضريبية مبسطة (B2C)" : "Simplified Tax Invoice (B2C)")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "المبلغ الإجمالي (شامل الضريبة):" : "Total (Incl. VAT):"}</span>
                  <span className="font-bold text-foreground">
                    SR {Number(qrModalSale.netAmount || qrModalSale.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "مبلغ ضريبة القيمة المضافة:" : "VAT Amount (15%):"}</span>
                  <span className="font-semibold">
                    SR {((Number(qrModalSale.netAmount || 0) / (1 + Number(qrModalSale.vatPercent || 15) / 100)) * (Number(qrModalSale.vatPercent || 15) / 100)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">{lang === "ar" ? "حالة الاعتماد في الهيئة:" : "ZATCA Status:"}</span>
                  <span className="font-bold uppercase text-[11px] text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    {qrModalSale.zatcaStatus || "reported"}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {lang === "ar"
                  ? "امسح هذا الرمز باستخدام تطبيق (فاتورة) الرسمي لهيئة الزكاة والضريبة والجمارك للتحقق من اعتماد وصحة الفاتورة."
                  : "Scan this QR code with the official ZATCA Fatoora app on your mobile phone to verify its authenticity."}
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
              <button
                className="pos-btn-secondary text-xs"
                onClick={() => {
                  handlePrint(qrModalSale.billNo);
                  setQrModalSale(null);
                }}
              >
                <Printer size={13} className="mr-1" />
                {lang === "ar" ? "طباعة الفاتورة" : "Print Receipt"}
              </button>
              <button
                className="pos-btn-primary text-xs"
                onClick={() => {
                  setQrModalSale(null);
                  setQrModalUrl("");
                }}
              >
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZATCA Compliant Arabic Thermal Invoice (Fatura) Print-Only Container */}
      {saleDetail && typeof document !== "undefined" && createPortal(
        <div id="print-receipt" dir={receiptDir(invoiceMode)}>
          <div className="receipt-header">
            {settings?.logo && <img src={settings.logo} alt="" className="receipt-logo" />}
            <h2 className="receipt-store-name">
              {invoiceMode === "both" ? (
                <div className="receipt-store-bilingual">
                  <div className="receipt-store-ar" dir="rtl">
                    {settings?.storeNameAr || settings?.storeName || "بقالة شيمه خليف عايد العنزي للمواد الغذائية"}
                  </div>
                  {(settings?.storeNameEn && settings.storeNameEn.trim() !== (settings?.storeNameAr || settings?.storeName || "").trim()) && (
                    <div className="receipt-store-en" dir="ltr">
                      {settings.storeNameEn}
                    </div>
                  )}
                </div>
              ) : invoiceMode === "en"
                ? (settings?.storeNameEn || settings?.storeName || "Baqalat Sheemah Khulaif Aayed Al-Enazi Lil-Mawad Al-Ghidha'iyyah")
                : (settings?.storeNameAr || settings?.storeName || "بقالة شيمه خليف عايد العنزي للمواد الغذائية")}
            </h2>
            <p className="receipt-subtext">{settings?.storeAddress || "خميس مشيط - مخطط الحسام - الصناعية القديم"}</p>
            <p className="receipt-subtext">{receiptMeta(invoiceMode, "جوال", "Mobile", settings?.supportContact || "0555917189")}</p>
          </div>
          
          <div className="receipt-divider-arrow" />
          
          <div className="receipt-invoice-box">
            <div className="receipt-invoice-title">{receiptText(invoiceMode, "فاتورة ضريبية مبسطة", "Simplified Tax Invoice")}</div>
            <div className="receipt-invoice-row">
              <span>{receiptText(invoiceMode, "رقم الفاتورة", "Invoice No")}</span>
              <span className="font-bold">{saleDetail.billNo}</span>
            </div>
            <div className="receipt-invoice-row">
              <span>{receiptText(invoiceMode, "التاريخ", "Date")}</span>
              <span>{new Date(saleDetail.createdAt).toLocaleDateString("en-GB").replace(/\//g, "/")}</span>
            </div>
            <div className="receipt-invoice-row">
              <span>{receiptText(invoiceMode, "الوقت", "Time")}</span>
              <span>{new Date(saleDetail.createdAt).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
            <div className="receipt-invoice-row">
              <span>{receiptText(invoiceMode, "نوع الفاتورة", "Type")}</span>
              <span>{receiptSaleType(invoiceMode, saleDetail.isReturn ? "RETURN" : "SALE")}</span>
            </div>
            <div className="receipt-invoice-row">
              <span>{receiptText(invoiceMode, "طريقة الدفع", "Payment")}</span>
              <span>{receiptPayment(invoiceMode, saleDetail.paymentMode)}</span>
            </div>
          </div>

          {(saleDetail.customer?.customerName || (typeof saleDetail.customer === 'string' && saleDetail.customer)) && (
            <>
              <div className="receipt-divider" />
              <div className="receipt-invoice-row">
                <span>{receiptText(invoiceMode, "اسم العميل", "Customer")}</span>
                <span className="font-semibold">{saleDetail.customer?.customerName || saleDetail.customer}</span>
              </div>
            </>
          )}

          <div className="receipt-divider" />

          <table className="receipt-items-table">
            <thead>
              <tr>
                <th className="receipt-th-item">{receiptText(invoiceMode, "الصنف", "Item")}</th>
                <th className="receipt-th-qty">{receiptText(invoiceMode, "العدد", "Qty")}</th>
                <th className="receipt-th-price">{receiptText(invoiceMode, "السعر", "Price")}</th>
                <th className="receipt-th-total">{receiptText(invoiceMode, "المجموع", "Total")}</th>
              </tr>
            </thead>
            <tbody>
              {(saleDetail.items || []).map((item, idx) => {
                const names = receiptItemName(invoiceMode, item, allProducts);
                return (
                  <tr key={idx}>
                    <td className="receipt-td-item">
                      <span className="receipt-item-ar" dir="rtl">{names.primary}</span>
                      {names.secondary && (
                        <span className="receipt-item-en" dir="ltr">
                          {" / "}{names.secondary}
                        </span>
                      )}
                    </td>
                    <td className="receipt-td-qty">{Number(item.quantity).toFixed(1)}</td>
                    <td className="receipt-td-price">{(Number(item.total) / (Number(item.quantity) || 1)).toFixed(2)}</td>
                    <td className="receipt-td-total">{Number(item.total).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="receipt-divider" />

          <div className="receipt-summary-box">
            <div className="receipt-summary-row">
              <span>{receiptText(invoiceMode, "اجمالي الفاتورة", "Invoice Total")}</span>
              <span>{Number(saleDetail.totalAmount || 0).toFixed(2)}</span>
            </div>
            {Number(saleDetail.discount || 0) > 0 && (
              <div className="receipt-summary-row">
                <span>{receiptText(invoiceMode, "الخصم", "Discount")}</span>
                <span>{Number(saleDetail.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="receipt-summary-row font-semibold">
              <span>{receiptText(invoiceMode, "بدون الضريبة", "Excl. VAT")}</span>
              <span>{(saleDetail.netAmount / (1 + (Number(saleDetail.vatPercent || 15) / 100))).toFixed(2)}</span>
            </div>
            <div className="receipt-summary-row">
              <span>{receiptVatLabel(invoiceMode, saleDetail.vatPercent)}</span>
              <span>{((saleDetail.netAmount / (1 + (Number(saleDetail.vatPercent || 15) / 100))) * (Number(saleDetail.vatPercent || 15) / 100)).toFixed(2)}</span>
            </div>
            <div className="receipt-summary-row font-bold border-t border-dashed border-black pt-1 mt-1">
              <span>{receiptText(invoiceMode, "المبلغ المستحق", "Amount Due")}</span>
              <span className="font-extrabold text-sm">{Number(saleDetail.netAmount).toFixed(2)}</span>
            </div>
            <div className="receipt-summary-row text-xs mt-1">
              <span>{receiptText(invoiceMode, "إجمالي الكميات", "Total Qty")}</span>
              <span>{(saleDetail.items || []).reduce((sum, item) => sum + Number(item.quantity), 0).toFixed(1)}</span>
            </div>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-payment-row font-semibold">
            <span>{receiptText(invoiceMode, "المدفوع", "Paid")}</span>
            <span>{Number(saleDetail.amountPaid || saleDetail.netAmount).toFixed(2)}</span>
          </div>

          <div className="receipt-qr-section">
            {qrBase64 && <img src={qrBase64} alt="ZATCA QR" className="receipt-qr-img" />}
            <div className="receipt-qr-text">{receiptQrLabel(invoiceMode)}</div>
          </div>

          <div className="receipt-footer-msg">
            {receiptText(invoiceMode, "شكراً لزيارتكم", "Thank you for your visit")}
          </div>
          <div className="receipt-footer-sub">
            {receiptText(invoiceMode, "يرجى الاحتفاظ بالفاتورة للاسترجاع أو الاستبدال", "Please retain the receipt for returns or exchanges")}
          </div>
        </div>,
        document.body
      )}

      <style>{`
        /* Hide standard app elements when printing */
        @media print {
          @page {
            size: 58mm auto;
            margin: 0mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            direction: ltr !important;
            width: 58mm !important;
            max-width: 58mm !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          #root {
            display: none !important;
          }
          #print-receipt, #print-receipt * {
            visibility: visible !important;
            opacity: 1 !important;
            color: #000 !important;
            font-family: "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif !important;
            letter-spacing: 0 !important;
            font-synthesis: none !important;
            -webkit-font-smoothing: auto !important;
            text-rendering: geometricPrecision !important;
          }
          #print-receipt {
            display: block !important;
            position: static !important;
            width: 58mm !important;
            max-width: 58mm !important;
            padding: 1.5mm 1.5mm 4mm 1.5mm !important;
            margin: 0 !important;
            background: #fff !important;
            color: #000 !important;
            font-weight: 700 !important;
            box-sizing: border-box !important;
            font-size: 12px !important;
            line-height: 1.55 !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: visible !important;
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
          text-align: center !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          margin-bottom: 6px;
        }
        .receipt-logo {
          display: block !important;
          margin: 0 auto 8px auto !important;
          width: 40mm !important;
          height: auto !important;
          max-width: 40mm !important;
          max-height: 40mm !important;
          object-fit: contain !important;
          image-rendering: high-quality !important;
        }
        .receipt-store-name {
          font-size: 14px !important;
          font-weight: 700;
          margin: 0 0 4px 0;
          letter-spacing: 0;
          line-height: 1.4;
          text-align: center;
        }
        .receipt-subtext {
          font-size: 11.5px !important;
          margin: 0 0 2.5px 0;
          font-weight: 700;
          line-height: 1.45;
          text-align: center;
        }
        .receipt-divider-arrow,
        .receipt-divider {
          border-top: 1px dashed #000 !important;
          margin: 6px 0 !important;
          height: 0 !important;
          width: 100% !important;
        }
        .receipt-invoice-box,
        .receipt-summary-box {
          border: none;
          padding: 2px 0;
          margin: 4px 0;
        }
        .receipt-invoice-title {
          font-weight: 700;
          font-size: 13.5px !important;
          text-align: center;
          margin-bottom: 6px;
          border-bottom: 1px dashed #000;
          padding-bottom: 4px;
          line-height: 1.4;
        }
        .receipt-invoice-row,
        .receipt-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px !important;
          font-weight: 700;
          line-height: 1.55;
          margin-bottom: 3.5px;
          padding: 1px 0;
        }
        .receipt-invoice-row span,
        .receipt-summary-row span,
        .receipt-payment-row span,
        .receipt-items-table th,
        .receipt-qr-text {
          letter-spacing: 0;
        }
        .receipt-items-table {
          width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
          font-size: 11.5px !important;
          margin: 5px 0 !important;
        }
        .receipt-items-table th {
          border-bottom: 1.5px solid #000 !important;
          border-top: 1.5px solid #000 !important;
          padding: 4px 1px !important;
          font-size: 11.5px !important;
          font-weight: 700 !important;
          line-height: 1.35 !important;
        }
        .receipt-items-table td {
          padding: 5px 1px !important;
          border-bottom: 1px dotted #999 !important;
          font-size: 11.5px !important;
          line-height: 1.4 !important;
          vertical-align: top !important;
        }
        .receipt-th-item, .receipt-td-item {
          width: 40% !important;
          text-align: right !important;
          word-break: break-word !important;
        }
        .receipt-th-qty, .receipt-td-qty {
          width: 16% !important;
          text-align: center !important;
        }
        .receipt-th-price, .receipt-td-price {
          width: 20% !important;
          text-align: center !important;
        }
        .receipt-th-total, .receipt-td-total {
          width: 24% !important;
          text-align: left !important;
        }
        .receipt-payment-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12.5px !important;
          font-weight: 700;
          line-height: 1.55;
          margin-bottom: 3.5px;
          padding: 1px 0;
        }
        .receipt-qr-section {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          margin-top: 10px !important;
          margin-bottom: 6px !important;
          text-align: center !important;
          width: 100% !important;
        }
        .receipt-qr-img {
          width: 150px !important;
          height: 150px !important;
          max-width: 100% !important;
          display: block !important;
          margin: 0 auto !important;
          image-rendering: pixelated !important;
          image-rendering: crisp-edges !important;
        }
        .receipt-bilingual {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: baseline;
          direction: rtl;
          gap: 2px;
          max-width: 100%;
          white-space: normal;
        }
        .receipt-line-ar {
          display: inline;
          direction: rtl;
          font-size: inherit;
          font-weight: 700;
          line-height: 1.4;
        }
        .receipt-sep {
          display: inline;
          font-weight: 600;
          opacity: 0.8;
          margin: 0 1px;
        }
        .receipt-line-en {
          display: inline;
          direction: ltr;
          font-size: 0.9em;
          font-weight: 600;
          line-height: 1.35;
        }
        .receipt-meta-bilingual {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: baseline;
          direction: rtl;
          gap: 2px;
          max-width: 100%;
          white-space: normal;
        }
        .receipt-meta-val {
          font-weight: 700;
        }
        .receipt-item-primary {
          display: inline;
          font-weight: 700;
        }
        .receipt-item-secondary {
          display: inline;
          font-weight: 600;
          font-size: 0.9em;
        }
        .receipt-store-bilingual {
          display: block;
          text-align: center;
        }
        .receipt-store-ar {
          font-size: 14px;
          font-weight: 700;
          line-height: 1.4;
        }
        .receipt-store-en {
          font-size: 11.5px;
          font-weight: 600;
          line-height: 1.35;
          margin-top: 2px;
        }
        .receipt-items-table th .receipt-line-en {
          font-size: 10px;
          font-weight: 600;
        }
        .receipt-qr-text {
          font-size: 11.5px !important;
          margin-top: 5px !important;
          font-weight: 700 !important;
          line-height: 1.35 !important;
        }
        .receipt-footer-msg {
          font-size: 12.5px !important;
          font-weight: 700 !important;
          text-align: center !important;
          margin-top: 8px !important;
          line-height: 1.4 !important;
          border-top: 1px dashed #000 !important;
          padding-top: 6px !important;
        }
        .receipt-footer-sub {
          font-size: 10.5px !important;
          font-weight: 600 !important;
          text-align: center !important;
          margin-top: 3px !important;
          line-height: 1.35 !important;
        }
      `}</style>
    </div>
  );
}
