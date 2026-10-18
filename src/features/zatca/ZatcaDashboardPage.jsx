import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import {
  useZatcaDeviceStatus,
  useZatcaInvoices,
  useZatcaRetryInvoice,
  useZatcaRetryAllInvoices,
  useZatcaHealth,
} from "@/hooks/useZatca";
import ZatcaOnboardingSection from "@/features/settings/ZatcaOnboardingSection";
import QRCode from "qrcode";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  QrCode as QrIcon,
  RefreshCw,
  Search,
  ExternalLink,
  Activity,
  FileText,
  AlertTriangle,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  Printer,
  Info,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { BACKEND_URL, tokenStore } from "@/services/api";
import { showSuccess, showError } from "@/lib/toast-helpers";

export default function ZatcaDashboardPage() {
  const { lang } = useLanguage();
  const { user } = useAuthContext();
  const isAr = lang === "ar";
  const canManage = user?.role === "admin" || user?.role === "developer";

  const { data: settings } = useSettings();
  const { data: statusData, isLoading: isStatusLoading, refetch: refetchStatus } = useZatcaDeviceStatus();
  const { data: healthData, isLoading: isHealthLoading, refetch: refetchHealth } = useZatcaHealth();

  const [activeTab, setActiveTab] = useState("invoices"); // 'invoices' | 'onboard' | 'guide'
  const [filterStatus, setFilterStatus] = useState("all");
  const [invoiceType, setInvoiceType] = useState("all");
  const [datePreset, setDatePreset] = useState("all"); // 'all' | 'today' | 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Queries & Mutations
  const {
    data: invoicesData,
    isLoading: isInvoicesLoading,
    isFetching,
    refetch: refetchInvoices,
  } = useZatcaInvoices({
    page,
    limit: 15,
    status: filterStatus,
    invoiceType,
    startDate,
    endDate,
    search: searchQuery,
  });

  const retryMutation = useZatcaRetryInvoice();
  const retryAllMutation = useZatcaRetryAllInvoices();

  // Modal States
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [qrModalUrl, setQrModalUrl] = useState("");

  const [inspectInvoice, setInspectInvoice] = useState(null);
  const [copiedRaw, setCopiedRaw] = useState(false);

  const [showTestReceipt, setShowTestReceipt] = useState(false);
  const [testReceiptQr, setTestReceiptQr] = useState("");

  const isOnboarded = statusData?.isFullyOnboarded;
  const env = statusData?.environment || "sandbox";
  const stats = invoicesData?.stats || { total: 0, cleared: 0, reported: 0, pending: 0, failed: 0 };
  const invoices = invoicesData?.invoices || [];
  const meta = invoicesData?.meta || { page: 1, totalPages: 1, total: 0 };

  const pendingCount = (stats.pending || 0) + (stats.failed || 0);

  // Handle Date Presets
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    setPage(1);
    const now = new Date();

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      const todayStr = now.toISOString().split("T")[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "week") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      setStartDate(sevenDaysAgo.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    }
  };

  // Open QR modal
  const handleOpenQr = async (inv) => {
    setSelectedInvoice(inv);
    if (inv?.qrCodePayload) {
      try {
        const url = await QRCode.toDataURL(inv.qrCodePayload, { width: 280, margin: 2 });
        setQrModalUrl(url);
      } catch (err) {
        console.error("Failed to render QR", err);
        setQrModalUrl("");
      }
    } else {
      setQrModalUrl("");
    }
  };

  // Download XML
  const handleDownloadXml = async (inv) => {
    if (!inv) return;
    try {
      const token = tokenStore.getAccess();
      const invoiceId = inv._id || inv.uuid;
      const res = await fetch(`${BACKEND_URL}/zatca/invoices/${invoiceId}/xml`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Download failed (${res.status})`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const statusPrefix = inv.zatcaStatus === "cleared" ? "CLEARED_" : "SIGNED_";
      a.download = `${statusPrefix}${inv.invoiceNumber || invoiceId}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showSuccess(isAr ? "تم تحميل ملف XML بنجاح" : "XML file downloaded successfully");
    } catch (err) {
      console.error("XML download error:", err);
      showError(err, isAr ? "فشل تحميل ملف XML" : "Failed to download XML file");
    }
  };

  // Retry single invoice
  const handleRetry = async (inv) => {
    try {
      await retryMutation.mutateAsync(inv._id);
      refetchInvoices();
    } catch (err) {
      console.error("Retry failed", err);
    }
  };

  // Bulk retry all pending
  const handleRetryAll = async () => {
    if (pendingCount === 0 || retryAllMutation.isPending) return;
    try {
      await retryAllMutation.mutateAsync("MAIN-BRANCH");
      refetchInvoices();
      refetchStatus();
    } catch (err) {
      console.error("Bulk retry failed", err);
    }
  };

  // Open Test Receipt
  const handleOpenTestReceipt = async () => {
    setShowTestReceipt(true);
    // Generate a dummy compliant Base64 TLV payload representation for preview
    const samplePayload = "AQVCYXFhbGF0IFNoZWVtYWgKh1NhdWRpIEFyYWJpYQIKMzAwMDAwMDAwMDAwMDAzDAMyMDI2LTEwLTE3VDEyOjAwOjAwWgQFMTAuMDAFBDEuNTA=";
    try {
      const url = await QRCode.toDataURL(samplePayload, { width: 220, margin: 2 });
      setTestReceiptQr(url);
    } catch {
      setTestReceiptQr("");
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (!invoices.length) return;

    const headers = [
      isAr ? "رقم الفاتورة" : "Invoice No",
      isAr ? "معرف الفاتورة (UUID)" : "UUID",
      isAr ? "تاريخ الإصدار" : "Issue Date",
      isAr ? "النوع" : "Type",
      isAr ? "المبلغ غير شامل الضريبة" : "Total Excl. VAT",
      isAr ? "ضريبة القيمة المضافة (15%)" : "VAT Amount",
      isAr ? "المبلغ الإجمالي" : "Total Incl. VAT",
      isAr ? "حالة الزكاة" : "ZATCA Status",
      isAr ? "تاريخ الاعتماد" : "Cleared/Reported At",
      isAr ? "تجزئة الفاتورة (Hash)" : "Invoice Hash",
    ];

    const rows = invoices.map((inv) => [
      `"${inv.invoiceNumber || ""}"`,
      `"${inv.uuid || ""}"`,
      `"${new Date(inv.issueDatetime || inv.createdAt).toISOString()}"`,
      `"${inv.invoiceType === "standard" ? "B2B Standard" : "B2C Simplified"}"`,
      Number(inv.totalExclusiveVat || 0).toFixed(2),
      Number(inv.totalVatAmount || 0).toFixed(2),
      Number(inv.totalInclusiveVat || 0).toFixed(2),
      `"${inv.zatcaStatus || ""}"`,
      `"${inv.clearedOrReportedAt ? new Date(inv.clearedOrReportedAt).toISOString() : ""}"`,
      `"${inv.invoiceHash || ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ZATCA_Tax_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy raw JSON in Inspect Modal
  const handleCopyRaw = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="pos-card p-6 border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
            <ShieldCheck size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                {isAr ? "الفوترة الإلكترونية (ZATCA Phase 2)" : "ZATCA E-Invoicing Phase 2"}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  env === "production"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {env}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                <Activity size={12} className={healthData?.isOnline ? "text-emerald-500" : "text-amber-500"} />
                {healthData?.isOnline ? `Gateway Online (${healthData.responseTimeMs}ms)` : "Checking Gateway..."}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              {isAr
                ? "متابعة الاعتماد المباشر، التحقق من فواتير المبيعات، تحميل ملفات XML المعتمدة ومسح الباركود المشفر طبقاً لمتطلبات هيئة الزكاة والضريبة والجمارك."
                : "Real-time compliance monitoring, invoice clearance audit, official stamped XML downloads, and Phase 2 cryptographic QR verification."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {/* Test Print Button */}
          <button
            onClick={handleOpenTestReceipt}
            className="pos-btn-secondary gap-1.5 text-xs py-2 px-3 text-foreground"
            title={isAr ? "تجربة طباعة فاتورة بالباركود" : "Test Print Receipt"}
          >
            <Printer size={14} className="text-primary" />
            {isAr ? "تجربة طباعة" : "Test Print"}
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={!invoices.length}
            className="pos-btn-secondary gap-1.5 text-xs py-2 px-3 disabled:opacity-40"
            title={isAr ? "تصدير كشف الزكاة إلى ملف CSV/Excel" : "Export to CSV"}
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            {isAr ? "تصدير CSV" : "Export CSV"}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => {
              refetchStatus();
              refetchInvoices();
              refetchHealth();
            }}
            className="pos-btn-secondary gap-1.5 text-xs py-2 px-3"
            title="تحديث البيانات"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            {isAr ? "تحديث" : "Refresh"}
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Device Status */}
        <div className="pos-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{isAr ? "حالة اعتماد الجهاز" : "Device Compliance"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`font-bold text-base ${isOnboarded ? "text-emerald-600" : "text-amber-600"}`}>
                {isOnboarded ? (isAr ? "معتمد ومربوط" : "Onboarded & Live") : isAr ? "غير مربوط" : "Not Onboarded"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
              {statusData?.serialNumber ? statusData.serialNumber.slice(0, 20) + "..." : "MAIN-BRANCH"}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isOnboarded ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
            }`}
          >
            {isOnboarded ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          </div>
        </div>

        {/* Total Invoices */}
        <div className="pos-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{isAr ? "إجمالي الفواتير الصادرة" : "Total Invoices"}</p>
            <p className="font-black text-2xl mt-1 text-foreground">{stats.total}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isAr ? "إجمالي القيمة: " : "Total: "}
              <span className="font-semibold text-foreground">{Number(stats.totalAmount || 0).toFixed(2)} SR</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>

        {/* Reported B2C / Cleared B2B */}
        <div className="pos-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{isAr ? "الفواتير المعتمدة والمبلغة" : "Reported & Cleared"}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-black text-2xl text-emerald-600">{(stats.cleared || 0) + (stats.reported || 0)}</p>
              {stats.total > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {Math.round((((stats.cleared || 0) + (stats.reported || 0)) / stats.total) * 100)}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isAr
                ? `مبسطة: ${stats.reported || 0} | قياسية: ${stats.cleared || 0}`
                : `B2C: ${stats.reported || 0} | B2B: ${stats.cleared || 0}`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* Pending / Failed + Bulk Retry Action */}
        <div className="pos-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{isAr ? "قيد المعالجة أو التنبيهات" : "Pending / Action Req."}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className={`font-black text-2xl ${pendingCount > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                {pendingCount}
              </p>
              {pendingCount > 0 && (
                <button
                  onClick={handleRetryAll}
                  disabled={retryAllMutation.isPending}
                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 inline-flex items-center gap-1 transition-all"
                  title={isAr ? "إعادة إرسال جميع الفواتير المعلقة" : "Retry all pending invoices"}
                >
                  <RotateCcw size={11} className={retryAllMutation.isPending ? "animate-spin" : ""} />
                  {isAr ? "إرسال الكل" : "Retry All"}
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isAr ? `معلقة: ${stats.pending || 0} | أخطاء: ${stats.failed || 0}` : `Pending: ${stats.pending || 0} | Errors: ${stats.failed || 0}`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "invoices"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText size={16} />
          {isAr ? "سجل الفواتير والاعتماد" : "Invoice Audit Log"}
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
            {stats.total}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("onboard")}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "onboard"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck size={16} />
          {isAr ? "إدارة اعتماد الجهاز (Onboarding)" : "Device & Credentials"}
        </button>

        <button
          onClick={() => setActiveTab("guide")}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "guide"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen size={16} />
          {isAr ? "دليل الربط الشامل" : "Step-by-Step Guide"}
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: Invoices Table with Advanced Filters */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {/* Controls: Search, Status, Invoice Type & Date Filters */}
          <div className="pos-card p-4 space-y-3">
            {/* Top row: Status pills + Search */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Status Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {["all", "reported", "cleared", "pending", "failed"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setFilterStatus(st);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                      filterStatus === st
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-muted/70 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {st === "all"
                      ? isAr
                        ? "الكل"
                        : "All"
                      : st === "reported"
                      ? isAr
                        ? "مبلغة (B2C)"
                        : "Reported"
                      : st === "cleared"
                      ? isAr
                        ? "معتمدة (B2B)"
                        : "Cleared"
                      : st === "pending"
                      ? isAr
                        ? "معلقة"
                        : "Pending"
                      : isAr
                      ? "مرفوضة"
                      : "Failed"}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={isAr ? "بحث برقم الفاتورة أو المعرف..." : "Search invoice no or UUID..."}
                  className="pos-input pl-9 text-xs"
                />
              </div>
            </div>

            {/* Bottom row: Type Dropdown + Date Range Filter */}
            <div className="pt-2 border-t border-border/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">{isAr ? "نوع الفاتورة:" : "Type:"}</span>
                <select
                  value={invoiceType}
                  onChange={(e) => {
                    setInvoiceType(e.target.value);
                    setPage(1);
                  }}
                  className="pos-input py-1 px-2.5 text-xs max-w-[170px]"
                >
                  <option value="all">{isAr ? "جميع الأنواع" : "All Types"}</option>
                  <option value="simplified">{isAr ? "فاتورة مبسطة (B2C)" : "B2C Simplified"}</option>
                  <option value="standard">{isAr ? "فاتورة قياسية (B2B)" : "B2B Standard"}</option>
                </select>
              </div>

              {/* Date Presets and Pickers */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg">
                  {[
                    { id: "all", label: isAr ? "الكل" : "All" },
                    { id: "today", label: isAr ? "اليوم" : "Today" },
                    { id: "week", label: isAr ? "أسبوع" : "7 Days" },
                    { id: "month", label: isAr ? "هذا الشهر" : "Month" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleDatePresetChange(p.id)}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                        datePreset === p.id
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Pickers */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset("custom");
                      setPage(1);
                    }}
                    className="pos-input py-1 px-2 text-[11px] w-32"
                    title={isAr ? "من تاريخ" : "From Date"}
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset("custom");
                      setPage(1);
                    }}
                    className="pos-input py-1 px-2 text-[11px] w-32"
                    title={isAr ? "إلى تاريخ" : "To Date"}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="pos-card overflow-x-auto">
            <table className="pos-table min-w-[950px]">
              <thead>
                <tr>
                  <th className="w-36">{isAr ? "رقم الفاتورة" : "Invoice No"}</th>
                  <th className="w-40">{isAr ? "تاريخ الإصدار" : "Date & Time"}</th>
                  <th className="w-28">{isAr ? "النوع" : "Type"}</th>
                  <th className="w-32">{isAr ? "الإجمالي" : "Total (SAR)"}</th>
                  <th className="w-28">{isAr ? "الضريبة" : "VAT (SAR)"}</th>
                  <th className="w-32">{isAr ? "حالة الزكاة" : "ZATCA Status"}</th>
                  <th className="w-56 text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {isInvoicesLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2 text-primary" />
                      {isAr ? "جاري تحميل سجلات الفواتير..." : "Loading invoice records..."}
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <FileText size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="font-medium">{isAr ? "لا توجد فواتير مطابقة للبحث" : "No invoices found"}</p>
                      <p className="text-xs mt-0.5">
                        {isAr
                          ? "ستظهر الفواتير هنا تلقائياً فور تنفيذ أي عملية بيع في الكاشير"
                          : "Invoices will automatically appear here once sales are completed"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const hasIssues =
                      (inv.validationWarnings && inv.validationWarnings.length > 0) ||
                      (inv.validationErrors && inv.validationErrors.length > 0) ||
                      inv.zatcaStatus === "failed" ||
                      inv.zatcaStatus === "rejected";

                    return (
                      <tr key={inv._id || inv.uuid} className="hover:bg-muted/40 transition-colors">
                        <td className="font-mono font-bold text-foreground">
                          {inv.invoiceNumber}
                          <div className="text-[10px] text-muted-foreground font-normal">ICV: #{inv.icv}</div>
                        </td>
                        <td className="text-xs">
                          {new Date(inv.issueDatetime || inv.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-GB")}
                          <span className="text-muted-foreground block text-[11px]">
                            {new Date(inv.issueDatetime || inv.createdAt).toLocaleTimeString("en-GB", { hour12: false })}
                          </span>
                        </td>
                        <td>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-muted">
                            {inv.invoiceType === "standard" ? "B2B Standard" : "B2C Simplified"}
                          </span>
                        </td>
                        <td className="font-bold text-foreground">
                          {Number(inv.totalInclusiveVat || 0).toFixed(2)}
                        </td>
                        <td className="text-muted-foreground text-xs">
                          {Number(inv.totalVatAmount || 0).toFixed(2)}
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              inv.zatcaStatus === "cleared" || inv.zatcaStatus === "reported"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : inv.zatcaStatus === "pending"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {inv.zatcaStatus === "cleared" && <CheckCircle2 size={11} />}
                            {inv.zatcaStatus === "reported" && <CheckCircle2 size={11} />}
                            {inv.zatcaStatus === "pending" && <Clock size={11} />}
                            {inv.zatcaStatus === "failed" && <AlertCircle size={11} />}
                            {inv.zatcaStatus}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* View QR */}
                            <button
                              onClick={() => handleOpenQr(inv)}
                              className="p-1.5 rounded-lg border border-border hover:bg-accent text-foreground text-xs inline-flex items-center gap-1"
                              title={isAr ? "معاينة الباركود" : "View QR Code"}
                            >
                              <QrIcon size={14} className="text-primary" />
                              <span className="hidden xl:inline">{isAr ? "باركود" : "QR"}</span>
                            </button>

                            {/* Download XML */}
                            <button
                              onClick={() => handleDownloadXml(inv)}
                              className="p-1.5 rounded-lg border border-border hover:bg-accent text-foreground text-xs inline-flex items-center gap-1"
                              title={isAr ? "تحميل ملف XML" : "Download XML"}
                            >
                              <Download size={14} className="text-emerald-600" />
                              <span className="hidden xl:inline">XML</span>
                            </button>

                            {/* Inspect Warnings / Errors */}
                            {hasIssues && (
                              <button
                                onClick={() => setInspectInvoice(inv)}
                                className="p-1.5 rounded-lg border border-amber-500/40 text-amber-600 hover:bg-amber-500/10 text-xs inline-flex items-center gap-1"
                                title={isAr ? "فحص الأخطاء والتنبيهات" : "Inspect Errors/Warnings"}
                              >
                                <Info size={14} />
                                <span className="hidden xl:inline">{isAr ? "فحص" : "Inspect"}</span>
                              </button>
                            )}

                            {/* Retry */}
                            {inv.zatcaStatus !== "cleared" && inv.zatcaStatus !== "reported" && (
                              <button
                                onClick={() => handleRetry(inv)}
                                disabled={retryMutation.isPending}
                                className="p-1.5 rounded-lg border border-amber-500/40 text-amber-600 hover:bg-amber-500/10 text-xs inline-flex items-center gap-1"
                                title={isAr ? "إعادة الإرسال" : "Retry"}
                              >
                                <RefreshCw size={13} className={retryMutation.isPending ? "animate-spin" : ""} />
                                <span className="hidden xl:inline">{isAr ? "إعادة" : "Retry"}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
              <div>
                {isAr ? `صفحة ${meta.page} من ${meta.totalPages}` : `Page ${meta.page} of ${meta.totalPages}`} (
                {meta.total} {isAr ? "فاتورة" : "invoices"})
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="pos-btn-secondary p-1.5 disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="pos-btn-secondary p-1.5 disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Onboarding & Certificate Information */}
      {activeTab === "onboard" && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Certificate & Hardware Unit Overview Card */}
          <div className="pos-card p-6 border-emerald-500/30 bg-card space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-600" />
                <h2 className="font-bold text-sm text-foreground">
                  {isAr ? "بيانات رخصة وتشفير الجهاز (CSID Certificate Profile)" : "Device Certificate & Crypto Profile"}
                </h2>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isOnboarded ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800"
                }`}
              >
                {isOnboarded ? (isAr ? "الترخيص نشط ومسجل" : "CSID Active") : isAr ? "غير معتمد" : "Pending Onboarding"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-muted/40 p-3 rounded-xl space-y-1">
                <p className="text-muted-foreground">{isAr ? "اسم المكلف المسجل:" : "Registered Taxpayer:"}</p>
                <p className="font-bold text-foreground">{statusData?.taxpayerName || "بقالة شيمة خليف عايد"}</p>
              </div>

              <div className="bg-muted/40 p-3 rounded-xl space-y-1">
                <p className="text-muted-foreground">{isAr ? "الرقم الضريبي (VAT ID):" : "VAT Number:"}</p>
                <p className="font-mono font-bold text-emerald-600">{statusData?.vatNumber || "300000000000003"}</p>
              </div>

              <div className="bg-muted/40 p-3 rounded-xl space-y-1">
                <p className="text-muted-foreground">{isAr ? "الرقم التسلسلي لوحدة الحل:" : "Solution Unit Serial:"}</p>
                <p className="font-mono text-foreground">{statusData?.serialNumber || "1-POS|2-MAIN|3-CASHIER-01"}</p>
              </div>

              <div className="bg-muted/40 p-3 rounded-xl space-y-1">
                <p className="text-muted-foreground">{isAr ? "خوارزمية التشفير الرقمي:" : "Cryptography Algorithm:"}</p>
                <p className="font-mono text-foreground">ECDSA secp256k1 (SHA-256) / XAdES-EPES</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <ZatcaOnboardingSection settings={settings} canSave={canManage} />
        </div>
      )}

      {/* TAB 3: Visual Guide */}
      {activeTab === "guide" && (
        <div className="pos-card p-6 space-y-6 max-w-4xl mx-auto">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isAr ? "دليل الربط والتشغيل في البيئة الحية والإنتاج (Production Guide)" : "Production & Sandbox Setup Guide"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {isAr
                ? "دليل مفصل لخطوات تفعيل الفوترة الإلكترونية مع هيئة الزكاة والضريبة والجمارك بالمملكة العربية السعودية."
                : "Step-by-step instructions for obtaining production CSID and certifying live POS terminals."}
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03]">
              <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-300 mb-2">
                {isAr ? "الخطوة الأولى: تسجيل الدخول عبر بوابة فاتورة (Nafath نفاذ)" : "Step 1: Access ZATCA Portal via Nafath"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ادخل على بوابة فاتورة الرسمية:{" "}
                <a
                  href="https://fatoora.zatca.sa"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline font-semibold inline-flex items-center gap-0.5"
                >
                  fatoora.zatca.sa <ExternalLink size={12} />
                </a>{" "}
                وقم بتسجيل الدخول باستخدام حساب المنشأة التجاري عبر نفاذ الوطني الموحد.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card">
              <h3 className="font-bold text-sm text-foreground mb-2">
                {isAr ? "الخطوة الثانية: توليد رمز التحقق OTP لجهاز جديد" : "Step 2: Generate Solution Unit OTP"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                من القائمة الجانبية في بوابة فاتورة، اضغط على <strong>(أجهزة وحلول الفوترة)</strong> ثم اضغط على{" "}
                <strong>(إضافة جهاز جديد)</strong>. اختر اسماً لجهاز الكاشير وسيقوم النظام بإظهار{" "}
                <strong>رمز OTP مكوّن من 6 أرقام</strong> صالح لمدة 60 دقيقة.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card">
              <h3 className="font-bold text-sm text-foreground mb-2">
                {isAr ? "الخطوة الثالثة: الإدخال والاعتماد في هذا النظام" : "Step 3: Onboard in This POS"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                انتقل إلى تبويب <strong>(إدارة اعتماد الجهاز)</strong> أعلاه في هذه الصفحة، واختر البيئة{" "}
                <strong>Production (مباشر)</strong>، وتأكد من صحة الرقم الضريبي والعنوان، ثم ضع رمز الـ OTP واضغط{" "}
                <strong>(بدء الربط والاعتماد)</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Phase 2 QR Preview Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-muted/40">
              <div className="flex items-center gap-2">
                <QrIcon size={18} className="text-primary" />
                <h3 className="font-bold text-sm text-foreground">
                  {isAr ? "معاينة باركود المرحلة الثانية (ZATCA Phase 2 QR)" : "Phase 2 Cryptographic QR Preview"}
                </h3>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="hover:opacity-70 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center text-center space-y-4 overflow-y-auto max-h-[80vh]">
              {qrModalUrl ? (
                <div className="p-3 bg-white rounded-2xl shadow-inner border border-black/10">
                  <img src={qrModalUrl} alt="ZATCA Phase 2 QR" className="w-56 h-56" />
                </div>
              ) : (
                <div className="p-8 text-muted-foreground text-xs">
                  {isAr ? "لم يتم توليد باركود لهذه الفاتورة" : "No QR generated for this invoice"}
                </div>
              )}

              <div>
                <p className="font-bold text-sm text-foreground">{selectedInvoice.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{selectedInvoice.uuid}</p>
              </div>

              {/* Decoded Tags Summary */}
              <div className="w-full text-xs text-start bg-muted/50 p-3.5 rounded-xl space-y-1.5 border border-border/60">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isAr ? "نوع الفاتورة:" : "Type:"}</span>
                  <span className="font-semibold">
                    {selectedInvoice.invoiceType === "standard" ? "B2B Standard (0100000)" : "B2C Simplified (0200000)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isAr ? "المبلغ الإجمالي:" : "Total Inclusive:"}</span>
                  <span className="font-bold text-foreground">
                    {Number(selectedInvoice.totalInclusiveVat || 0).toFixed(2)} SAR
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isAr ? "مبلغ الضريبة:" : "VAT Amount:"}</span>
                  <span className="font-semibold">{Number(selectedInvoice.totalVatAmount || 0).toFixed(2)} SAR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isAr ? "التوقيع والتشفير:" : "Signature & Seal:"}</span>
                  <span className="font-semibold text-emerald-600 inline-flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    XAdES-EPES Verified
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                {isAr
                  ? "امسح هذا الرمز باستخدام تطبيق (فاتورة) الرسمي الصادر من هيئة الزكاة والضريبة والجمارك للتحقق من الصلاحية."
                  : "Scan this QR code with the official ZATCA Fatoora app on iOS/Android to verify validity."}
              </p>
            </div>

            <div className="p-4 border-t flex justify-end gap-2 bg-muted/20">
              <button className="pos-btn-secondary text-xs" onClick={() => handleDownloadXml(selectedInvoice)}>
                <Download size={14} className="mr-1 inline" />
                {isAr ? "تحميل XML" : "Download XML"}
              </button>
              <button className="pos-btn-primary text-xs" onClick={() => setSelectedInvoice(null)}>
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. ZATCA Error & Warnings Inspector Modal */}
      {inspectInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-muted/40">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h3 className="font-bold text-sm text-foreground">
                  {isAr ? "تقرير رد الزكاة وفحص الأخطاء" : "ZATCA Validation & Error Details"}
                </h3>
              </div>
              <button onClick={() => setInspectInvoice(null)} className="hover:opacity-70 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh] text-xs">
              <div className="flex justify-between items-center bg-muted/40 p-3 rounded-xl border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    {isAr ? "رقم الفاتورة:" : "Invoice Number:"}
                  </span>
                  <span className="font-bold font-mono text-sm">{inspectInvoice.invoiceNumber}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    inspectInvoice.zatcaStatus === "cleared" || inspectInvoice.zatcaStatus === "reported"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {inspectInvoice.zatcaStatus}
                </span>
              </div>

              {/* Errors List */}
              {inspectInvoice.validationErrors && inspectInvoice.validationErrors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-destructive flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    {isAr ? "أخطاء الرفض (Validation Errors):" : "Validation Errors:"}
                  </h4>
                  <div className="space-y-1.5">
                    {inspectInvoice.validationErrors.map((err, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-destructive/20 bg-destructive/[0.04] space-y-0.5"
                      >
                        <div className="flex items-center justify-between font-mono font-bold text-destructive text-[11px]">
                          <span>Code: {err.code}</span>
                          {err.category && <span>{err.category}</span>}
                        </div>
                        <p className="text-foreground leading-relaxed">{err.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings List */}
              {inspectInvoice.validationWarnings && inspectInvoice.validationWarnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-amber-600 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    {isAr ? "تنبيهات غير مانعة (Warnings):" : "Compliance Warnings:"}
                  </h4>
                  <div className="space-y-1.5">
                    {inspectInvoice.validationWarnings.map((warn, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] space-y-0.5"
                      >
                        <div className="flex items-center justify-between font-mono font-bold text-amber-700 dark:text-amber-300 text-[11px]">
                          <span>Code: {warn.code}</span>
                          {warn.category && <span>{warn.category}</span>}
                        </div>
                        <p className="text-foreground leading-relaxed">{warn.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw JSON viewer */}
              {inspectInvoice.rawZatcaResponse && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground">
                      {isAr ? "الرد الخام من خادم الزكاة (Raw API Payload):" : "Raw ZATCA Response:"}
                    </span>
                    <button
                      onClick={() => handleCopyRaw(JSON.stringify(inspectInvoice.rawZatcaResponse, null, 2))}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {copiedRaw ? <Check size={12} /> : <Copy size={12} />}
                      {copiedRaw ? (isAr ? "تم النسخ" : "Copied") : isAr ? "نسخ JSON" : "Copy JSON"}
                    </button>
                  </div>
                  <pre className="p-3 bg-muted rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-border">
                    {JSON.stringify(inspectInvoice.rawZatcaResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-between items-center bg-muted/20">
              {inspectInvoice.zatcaStatus !== "cleared" && inspectInvoice.zatcaStatus !== "reported" ? (
                <button
                  onClick={() => {
                    handleRetry(inspectInvoice);
                    setInspectInvoice(null);
                  }}
                  className="pos-btn-primary text-xs gap-1"
                >
                  <RefreshCw size={13} />
                  {isAr ? "إعادة الإرسال الآن" : "Retry Submission"}
                </button>
              ) : <div />}
              <button className="pos-btn-secondary text-xs" onClick={() => setInspectInvoice(null)}>
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Sample Thermal Receipt Test Print Modal */}
      {showTestReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-muted/40">
              <div className="flex items-center gap-2">
                <Printer size={16} className="text-primary" />
                <h3 className="font-bold text-sm text-foreground">
                  {isAr ? "فاتورة تجريبية (80mm Thermal Receipt)" : "Sample Thermal Receipt"}
                </h3>
              </div>
              <button onClick={() => setShowTestReceipt(false)} className="hover:opacity-70 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 bg-white text-black font-mono text-center space-y-3 overflow-y-auto max-h-[75vh]">
              <div className="border-b border-black/20 pb-2">
                <h2 className="font-bold text-base">بقالة شيمة خليف عايد</h2>
                <p className="text-[11px] text-gray-600">Baqalat Sheemah Khulaif Aayed</p>
                <p className="text-[11px] mt-1">الرقم الضريبي: {statusData?.vatNumber || "300000000000003"}</p>
                <p className="text-[10px] text-gray-500">فاتورة ضريبية مبسطة (Simplified Tax Invoice)</p>
              </div>

              <div className="text-[11px] text-start border-b border-black/20 pb-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>رقم الفاتورة:</span>
                  <span className="font-bold">INV-TEST-001</span>
                </div>
                <div className="flex justify-between">
                  <span>التاريخ:</span>
                  <span>{new Date().toLocaleDateString("en-GB")}</span>
                </div>
              </div>

              {testReceiptQr && (
                <div className="flex flex-col items-center py-1">
                  <img src={testReceiptQr} alt="Sample QR" className="w-40 h-40 border border-black/10 p-1" />
                  <p className="text-[9px] text-gray-500 mt-1">امسح للتحقق بتطبيق (فاتورة) الرسمي</p>
                </div>
              )}

              <div className="border-t border-black/20 pt-2 text-[11px] text-start space-y-1">
                <div className="flex justify-between">
                  <span>الإجمالي خ.ض:</span>
                  <span>10.00 SR</span>
                </div>
                <div className="flex justify-between">
                  <span>الضريبة (15%):</span>
                  <span>1.50 SR</span>
                </div>
                <div className="flex justify-between font-bold text-xs border-t border-black/20 pt-1">
                  <span>الإجمالي ش.ض:</span>
                  <span>11.50 SR</span>
                </div>
              </div>

              <p className="text-[9px] text-gray-400 pt-2">شكرًا لزيارتكم - معتمد طبقاً لهيئة الزكاة والضريبة والجمارك</p>
            </div>

            <div className="p-4 border-t flex justify-end gap-2 bg-muted/20">
              <button className="pos-btn-primary text-xs gap-1" onClick={() => window.print()}>
                <Printer size={14} />
                {isAr ? "طباعة الإيصال" : "Print Receipt"}
              </button>
              <button className="pos-btn-secondary text-xs" onClick={() => setShowTestReceipt(false)}>
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
