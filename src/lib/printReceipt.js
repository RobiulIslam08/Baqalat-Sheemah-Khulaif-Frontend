/**
 * Print the receipt currently in the DOM (#print-receipt or #purchase-print-receipt).
 *
 * The receipt is moved to the top of the page for the print job so the rest of
 * the screen does not add a second sheet. Inside the packaged Electron app,
 * printing goes straight to the default printer. In a browser, the print
 * dialog still needs one confirmation.
 */
function findReceipt() {
  return document.getElementById("print-receipt") || document.getElementById("purchase-print-receipt");
}

export async function printReceipt() {
  const receipt = findReceipt();
  const parent = receipt?.parentNode || null;
  const next = receipt?.nextSibling || null;

  const restore = () => {
    document.documentElement.classList.remove("receipt-printing");
    if (!receipt || !parent) return;
    if (next && next.parentNode === parent) parent.insertBefore(receipt, next);
    else parent.appendChild(receipt);
  };

  if (receipt && parent) {
    document.body.appendChild(receipt);
    document.documentElement.classList.add("receipt-printing");
  }

  try {
    if (typeof window !== "undefined" && window.posDesktop?.printSilent) {
      try {
        const result = await window.posDesktop.printSilent();
        if (result?.success) return true;
      } catch {
        // Fall through to the browser print dialog below
      }
    }

    await new Promise((resolve) => {
      const done = () => {
        window.removeEventListener("afterprint", done);
        resolve();
      };
      window.addEventListener("afterprint", done);
      window.print();
    });
    return false;
  } finally {
    restore();
  }
}
