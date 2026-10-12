/**
 * Customer Service
 * CRUD operations for customers.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

const BASE = "/customers";

export const customerService = {
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
