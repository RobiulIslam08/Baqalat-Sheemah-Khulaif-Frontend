/**
 * Barcode Service
 * Generate barcode label jobs and retrieve history.
 * Backend: /barcode
 */

import { apiGet, apiPost } from "./api";

const BASE = "/barcode";

export const barcodeService = {
  /** Generate barcode labels (saves a job to DB). */
  generate(data) {
    return apiPost(`${BASE}/generate`, data);
  },

  /** Get all barcode generation jobs. */
  getJobs(params = {}) {
    return apiGet(BASE, params);
  },
};
