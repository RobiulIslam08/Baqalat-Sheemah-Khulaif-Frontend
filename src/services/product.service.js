/**
 * Product Service
 * CRUD operations for products.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

const BASE = "/products";

export const productService = {
  /** Create a new product. */
  create(data) {
    return apiPost(BASE, data);
  },

  /** Get all products with optional query params (search, page, limit, etc.). */
  getAll(params = {}) {
    return apiGet(BASE, params);
  },

  /** Get the next auto-generated serial product ID (e.g. "1", "2", "3"...). */
  getNextId() {
    return apiGet(`${BASE}/next-id`);
  },

  /** Get a single product by ID. */
  getById(id) {
    return apiGet(`${BASE}/${id}`);
  },

  /** Update a product by ID. */
  update(id, data) {
    return apiPatch(`${BASE}/${id}`, data);
  },

  /** Soft-delete a product by ID. */
  delete(id) {
    return apiDelete(`${BASE}/${id}`);
  },
};
