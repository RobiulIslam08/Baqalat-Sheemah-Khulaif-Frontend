/**
 * Product Link Service
 * Links box products to single products (conversion mapping).
 * Backend: /product-links
 */

import { apiGet, apiPost } from "./api";

const BASE = "/product-links";

export const productLinkService = {
  /** Create a new box ↔ single product link. */
  create(data) {
    return apiPost(BASE, data);
  },

  /** Get all product links. */
  getAll(params = {}) {
    return apiGet(BASE, params);
  },
};
