import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProducts } from "@/hooks/useProducts";
import { useGenerateBarcode, useBarcodeJobs } from "@/hooks/useBarcodes";
import { Printer, Wand2, Loader2 } from "lucide-react";
import JsBarcode from "jsbarcode";

/**
 * Single barcode label component — renders an SVG barcode via JsBarcode.
 */
function BarcodeLabel({ value, productCode, productName, index }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 11,
          margin: 4,
          textMargin: 2,
          background: "#ffffff",
        });
      } catch {
        // If barcode value is invalid for the format, show fallback
        if (svgRef.current) {
          svgRef.current.innerHTML = "";
        }
      }
    }
  }, [value]);

  return (
    <div className="barcode-label">
      <div className="barcode-label-name">{productName || productCode}</div>
      <svg ref={svgRef} />
    </div>
  );
}

export default function BarcodePage() {
  const { t, lang } = useLanguage();
  const { user } = useAuthContext();
  const operatorRole = user?.role || "admin";
  const canPrint = operatorRole !== "cashier";

  const { data: prodData } = useProducts({ limit: 5000 });
  const allProducts = prodData?.products || [];

  const generateBarcode = useGenerateBarcode();
  const { data: jobsData, isLoading: jobsLoading } = useBarcodeJobs();
  const jobs = jobsData?.jobs || [];

  const [form, setForm] = useState({
    productCode: "",
    barcodeValue: "",
    labelCount: "12",
    paperSize: "40x25",
    printType: "Sticker",
    printer: "Zebra-ZD220",
  });
  const [productName, setProductName] = useState("");
  const [errors, setErrors] = useState({});
  const [generatedLabels, setGeneratedLabels] = useState([]);

  useEffect(() => {
    if (!allProducts.length || !form.productCode) return;
    const found = allProducts.find((p) => p.productCode === form.productCode || p.productId === form.productCode);
    if (found) {
      setProductName(lang === "ar" ? (found.arabicName || found.productName) : found.productName);
    }
  }, [lang, allProducts, form.productCode]);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Auto-lookup product when code changes
    if (key === "productCode") {
      const found = allProducts.find((p) => p.productCode === value || p.productId === value);
      if (found) {
        setProductName(lang === "ar" ? (found.arabicName || found.productName) : found.productName);
        // Auto-fill barcode value with product code if empty
        if (!form.barcodeValue) {
          setForm((prev) => ({ ...prev, productCode: value, barcodeValue: found.productCode }));
        }
      } else {
        setProductName("");
      }
    }
  };

  const validate = () => {
    const next = {};
    if (!form.productCode.trim()) next.productCode = lang === "ar" ? "كود المنتج مطلوب" : "Product code is required";
    if (!form.labelCount || Number(form.labelCount) <= 0) next.labelCount = lang === "ar" ? "عدد الملصقات غير صالح" : "Label count must be at least 1";
    if (Number(form.labelCount) > 80) next.labelCount = lang === "ar" ? "الحد الأقصى 80 ملصق" : "Maximum 80 labels";
    if (!form.printer.trim()) next.printer = lang === "ar" ? "اسم الطابعة مطلوب" : "Printer name is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleGenerate = () => {
    if (!validate()) return;

    const count = Math.min(Number(form.labelCount) || 12, 80);
    const barcodeVal = form.barcodeValue.trim() || form.productCode.trim();

    // Generate labels locally for preview
    const labels = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      productCode: form.productCode,
      productName: productName,
      barcodeValue: barcodeVal,
    }));
    setGeneratedLabels(labels);

    // Save job to backend
    generateBarcode.mutate({
      productCode: form.productCode.trim(),
      barcodeValue: barcodeVal,
      labelCount: count,
      paperSize: form.paperSize,
      printType: form.printType,
      printer: form.printer.trim(),
    });
  };

  const handlePrint = () => {
    if (!canPrint || generatedLabels.length === 0) return;
    window.print();
  };

  return (
    <div className="space-y-4">
      <h2 className="pos-page-title">{t("nav.barcode")}</h2>

      {/* Form */}
      <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="pos-label">{lang === "ar" ? "كود المنتج" : "Product Code"}</label>
          <input className="pos-input" placeholder={lang === "ar" ? "أدخل كود المنتج" : "Enter product code"} value={form.productCode} onChange={(e) => update("productCode", e.target.value)} />
          {productName && <p className="text-xs text-primary mt-1">{productName}</p>}
          {errors.productCode && <p className="text-destructive text-xs mt-1">{errors.productCode}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "قيمة الباركود" : "Barcode Value"}</label>
          <input className="pos-input" placeholder={lang === "ar" ? "تلقائي إن فارغ" : "Auto from product code if empty"} value={form.barcodeValue} onChange={(e) => update("barcodeValue", e.target.value)} />
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "عدد الملصقات" : "Label Count"}</label>
          <input className="pos-input" type="number" min="1" max="80" value={form.labelCount} onChange={(e) => update("labelCount", e.target.value)} />
          {errors.labelCount && <p className="text-destructive text-xs mt-1">{errors.labelCount}</p>}
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "حجم الورق" : "Paper Size"}</label>
          <select className="pos-select" value={form.paperSize} onChange={(e) => update("paperSize", e.target.value)}>
            <option>40x25</option><option>50x25</option><option>50x30</option><option>A4</option>
          </select>
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "نوع الطباعة" : "Print Type"}</label>
          <select className="pos-select" value={form.printType} onChange={(e) => update("printType", e.target.value)}>
            <option>Sticker</option><option>Sheet</option><option>Roll</option>
          </select>
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "الطابعة" : "Printer"}</label>
          <input className="pos-input" value={form.printer} onChange={(e) => update("printer", e.target.value)} />
          {errors.printer && <p className="text-destructive text-xs mt-1">{errors.printer}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <button className="pos-btn-secondary gap-1" onClick={handleGenerate} disabled={generateBarcode.isPending}>
          {generateBarcode.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} {lang === "ar" ? "توليد" : "Generate"}
        </button>
        <button className="pos-btn-primary gap-1" onClick={handlePrint} disabled={!canPrint || generatedLabels.length === 0}>
          <Printer size={14} /> {lang === "ar" ? "طباعة" : "Print"}
        </button>
      </div>

      {/* Barcode Preview Grid */}
      {generatedLabels.length > 0 && (
        <div className="pos-card" id="barcode-print-area">
          <div className="p-3 border-b border-border text-sm text-muted-foreground flex justify-between">
            <span>{lang === "ar" ? "معاينة الباركود" : "Barcode Preview"} — {generatedLabels.length} {lang === "ar" ? "ملصق" : "labels"}</span>
            <span>{form.paperSize} | {form.printType}</span>
          </div>
          <div className="barcode-grid">
            {generatedLabels.map((label) => (
              <BarcodeLabel
                key={label.id}
                value={label.barcodeValue}
                productCode={label.productCode}
                productName={label.productName}
                index={label.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Job History */}
      <div className="pos-card overflow-x-auto print:hidden">
        <div className="p-3 border-b border-border text-sm font-medium">{lang === "ar" ? "سجل التوليد" : "Generation History"}</div>
        <table className="pos-table min-w-[700px]">
          <thead><tr><th>#</th><th>{lang === "ar" ? "كود المنتج" : "Product Code"}</th><th>{lang === "ar" ? "الباركود" : "Barcode"}</th><th>{lang === "ar" ? "العدد" : "Count"}</th><th>{lang === "ar" ? "الحجم" : "Size"}</th><th>{lang === "ar" ? "النوع" : "Type"}</th><th>{lang === "ar" ? "التاريخ" : "Date"}</th></tr></thead>
          <tbody>
            {jobsLoading ? <tr><td colSpan={7} className="text-center py-8"><Loader2 size={20} className="animate-spin inline-block" /></td></tr>
              : jobs.length === 0 ? <tr><td colSpan={7} className="text-center text-muted-foreground py-6">{lang === "ar" ? "لا يوجد سجلات" : "No jobs yet"}</td></tr>
                : jobs.map((j, i) => <tr key={j._id}><td>{i + 1}</td><td>{j.productCode}</td><td>{j.barcodeValue}</td><td>{j.labelCount}</td><td>{j.paperSize}</td><td>{j.printType}</td><td>{new Date(j.createdAt).toLocaleDateString()}</td></tr>)}
          </tbody>
        </table>
      </div>

      <style>{`
        .barcode-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 8px;
          padding: 16px;
        }
        .barcode-label {
          border: 1px dashed hsl(var(--border));
          border-radius: 6px;
          padding: 8px 4px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #fff;
        }
        .barcode-label-name {
          font-size: 10px;
          font-weight: 600;
          color: #111;
          text-align: center;
          margin-bottom: 2px;
          max-width: 170px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .barcode-label svg {
          max-width: 170px;
          height: auto;
        }

        /* Print styles */
        @media print {
          body * { visibility: hidden; }
          #barcode-print-area, #barcode-print-area * { visibility: visible; }
          #barcode-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
          }
          .barcode-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
            padding: 8px;
          }
          .barcode-label {
            border: 1px solid #ccc;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}