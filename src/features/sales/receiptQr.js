import QRCode from "qrcode";

/**
 * ZATCA QR for 58mm thermal paper, as a crisp high-resolution PNG data URI.
 *
 * Key facts that make this scannable on thermal paper:
 * - A 58mm thermal print head only prints ~48mm wide (384 dots at 203 DPI).
 *   If the QR is wider than that the corners (finder patterns) get clipped and
 *   it will never scan. So the receipt CSS sizes this to a fixed 46mm, which
 *   always fits inside the printable area.
 * - The source PNG is rendered at a high resolution (760px) so that when the
 *   browser/printer scales it down to 46mm the module edges stay sharp.
 * - Error correction "L" keeps the module count (and therefore density) as low
 *   as ZATCA allows, so each module is as large as possible on paper.
 * - A 4-module quiet zone is mandatory for scanners to locate the code.
 */
export async function buildReceiptQrPng(payload) {
  return QRCode.toDataURL(String(payload), {
    errorCorrectionLevel: "L",
    margin: 4,
    width: 760,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
