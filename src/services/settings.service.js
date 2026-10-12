/**
 * Settings Service
 * Get and update system settings.
 */

import { apiGet, apiPatch, apiPost } from "./api";

const BASE = "/settings";

export const settingsService = {
  /** Get current system settings. */
  get() {
    return apiGet(BASE);
  },

  /** Update system settings (admin only). */
  update(data) {
    return apiPatch(BASE, data);
  },

  /** Delete demo records and keep products plus the current user. */
  resetDemo() {
    return apiPost(`${BASE}/reset-demo`, {});
  },
};
