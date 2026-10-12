/**
 * Formulation Service
 * CRUD operations for product formulations.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

const BASE = "/formulations";

export const formulationService = {
  create(data) {
    return apiPost(BASE, data);
  },

  getAll(params = {}) {
    return apiGet(BASE, params);
  },

  update(id, data) {
    return apiPatch(`${BASE}/${id}`, data);
  },

  delete(id) {
    return apiDelete(`${BASE}/${id}`);
  },
};
