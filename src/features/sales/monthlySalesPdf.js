/**
 * Monthly Sales / Returns Report — PDF export
 * Builds a downloadable PDF summary of all sales (or returns) for a given
 * month using jsPDF + jspdf-autotable. Report text is kept in English/Latin
 * since jsPDF's built-in fonts cannot shape Arabic script.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function monthLabel(month) {
  try {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  } catch {
    return month;
  }
}

// jsPDF's built-in fonts only support Latin (WinAnsi) characters — Arabic
// text renders as garbled mojibake. The store name in Settings is always in
// Arabic, so the PDF header always uses the Latin store name instead,
// regardless of what is configured in Settings.
const STORE_NAME_LATIN = "Baqalat Sheemah Khulaif Aayed Al-Enazi Lil-Mawad Al-Ghidha'iyyah";

/**
 * @param {Object} opts
 * @param {string} opts.month - "YYYY-MM"
 * @param {Array} opts.sales - sale/return records for that month
 * @param {Object} [opts.settings] - store settings (storeName, vatNumber)
 * @param {boolean} [opts.isReturn] - whether this is a returns report
 */
export function downloadMonthlySalesPdf({ month, sales, settings, isReturn = false }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const storeName = STORE_NAME_LATIN;
  const vatNo = settings?.vatNumber || "—";
  const reportTitle = isReturn ? "Monthly Sales Returns Report" : "Monthly Sales Report";
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - 80;

  let y = 42;
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  const storeNameLines = doc.splitTextToSize(storeName, usableWidth);
  storeNameLines.forEach((line) => {
    doc.text(line, 40, y);
    y += 17;
  });

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.text(`VAT No: ${vatNo}`, 40, y);
  y += 22;

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text(`${reportTitle} - ${monthLabel(month)}`, 40, y);
  y += 15;

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, 40, y);
  y += 11;

  const rows = sales.map((s, i) => [
    i + 1,
    s.billNo ?? "—",
    s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-GB") : "—",
    (s.customer && typeof s.customer === "object" ? s.customer.customerName : s.customer) || "—",
    s.paymentMode || "—",
    s.createdBy || "—",
    Number(s.netAmount || 0).toFixed(2),
  ]);

  const totalAmount = sales.reduce((sum, s) => sum + (parseFloat(s.netAmount) || 0), 0);

  autoTable(doc, {
    startY: y + 10,
    head: [["#", "Bill No", "Date", "Customer", "Payment", "Created By", "Amount (SR)"]],
    body: rows,
    foot: [["", "", "", "", "", "Total", totalAmount.toFixed(2)]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [11, 112, 81], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [235, 235, 235], textColor: 0, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 25 }, 6: { halign: "right" } },
    margin: { left: 40, right: 40 },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.text(
      `Page ${p} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - 90,
      doc.internal.pageSize.getHeight() - 20,
    );
  }

  doc.save(`${isReturn ? "Sales-Returns" : "Sales"}-Report-${month}.pdf`);
}
