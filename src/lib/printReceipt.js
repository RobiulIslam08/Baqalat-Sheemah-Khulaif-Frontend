/**
 * Print the receipt currently in the DOM (#print-receipt).
 *
 * Inside the packaged Electron desktop app, `window.posDesktop` is exposed
 * by the preload script and prints silently to the default printer — a true
 * single click with no OS print dialog. In a normal web browser that bridge
 * does not exist, so it falls back to window.print() (the browser's own
 * print dialog still needs one confirmation click — this is a browser
 * security restriction that cannot be bypassed from web code).
 */
export async function printReceipt() {
  if (typeof window !== "undefined" && window.posDesktop?.printSilent) {
    try {
      const result = await window.posDesktop.printSilent();
      if (result?.success) return true;
    } catch {
      // Fall through to the browser print dialog below
    }
  }
  window.print();
  return false;
}
