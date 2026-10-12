/**
 * Cash Adjustment Service
 * Post and view cash adjustments.
 */

import { apiGet, apiPost } from "./api";

const BASE = "/cash-adjustments";

export const cashAdjustmentService = {
  /** Post a new cash adjustment. */
  create(data) {
    return apiPost(BASE, data);
  },

  /** Get all cash adjustments. */
  getAll(params = {}) {
    return apiGet(BASE, params);
  },
};
