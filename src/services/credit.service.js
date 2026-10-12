/**
 * Credit Service
 * Supplier and customer credit management.
 */

import { apiGet, apiPost, apiPatch } from "./api";

const BASE = "/credits";

export const creditService = {
  // ─── Supplier Credits ──────────────────────────
  /** Record a payment to a supplier. */
  recordSupplierPayment(data) {
    return apiPost(`${BASE}/supplier`, data);
  },

  /** Get all supplier credit records. */
  getSupplierCredits(params = {}) {
    return apiGet(`${BASE}/supplier`, params);
  },

  /** Settle (mark paid) a specific supplier invoice. */
  settleSupplierInvoice(id) {
    return apiPatch(`${BASE}/supplier/${id}/settle`);
  },

  // ─── Customer Credits ──────────────────────────
  /** Receive a payment from a customer. */
  receiveCustomerPayment(data) {
    return apiPost(`${BASE}/customer`, data);
  },

  /** Get all customer credit records. */
  getCustomerCredits(params = {}) {
    return apiGet(`${BASE}/customer`, params);
  },
};
