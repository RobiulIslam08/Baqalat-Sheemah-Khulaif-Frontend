import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCustomers } from "@/hooks/useCustomers";
import { useProducts } from "@/hooks/useProducts";
import { useCreateSale } from "@/hooks/useSales";
import { useSettings } from "@/hooks/useSettings";
import { Plus, Trash2, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { showError } from "@/lib/toast-helpers";
import { printReceipt } from "@/lib/printReceipt";
import { invoiceLanguageOf, receiptDir, receiptItemName, receiptMeta, receiptPayment, receiptQrLabel, receiptSaleType, receiptText, receiptVatLabel } from "./receiptLanguage";

const SCAN_IDLE_MS = 80;

function findProductByCode(products, value) {
  const query = String(value ?? "").trim();
  if (!query) return null;
  return (
    products.find(
      (p) => p.productCode === query || p.productId === query || p.barcodeValue === query
    ) || null
  );
}

function lineFigures(qty, dbPrice, boxQty, type, vatPercent) {
  const quantity = parseFloat(qty) || 0;
  const pieces = quantity * (type === "BOX" ? (parseFloat(boxQty) || 1) : 1);
  const total = pieces * (parseFloat(dbPrice) || 0);
  const rate = parseFloat(vatPercent) || 15;
  const vat = (total / (100 + rate)) * rate;
  const price = quantity ? (total - vat) / quantity : 0;
  return {
    total: total ? total.toFixed(2) : "",
    vat: vat ? vat.toFixed(3) : "",
    price: price ? price.toFixed(2) : "",
  };
}

export default function SalesPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuthContext();
  const { data: custData } = useCustomers();
  const { data: prodData } = useProducts({ limit: 5000 });
  const { data: settings } = useSettings();
  const createSale = useCreateSale();

  const customers = custData?.customers || [];
  const allProducts = prodData?.products || [];

  const emptyRow = (id) => ({ id, code: "", productName: "", type: "SINGLE", quantity: "", dbPrice: "", price: "", vat: "", total: "" });
  const [rows, setRows] = useState([emptyRow(1)]);
  const [customer, setCustomer] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [balance, setBalance] = useState("");
  const [paymentMode, setPaymentMode] = useState("CREDIT CARD");
  const [discount, setDiscount] = useState("");
  const [vatPercent, setVatPercent] = useState("15");
  const [summaryProductName, setSummaryProductName] = useState("");
  const [summaryPrice, setSummaryPrice] = useState("");
  const [summaryRemaining, setSummaryRemaining] = useState("");

  const [printData, setPrintData] = useState(null);
  const [qrBase64, setQrBase64] = useState("");
  const [focusRowId, setFocusRowId] = useState(null);
  const codeInputRefs = useRef({});
  const codeResolveTimers = useRef({});
  const amountPaidEdited = useRef(false);
  const productsRef = useRef(allProducts);
  const langRef = useRef(lang);
  const vatPercentRef = useRef(vatPercent);
  const rowsRef = useRef(rows);
  productsRef.current = allProducts;
  langRef.current = lang;
  vatPercentRef.current = vatPercent;
  rowsRef.current = rows;

  // Cursor starts in the first product code field when the sell page opens
  useEffect(() => {
    codeInputRefs.current[1]?.focus();
  }, []);

  // Auto-focus the product code input of a newly created row
  useEffect(() => {
    if (focusRowId !== null && codeInputRefs.current[focusRowId]) {
      codeInputRefs.current[focusRowId].focus();
      setFocusRowId(null);
    }
  }, [focusRowId, rows]);

  const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
  const discountAmt = parseFloat(discount) || 0;
  // Since row totals are inclusive of VAT, netAmount is simply totalAmount - discountAmt
  const netAmount = totalAmount - discountAmt;
  const vatAmt = (netAmount / (100 + parseFloat(vatPercent))) * parseFloat(vatPercent);

  // Amount Paid follows Total Amount until the cashier types their own figure.
  useEffect(() => {
    if (amountPaidEdited.current) return;
    setAmountPaid(totalAmount > 0 ? totalAmount.toFixed(2) : "");
  }, [totalAmount]);

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
        const found = findProductByCode(allProducts, row.code);
        if (found) {
          const translatedName = lang === "ar" ? (found.arabicName || found.productName) : found.productName;
          return { ...row, productName: translatedName };
        }
        return row;
      })
    );
    if (summaryProductName) {
      const found = allProducts.find((p) => p.productName === summaryProductName || p.arabicName === summaryProductName);
      if (found) {
        setSummaryProductName(lang === "ar" ? (found.arabicName || found.productName) : found.productName);
      }
    }
  }, [lang, allProducts]);

  useEffect(() => () => {
    Object.values(codeResolveTimers.current).forEach((timer) => clearTimeout(timer));
  }, []);

  // Match only after the scan or typing has finished, so a short product id
  // cannot rewrite the field while the rest of the barcode is still arriving.
  const resolveCode = (id, rawValue) => {
    const value = String(rawValue ?? "");
    const pending = rowsRef.current.find((r) => r.id === id);
    // Ignore a timer for an older, shorter value. A newer value may start
    // with the state if Enter arrives before the last keystroke is committed.
    if (pending && pending.code !== value && !value.startsWith(pending.code)) return;

    const currentLang = langRef.current;
    const rate = vatPercentRef.current;
    const foundProduct = findProductByCode(productsRef.current, value);

    if (foundProduct) {
      setSummaryProductName(currentLang === "ar" ? (foundProduct.arabicName || foundProduct.productName) : foundProduct.productName);
      setSummaryPrice(String(foundProduct.sellingPrice));
      setSummaryRemaining(String(foundProduct.quantity));
    } else {
      setSummaryProductName("");
      setSummaryPrice("");
      setSummaryRemaining("");
    }

    setRows((prev) => {
      const row = prev.find((r) => r.id === id);
      if (!row || (row.code !== value && !value.startsWith(row.code))) return prev;

      if (!foundProduct) {
        return prev.map((r) => (
          r.id === id
            ? { ...r, code: value, productName: "", dbPrice: "", price: "", vat: "", total: "" }
            : r
        ));
      }

      const existingRow = prev.find((r) => r.id !== id && r.code === foundProduct.productCode);
      if (existingRow) {
        const updatedRows = prev
          .filter((r) => r.id !== id)
          .map((r) => {
            if (r.id !== existingRow.id) return r;
            const newQty = (parseFloat(r.quantity) || 0) + 1;
            const figures = lineFigures(newQty, r.dbPrice, r.boxQty, r.type, rate);
            return { ...r, quantity: String(newQty), ...figures };
          });

        const lastRow = updatedRows[updatedRows.length - 1];
        if (!lastRow || lastRow.code) {
          const nextId = updatedRows.length > 0 ? Math.max(...updatedRows.map((r) => r.id)) + 1 : 1;
          updatedRows.push(emptyRow(nextId));
          setTimeout(() => setFocusRowId(nextId), 0);
        } else {
          setTimeout(() => setFocusRowId(lastRow.id), 0);
        }
        return updatedRows;
      }

      const newRows = prev.map((r) => {
        if (r.id !== id) return r;
        const quantity = r.quantity || "1";
        const dbPrice = String(foundProduct.sellingPrice || "");
        const boxQty = String(foundProduct.boxQty || 1);
        const type = r.type || "SINGLE";
        return {
          ...r,
          code: foundProduct.productCode,
          productName: currentLang === "ar" ? (foundProduct.arabicName || foundProduct.productName) : foundProduct.productName,
          dbPrice,
          boxQty,
          quantity,
          type,
          ...lineFigures(quantity, dbPrice, boxQty, type, rate),
        };
      });

      if (newRows[newRows.length - 1].id === id) {
        const nextId = newRows.length > 0 ? Math.max(...newRows.map((r) => r.id)) + 1 : 1;
        newRows.push(emptyRow(nextId));
        setTimeout(() => setFocusRowId(nextId), 0);
      }

      return newRows;
    });
  };

  const handleCodeChange = (id, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, code: value } : r)));
    clearTimeout(codeResolveTimers.current[id]);
    codeResolveTimers.current[id] = setTimeout(() => resolveCode(id, value), SCAN_IDLE_MS);
  };

  const handleCodeKeyDown = (id, event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    clearTimeout(codeResolveTimers.current[id]);
    resolveCode(id, event.currentTarget.value);
  };

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };

      if (field === "quantity" || field === "type") {
        Object.assign(updated, lineFigures(updated.quantity, updated.dbPrice, updated.boxQty, updated.type, vatPercent));
      } else if (field === "total") {
        updated.total = value;
      }

      return updated;
    }));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow(prev.length > 0 ? Math.max(...prev.map(r => r.id)) + 1 : 1)]);
  const removeRow = (id) => { if (rows.length <= 1) return; setRows((prev) => prev.filter((r) => r.id !== id)); };

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

  const handleSave = (shouldPrint = false) => {
    const validItems = rows.filter((r) => r.code && r.quantity && r.price);
    if (validItems.length === 0) return;
    
    if (discountAmt > totalAmount) {
      showError(null, "Discount cannot exceed the total");
      return;
    }
    const paidBlank = String(amountPaid).trim() === "";
    const paidAmt = paidBlank ? totalAmount : (parseFloat(amountPaid) || 0);
    const finalBalance = paidAmt - netAmount;

    const payload = {
      customer: customer || undefined,
      items: validItems.map((r) => ({
        code: r.code,
        productName: r.productName,
        type: r.type,
        quantity: Number(r.quantity),
        price: Number(r.price),
        vat: Number(r.vat) || 0,
        total: Number(r.total)
      })),
      totalAmount,
      discount: discountAmt,
      vatPercent: Number(vatPercent),
      netAmount,
      amountPaid: paidAmt,
      balance: finalBalance,
      paymentMode,
      createdBy: user?.username || user?.fullName || "system",
    };

    createSale.mutate(payload, {
      onSuccess: async (res) => {
        const savedSale = res?.data || payload;
        
        // Auto-assign properties if backend leaves them empty
        if (!savedSale.billNo) {
          savedSale.billNo = "TEMP-" + Math.floor(Math.random() * 90000 + 10000);
        }
        if (!savedSale.createdAt) {
          savedSale.createdAt = new Date().toISOString();
        }

        if (shouldPrint) {
          // 1. Generate ZATCA QR Base64
          try {
            const storeName = settings?.storeName ;
            const vatNo = settings?.vatNumber;
            const vatRate = Number(savedSale.vatPercent || 15);
            const saleVatAmt = (Number(savedSale.netAmount) / (100 + vatRate)) * vatRate;
            
            const qrTlv = generateZatcaTlv(storeName, vatNo, savedSale.createdAt, savedSale.netAmount, saleVatAmt);
            const qrCodeUrl = await QRCode.toDataURL(qrTlv, { width: 140, margin: 1 });
            setQrBase64(qrCodeUrl);
          } catch (err) {
            console.error("ZATCA QR Generation Failed", err);
          }

          // 2. Set Print details
          const matchedCust = customers.find(c => c._id === customer);
          setPrintData({
            ...savedSale,
            customerName: matchedCust ? matchedCust.customerName : (customer || "")
          });

          // 3. Print receipt and reset forms after window triggers
          setTimeout(async () => {
            await printReceipt();
            setPrintData(null);
            setQrBase64("");
            resetForm();
          }, 400);
        } else {
          resetForm();
        }
      },
    });
  };

  const resetForm = () => {
    amountPaidEdited.current = false;
    setRows([emptyRow(1)]);
    setCustomer("");
    setAmountPaid("");
    setBalance("");
    setDiscount("");
    setSummaryProductName("");
    setSummaryPrice("");
    setSummaryRemaining("");
  };

  const invoiceMode = invoiceLanguageOf(settings);
  const nameAlign = invoiceMode === "en" ? "text-left" : "text-right";
  const amountAlign = invoiceMode === "en" ? "text-right" : "text-left";

  return (<div className="space-y-4">
    {/* Summary Bar */}
    <div className="pos-summary-bar">
      <div className="pos-summary-cell pos-summary-cell-header">{t("sales.grandTotal")}</div>
      <div className="pos-summary-cell pos-summary-cell-header">{t("sales.productName")}</div>
      <div className="pos-summary-cell pos-summary-cell-header hidden md:block">{t("sales.productPrice")}</div>
      <div className="pos-summary-cell pos-summary-cell-header hidden md:block">{t("sales.remainingQty")}</div>
    </div>
    <div className="pos-summary-bar">
      <div className="pos-summary-cell pos-summary-cell-value">{t("common.sr")} {netAmount.toFixed(2)}</div>
      <div className="pos-summary-cell pos-summary-cell-value text-foreground text-sm">{summaryProductName}</div>
      <div className="pos-summary-cell pos-summary-cell-value text-foreground text-sm hidden md:block">{summaryPrice}</div>
      <div className="pos-summary-cell pos-summary-cell-value text-foreground text-sm hidden md:block">{summaryRemaining}</div>
    </div>

    {/* Customer Selection */}
    <div className="pos-card p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <label className="pos-label whitespace-nowrap mb-0">{t("sales.customer")}</label>
        <select value={customer} onChange={(e) => setCustomer(e.target.value)} className="pos-select max-w-sm">
          <option value="">—</option>
          {customers.map((c) => <option key={c._id} value={c._id}>{c.customerName} ({c.customerCode})</option>)}
        </select>
      </div>
    </div>

    {/* Items Table */}
    <div className="pos-card overflow-x-auto">
      <table className="pos-table min-w-[900px]">
        <thead><tr>
          <th className="w-14">{t("sales.slNo")}</th><th className="w-48">{t("sales.code")}</th><th>{t("sales.productName")}</th><th className="w-24">{t("sales.type")}</th><th className="w-20">{t("sales.quantity")}</th><th className="w-24">{t("sales.price")}</th><th className="w-20">{t("sales.vat")}</th><th className="w-24">{t("sales.total")}</th><th className="w-10"></th>
        </tr></thead>
        <tbody>
          {rows.map((row) => (<tr key={row.id}>
            <td>{row.id}</td>
            <td><input type="text" className="pos-input" value={row.code} autoComplete="off" onChange={(e) => handleCodeChange(row.id, e.target.value)} onKeyDown={(e) => handleCodeKeyDown(row.id, e)} ref={(el) => { codeInputRefs.current[row.id] = el; }} /></td>
            <td><input type="text" className="pos-input" value={row.productName} onChange={(e) => updateRow(row.id, "productName", e.target.value)} /></td>
            <td><select className="pos-select" value={row.type} onChange={(e) => updateRow(row.id, "type", e.target.value)}><option value="SINGLE">{t("sales.single")}</option><option value="BOX">BOX</option></select></td>
            <td><input type="number" className="pos-input" value={row.quantity} onChange={(e) => updateRow(row.id, "quantity", e.target.value)} /></td>
            <td><input type="number" className="pos-input" value={row.price} readOnly /></td>
            <td className="text-sm">{row.vat}</td>
            <td className="pos-amount"><input type="number" className="pos-input" value={row.total} onChange={(e) => updateRow(row.id, "total", e.target.value)} /></td>
            <td><button onClick={() => removeRow(row.id)} className="text-destructive hover:opacity-70"><Trash2 size={14} /></button></td>
          </tr>))}
        </tbody>
      </table>
      <div className="flex justify-end p-3"><button onClick={addRow} className="pos-btn-secondary gap-1"><Plus size={14} /> {t("purchase.addRow")}</button></div>
      <div className="flex justify-end px-4 pb-3"><div className="text-right"><span className="font-semibold mr-3">{t("sales.totalAmount")}</span><span className="pos-amount text-xl">{t("common.sr")} {totalAmount.toFixed(2)}</span></div></div>
    </div>

    {/* Totals & Cash Payment inputs (Discount, Amount Paid, Balance) */}
    <div className="pos-card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="pos-label">{t("sales.discount")} (SR)</label>
          <input
            type="number"
            className="pos-input animate-pulse focus:animate-none"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0.00"
            min="0"
          />
        </div>
        <div>
          <label className="pos-label">{t("sales.paymentMode")}</label>
          <select className="pos-select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
            <option value="CREDIT CARD">{t("sales.creditCard")}</option>
            <option value="CASH">{t("sales.cash")}</option>
          </select>
        </div>
        <div>
          <label className="pos-label">{t("sales.amountPaid")} (SR)</label>
          <input
            type="number"
            className="pos-input"
            value={amountPaid}
            onChange={(e) => {
              amountPaidEdited.current = true;
              setAmountPaid(e.target.value);
            }}
            placeholder="0.00"
            min="0"
          />
        </div>
        <div>
          <label className="pos-label">{lang === "ar" ? "المتبقي" : "Change / Balance"} (SR)</label>
          <div className="pos-input bg-accent/20 font-bold flex items-center h-10 px-3 cursor-default rounded-md border border-input">
            <span className={parseFloat(balance) >= 0 ? "text-success" : "text-destructive"}>
              {t("common.sr")} {balance}
            </span>
          </div>
        </div>
      </div>
      
      <div className="border-t border-border mt-6 pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-4 flex-wrap text-sm text-muted-foreground">
          <div>
            <span>{t("sales.totalAmount")}: </span>
            <span className="font-semibold text-foreground">{t("common.sr")} {totalAmount.toFixed(2)}</span>
          </div>
          <div>
            <span>{t("sales.discount")}: </span>
            <span className="font-semibold text-destructive">{t("common.sr")} {discountAmt.toFixed(2)}</span>
          </div>
          <div>
            <span>{lang === "ar" ? "الضريبة المضافة" : "VAT (15%)"}: </span>
            <span className="font-semibold text-foreground">{t("common.sr")} {vatAmt.toFixed(2)}</span>
          </div>
        </div>
        <div className="text-center md:text-right">
          <p className="pos-label mb-0">{t("sales.netAmount")}</p>
          <p className="text-3xl font-extrabold text-primary">{t("common.sr")} {netAmount.toFixed(2)}</p>
        </div>
      </div>
      
      <div className="flex justify-center gap-3 mt-6 border-t border-border pt-4">
        <button
          onClick={() => handleSave(true)}
          className="pos-btn-secondary gap-1"
          disabled={createSale.isPending}
        >
          {t("sales.print")}
        </button>
        <button
          className="pos-btn-primary gap-1"
          onClick={() => handleSave(false)}
          disabled={createSale.isPending}
        >
          {createSale.isPending && <Loader2 size={14} className="animate-spin" />} {t("sales.save")}
        </button>
      </div>
    </div>

    {/* ZATCA Compliant Arabic Thermal Invoice (Fatura) Print-Only Container */}
    {printData && typeof document !== "undefined" && createPortal(
      <div id="print-receipt" dir={receiptDir(invoiceMode)}>
        <div className="receipt-header">
          {settings?.logo && <img src={settings.logo} alt="" className="receipt-logo" />}
          <h2 className="receipt-store-name">
            {invoiceMode === "both" ? (
              <span className="receipt-store-bilingual">
                <span className="receipt-line-ar" dir="rtl">
                  {settings?.storeNameAr || settings?.storeName || "بقالة شيمه خليف عايد العنزي للمواد الغذائية"}
                </span>
                {(settings?.storeNameEn || (settings?.storeNameAr ? "" : settings?.storeName)) && (
                  <>
                    <span className="receipt-sep"> - </span>
                    <span className="receipt-line-en" dir="ltr">
                      {settings?.storeNameEn || settings?.storeName}
                    </span>
                  </>
                )}
              </span>
            ) : invoiceMode === "en"
              ? (settings?.storeNameEn || settings?.storeName || "Baqalat Sheemah Khulaif Aayed Al-Enazi Lil-Mawad Al-Ghidha'iyyah")
              : (settings?.storeNameAr || settings?.storeName || "بقالة شيمه خليف عايد العنزي للمواد الغذائية")}
          </h2>
          <p className="receipt-subtext">{settings?.storeAddress || "خميس مشيط - مخطط الحسام - الصناعية القديم"}</p>
          <p className="receipt-subtext">{receiptMeta(invoiceMode, "السجل التجاري", "CR", settings?.crNumber || "7006133065")}</p>
          <p className="receipt-subtext">{receiptMeta(invoiceMode, "الرقم الضريبي", "VAT No", settings?.vatNumber || "311465715100003")}</p>
          <p className="receipt-subtext">{receiptMeta(invoiceMode, "جوال", "Mobile", settings?.supportContact || "0555917189")}</p>
        </div>
        
        <div className="receipt-divider-arrow">------------------------------------------</div>
        
        <div className="receipt-invoice-box">
          <div className="receipt-invoice-title">{receiptText(invoiceMode, "فاتورة ضريبية مبسطة", "Simplified Tax Invoice")}</div>
          <div className="receipt-invoice-row">
            <span>{receiptText(invoiceMode, "رقم الفاتورة :", "Invoice No :")}</span>
            <span className="font-bold">{printData.billNo}</span>
          </div>
          <div className="receipt-invoice-row">
            <span>{receiptText(invoiceMode, "التاريخ :", "Date :")}</span>
            <span>{new Date(printData.createdAt).toLocaleDateString("en-GB").replace(/\//g, "/")}</span>
          </div>
          <div className="receipt-invoice-row">
            <span>{receiptText(invoiceMode, "الوقت :", "Time :")}</span>
            <span>{new Date(printData.createdAt).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          </div>
          <div className="receipt-invoice-row">
            <span>{receiptText(invoiceMode, "نوع الفاتورة :", "Type :")}</span>
            <span>{receiptSaleType(invoiceMode, "SALE")}</span>
          </div>
          <div className="receipt-invoice-row">
            <span>{receiptText(invoiceMode, "طريقة الدفع :", "Payment :")}</span>
            <span>{receiptPayment(invoiceMode, printData.paymentMode)}</span>
          </div>
        </div>

        {printData.customerName && (
          <>
            <div className="receipt-divider">------------------------------------------</div>
            <div className="receipt-invoice-row">
              <span>{receiptText(invoiceMode, "اسم العميل :", "Customer :")}</span>
              <span className="font-semibold">{printData.customerName}</span>
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
            {printData.items.map((item, idx) => {
              const names = receiptItemName(invoiceMode, item, allProducts);
              return (
                <tr key={idx}>
                  <td className={nameAlign}>
                    <span className="receipt-item-primary" dir="rtl">{names.primary}</span>
                    {names.secondary && (
                      <span className="receipt-item-secondary" dir="ltr">
                        {" / "}{names.secondary}
                      </span>
                    )}
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
            <span>{Number(printData.totalAmount || 0).toFixed(2)}</span>
          </div>
          <div className="receipt-summary-row">
            <span>{receiptText(invoiceMode, "الخصم", "Discount")}</span>
            <span>{Number(printData.discount || 0).toFixed(2)}</span>
          </div>
          <div className="receipt-summary-row font-semibold">
            <span>{receiptText(invoiceMode, "بدون الضريبة", "Excl. VAT")}</span>
            <span>{(printData.netAmount / (1 + (Number(printData.vatPercent || 15) / 100))).toFixed(2)}</span>
          </div>
          <div className="receipt-summary-row">
            <span>{receiptVatLabel(invoiceMode, printData.vatPercent)}</span>
            <span>{((printData.netAmount / (1 + (Number(printData.vatPercent || 15) / 100))) * (Number(printData.vatPercent || 15) / 100)).toFixed(2)}</span>
          </div>
          <div className="receipt-summary-row font-bold text-lg border-t border-dashed pt-1 mt-1">
            <span>{receiptText(invoiceMode, "المبلغ المستحق", "Amount Due")}</span>
            <span>{Number(printData.netAmount).toFixed(2)}</span>
          </div>
          <div className="receipt-summary-row text-xs mt-1">
            <span>{receiptText(invoiceMode, "إجمالي الكميات", "Total Qty")}</span>
            <span>{printData.items.reduce((sum, item) => sum + Number(item.quantity), 0).toFixed(1)}</span>
          </div>
        </div>

        <div className="receipt-divider">------------------------------------------</div>

        <div className="receipt-payment-row font-semibold">
          <span>{receiptText(invoiceMode, "المدفوع", "Paid")}</span>
          <span>{Number(printData.amountPaid || printData.netAmount).toFixed(2)}</span>
        </div>
        <div className="receipt-payment-row">
          <span>{receiptText(invoiceMode, "المتبقي", "Balance")}</span>
          <span>{Number(printData.balance || 0).toFixed(2)}</span>
        </div>

        <div className="receipt-qr-section">
          {qrBase64 && <img src={qrBase64} alt="ZATCA QR" className="receipt-qr-img" />}
          <div className="receipt-qr-text">{receiptQrLabel(invoiceMode)}</div>
        </div>
      </div>,
      document.body
    )}

    <style>{`
      /* Hide standard app elements when printing */
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
          width: 80mm !important;
          max-width: 80mm !important;
          padding: 2mm 3mm !important;
          margin: 0 !important;
          background: #fff !important;
          color: #000 !important;
          font-weight: 700 !important;
          box-sizing: border-box !important;
          font-size: 12px !important;
          line-height: 1.25 !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
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
      .receipt-logo {
        display: block;
        margin: 0 auto 3px;
        width: 56mm;
        max-width: 100%;
        height: auto;
        max-height: 18mm;
        object-fit: contain;
        image-rendering: high-quality;
      }
      .receipt-store-name {
        font-size: 15px !important;
        font-weight: 700;
        margin: 0 0 2px 0;
        letter-spacing: 0;
        line-height: 1.25;
      }
      .receipt-subtext {
        font-size: 12px !important;
        margin: 0 0 1px 0;
        font-weight: 700;
        line-height: 1.25;
      }
      .receipt-divider-arrow,
      .receipt-divider {
        text-align: center;
        margin: 1px 0;
        letter-spacing: -0.5px;
        font-size: 11px;
        line-height: 1;
      }
      .receipt-invoice-box,
      .receipt-summary-box {
        border: none;
        padding: 1px 0;
        margin: 1px 0;
      }
      .receipt-invoice-title {
        font-weight: 700;
        font-size: 13px !important;
        text-align: center;
        margin-bottom: 2px;
        border-bottom: 1px dashed #000;
        padding-bottom: 2px;
        line-height: 1.25;
      }
      .receipt-invoice-row,
      .receipt-summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px !important;
        font-weight: 700;
        line-height: 1.25;
        margin-bottom: 1px;
        padding: 0;
      }
      .receipt-invoice-row span,
      .receipt-summary-row span,
      .receipt-payment-row span,
      .receipt-items-table th,
      .receipt-qr-text {
        letter-spacing: 0;
      }
      .receipt-items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px !important;
        margin: 2px 0;
      }
      .receipt-items-table th {
        font-weight: bold;
        border-bottom: 1.5px solid #000;
        border-top: 1.5px solid #000;
        padding: 2px 2px;
        font-size: 11.5px !important;
      }
      .receipt-items-table td {
        padding: 2px 2px;
        border-bottom: 1px dotted #999;
      }
      .receipt-payment-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px !important;
        font-weight: 700;
        line-height: 1.25;
        margin-bottom: 1px;
        padding: 0;
      }
      .receipt-qr-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 4px;
        text-align: center;
      }
      .receipt-qr-img {
        width: 84px;
        height: 84px;
      }
      .receipt-bilingual {
        display: inline-flex;
        align-items: baseline;
        direction: rtl;
        gap: 2px;
        white-space: nowrap;
      }
      .receipt-line-ar {
        display: inline;
        direction: rtl;
        font-size: inherit;
        font-weight: 700;
        line-height: 1.35;
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
        line-height: 1.3;
      }
      .receipt-colon {
        display: inline;
        font-weight: 700;
      }
      .receipt-meta-bilingual {
        display: inline-flex;
        align-items: baseline;
        direction: rtl;
        gap: 2px;
        white-space: nowrap;
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
        display: inline;
        text-align: center;
      }
      .receipt-items-table th .receipt-line-en {
        font-size: 10px;
        font-weight: 600;
      }
      .receipt-qr-text {
        font-size: 13px;
        margin-top: 3px;
        font-weight: 700;
        line-height: 1.4;
      }
    `}</style>
  </div>);
}
