import { createElement } from "react";

export function invoiceLanguageOf(settings) {
  const value = settings?.invoiceLanguage;
  if (value === "ar" || value === "en" || value === "both") return value;
  return "both";
}

export function receiptDir(mode) {
  return mode === "en" ? "ltr" : "rtl";
}

/**
 * Render Arabic and English side-by-side on the SAME line.
 * Uses an inline-flex wrapper with explicit dir on spans so thermal
 * printers render crisp text without bidirectional glitching.
 */
function bilingual(arabic, english) {
  const hasColon = (arabic && /[:：]\s*$/.test(arabic)) || (english && /[:：]\s*$/.test(english));
  const arClean = (arabic || "").replace(/[:：\s]+$/, "");
  const enClean = (english || "").replace(/[:：\s]+$/, "");

  return createElement(
    "span",
    { className: "receipt-bilingual" },
    createElement("span", { className: "receipt-line-ar", dir: "rtl" }, arClean),
    createElement("span", { className: "receipt-sep" }, " / "),
    createElement("span", { className: "receipt-line-en", dir: "ltr" }, enClean),
    hasColon ? createElement("span", { className: "receipt-colon" }, " :") : null
  );
}

export function receiptText(mode, arabic, english) {
  if (mode === "en") return english;
  if (mode === "ar") return arabic;
  return bilingual(arabic, english);
}

export function receiptMeta(mode, arabicLabel, englishLabel, value) {
  if (!value) return null;
  if (mode === "en") return `${englishLabel} : ${value}`;
  if (mode === "ar") return `${arabicLabel} : ${value}`;
  return createElement(
    "span",
    { className: "receipt-meta-bilingual" },
    createElement("span", { className: "receipt-line-ar", dir: "rtl" }, arabicLabel),
    createElement("span", { className: "receipt-sep" }, " / "),
    createElement("span", { className: "receipt-line-en", dir: "ltr" }, englishLabel),
    createElement("span", { className: "receipt-colon" }, " : "),
    createElement("span", { className: "receipt-meta-val", dir: "ltr" }, String(value))
  );
}

export function receiptQrLabel(mode) {
  if (mode === "en") return "QR CODE";
  if (mode === "ar") return "رمز الاستجابة السريعة";
  return bilingual("رمز الاستجابة السريعة", "QR CODE");
}

export function receiptPayment(mode, paymentMode) {
  const cash = paymentMode === "CASH" || paymentMode === "Cash";
  return receiptText(mode, cash ? "نقدا" : "شبكة", cash ? "Cash" : "Card");
}

export function receiptSaleType(mode, type) {
  if (type === "RETURN") return receiptText(mode, "مرتجع مبيعات", "Return");
  return receiptText(mode, "مبيعات", "Sales");
}

export function receiptVatLabel(mode, percent) {
  const rate = Number(percent || 15);
  if (mode === "both") return bilingual(`الضريبة ${rate}٪`, `VAT ${rate}%`);
  if (mode === "en") return `VAT ${rate}%`;
  return `الضريبة ${rate}٪`;
}

export function receiptItemName(mode, item, products) {
  const found = (products || []).find((p) => p.productCode === item.code || p.productId === item.code);
  const englishName = found?.productName || item.productName || item.code || "";
  const arabicName = found?.arabicName || "";
  if (mode === "en") return { primary: englishName, secondary: "" };
  if (mode === "ar") return { primary: arabicName || englishName, secondary: "" };
  if (arabicName && englishName && arabicName !== englishName) {
    return { primary: arabicName, secondary: englishName };
  }
  return { primary: item.productName || englishName, secondary: "" };
}


