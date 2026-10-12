/**
 * Expense Service
 * Post expenses, fetch expenses, approve expenses.
 */

import { apiGet, apiPost, apiPatch } from "./api";

const BASE = "/expenses";

export const expenseService = {
  /** Post a new expense voucher. */
  create(data) {
    return apiPost(BASE, data);
  },

  /** Get all expenses with optional query params (date, status, etc.). */
  getAll(params = {}) {
    return apiGet(BASE, params);
  },

  /** Approve a pending expense by ID. */
  approve(id) {
    return apiPatch(`${BASE}/${id}/approve`);
  },
};
