/**
 * Product Supplier Service
 * Links products to their suppliers.
 * Backend: /product-suppliers
 */

import { apiGet, apiPost } from "./api";

const BASE = "/product-suppliers";

export const productSupplierService = {
  /** Link a product to a supplier. */
  create(data) {
    return apiPost(BASE, data);
  },

  /** Get all product-supplier links. */
  getAll(params = {}) {
    return apiGet(BASE, params);
  },
};
