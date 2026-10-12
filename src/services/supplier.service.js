/**
 * Supplier Service
 * CRUD operations for suppliers.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

const BASE = "/suppliers";

export const supplierService = {
  create(data) {
    return apiPost(BASE, data);
  },

  getAll(params = {}) {
    return apiGet(BASE, params);
  },

  getById(id) {
    return apiGet(`${BASE}/${id}`);
  },

  update(id, data) {
    return apiPatch(`${BASE}/${id}`, data);
  },

  delete(id) {
    return apiDelete(`${BASE}/${id}`);
  },
};
