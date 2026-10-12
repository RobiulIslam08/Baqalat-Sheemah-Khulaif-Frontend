export function invoiceLanguageOf(settings) {
  const value = settings?.invoiceLanguage;
  if (value === "ar" || value === "en" || value === "both") return value;
  return "both";
}

export function receiptDir(mode) {
  return mode === "en" ? "ltr" : "rtl";
}

export function receiptText(mode, arabic, english) {
  if (mode === "en") return english;
  if (mode === "ar") return arabic;
  return `${arabic} / ${english}`;
}

export function receiptQrLabel(mode) {
  if (mode === "en") return "QR CODE";
  if (mode === "ar") return "رمز الاستجابة السريعة";
  return "رمز الاستجابة السريعة QR CODE";
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
  if (mode === "both") return `الضريبة / VAT ${rate}٪`;
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
