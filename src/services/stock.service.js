/**
 * Stock Service
 * View stock, stock returns, and corrections.
 */

import { apiGet, apiPost } from "./api";

const BASE = "/stock";

export const stockService = {
  /** Get current stock with optional filters (keyword, warehouse). */
  getStock(params = {}) {
    return apiGet(BASE, params);
  },

  /** Get stock return history. */
  getReturns(params = {}) {
    return apiGet(`${BASE}/returns`, params);
  },

  /** Process a stock return. */
  processReturn(data) {
    return apiPost(`${BASE}/return`, data);
  },

  /** Process a stock correction. */
  processCorrection(data) {
    return apiPost(`${BASE}/correction`, data);
  },
};
