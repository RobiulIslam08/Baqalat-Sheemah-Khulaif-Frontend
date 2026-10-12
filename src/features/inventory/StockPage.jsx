import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useStock } from "@/hooks/useStock";
import { Search, ClipboardCheck, Loader2 } from "lucide-react";

export default function StockPage() {
  const { t, lang } = useLanguage();
  const [keyword, setKeyword] = useState("");
  const [warehouse, setWarehouse] = useState(""); // Default to "All"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const PAGE_SIZE = 100;
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useState({ page: 1, limit: PAGE_SIZE });

  const { data, isLoading } = useStock(searchParams);
  const stockItems = data?.stock || [];
  const meta = data?.meta || {};
  const totalRecords = Number(meta.total || meta.totalRecords || meta.count || meta.totalCount || meta.totalItems || 0);
  const totalPages = Math.max(1, Math.ceil((totalRecords || 0) / PAGE_SIZE));
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  console.log(stockItems)

  const handleSearch = () => {
    const p = {};
    if (keyword.trim()) p.searchTerm = keyword;
    if (warehouse) p.warehouse = warehouse;
    if (fromDate) p.fromDate = fromDate;
    if (toDate) p.toDate = toDate;
    setSearchParams({ ...p, page: 1, limit: PAGE_SIZE });
    setPage(1);
  };

  const handleKeywordChange = (value) => {
    setKeyword(value);
    if (!value.trim()) {
      // Auto-trigger search when user clears the search keyword
      setSearchParams((prev) => {
        const copy = { ...prev };
        delete copy.searchTerm;
        return copy;
      });
    }
  };

  const handlePrintCountSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <h2 className="pos-page-title">{t("inv.stock")}</h2>
      <div className="pos-card p-4 grid grid-cols-1 md:grid-cols-5 gap-3 print:hidden">
        <input
          className="pos-input"
          placeholder={lang === "ar" ? "كلمة المنتج" : "Product Keyword"}
          value={keyword}
          onChange={(e) => handleKeywordChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <select
          className="pos-select"
          value={warehouse}
          onChange={(e) => setWarehouse(e.target.value)}
        >
          <option value="">{lang === "ar" ? "كل المستودعات / المواقع" : "All Warehouses / Locations"}</option>
          <option value="Main Warehouse">Main Warehouse</option>
          <option value="Secondary Warehouse">Secondary Warehouse</option>
        </select>
        <input
          className="pos-input"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          title={lang === "ar" ? "من تاريخ" : "From Date"}
        />
        <input
          className="pos-input"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          title={lang === "ar" ? "إلى تاريخ" : "To Date"}
        />
        <button
          className="pos-btn-primary gap-1"
          onClick={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {lang === "ar" ? "بحث" : "Search"}
        </button>
      </div>

      <div className="pos-card overflow-x-auto" id="stock-print-area">
        <div className="hidden print:block p-4 border-b">
          <h1 className="text-xl font-bold text-center">{lang === "ar" ? "ورقة الجرد" : "Stock Count Sheet"}</h1>
          <p className="text-center text-sm">{new Date().toLocaleString()}</p>
          {warehouse && <p className="text-center text-xs">Warehouse: {warehouse}</p>}
        </div>
        <table className="pos-table min-w-[900px]">
          <thead>
              <tr>
                <th>#</th>
                <th>{t("sales.code")}</th>
                <th>{lang === "ar" ? "المنتج" : "Product"}</th>
                <th>{t("sales.batchCode")}</th>
                <th>{t("sales.expiryDate")}</th>
                <th>{lang === "ar" ? "الكمية" : "Qty"}</th>
                <th className="print:hidden">{t("addProduct.storage")}</th>
                <th className="hidden print:table-cell w-32">{lang === "ar" ? "العد الفعلي" : "Actual Count"}</th>
              </tr>
            </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <Loader2 size={20} className="animate-spin inline-block" />
                </td>
              </tr>
            ) : stockItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">
                  {lang === "ar" ? "لا توجد بيانات" : "No stock data"}
                </td>
              </tr>
              ) : (
              stockItems.map((s, i) => (
                <tr key={s._id || i}>
                  <td>{startRecord + i}</td>
                  <td>{s.productCode || s.code}</td>
                  <td>{lang === "ar" ? (s.arabicName || s.productName || s.product) : (s.productName || s.product)}</td>
                  <td>{s.batchCode || "—"}</td>
                  <td>{(() => {
                    if (!s.expiryDate) return "—";
                    try {
                      return new Date(s.expiryDate).toISOString().split("T")[0];
                    } catch (e) {
                      return "—";
                    }
                  })()}</td>
                  <td className="font-bold">{s.quantity}</td>
                  <td className="print:hidden">{s.storage || s.location || "—"}</td>
                  <td className="hidden print:table-cell border-l border-dashed"></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="p-3 flex items-center justify-between print:hidden">
          <button className="pos-btn-secondary gap-1" onClick={handlePrintCountSheet}>
            <ClipboardCheck size={14} /> {lang === "ar" ? "ورقة الجرد" : "Count Sheet"}
          </button>
          <div className="flex items-center gap-2">
            <button className="pos-btn-secondary" onClick={() => { setPage(1); setSearchParams((p) => ({ ...p, page: 1, limit: PAGE_SIZE })); }} disabled={page === 1}>First</button>
            <button className="pos-btn-secondary" onClick={() => { setPage((q) => Math.max(1, q - 1)); setSearchParams((p) => ({ ...p, page: Math.max(1, page - 1), limit: PAGE_SIZE })); }} disabled={page === 1}>Prev</button>
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
            <button className="pos-btn-secondary" onClick={() => { setPage((q) => Math.min(totalPages, q + 1)); setSearchParams((p) => ({ ...p, page: Math.min(totalPages, page + 1), limit: PAGE_SIZE })); }} disabled={page === totalPages}>Next</button>
            <button className="pos-btn-secondary" onClick={() => { setPage(totalPages); setSearchParams((p) => ({ ...p, page: totalPages, limit: PAGE_SIZE })); }} disabled={page === totalPages}>Last</button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #stock-print-area, #stock-print-area * { visibility: visible; }
          #stock-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}