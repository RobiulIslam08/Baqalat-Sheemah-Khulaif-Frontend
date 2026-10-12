/**
 * Sale Service
 * Create sales, fetch sales, sales returns.
 */

import { apiGet, apiPost } from "./api";

const BASE = "/sales";

export const saleService = {
  /** Create a new sale (with items array). */
  create(data) {
    return apiPost(BASE, data);
  },

  /** Get all sales with optional query params (date range, user, page, etc.). */
  getAll(params = {}) {
    return apiGet(BASE, params);
  },

  /** Get a specific sale by bill number. */
  getByBillNo(billNo) {
    return apiGet(`${BASE}/${billNo}`);
  },

  /** Process a sales return. */
  createReturn(data) {
    return apiPost(`${BASE}/return`, data);
  },
};
