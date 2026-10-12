/**
 * Purchase Service
 * Create and fetch purchase invoices.
 */

import { apiGet, apiPost } from "./api";

const BASE = "/purchases";

export const purchaseService = {
  /** Create a new purchase invoice (with items array). */
  create(data) {
    return apiPost(BASE, data);
  },

  /** Get all purchase invoices with optional query params. */
  getAll(params = {}) {
    return apiGet(BASE, params);
  },

  /** Get a specific purchase by ID. */
  getById(id) {
    return apiGet(`${BASE}/${id}`);
  },
};
