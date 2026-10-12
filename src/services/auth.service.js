/**
 * Auth Service
 * Handles login, register, password management, and token operations.
 */

import { apiPost, tokenStore } from "./api";

const AUTH_BASE = "/auth";

export const authService = {
  /**
   * Login user and store tokens.
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<{ user, accessToken, refreshToken }>}
   */
  async login(credentials) {
    const res = await apiPost(`${AUTH_BASE}/login`, credentials, {
      skipAuth: true,
    });
    const { accessToken, refreshToken } = res.data || {};
    if (accessToken) {
      tokenStore.setTokens(accessToken, refreshToken);
    }
    return res;
  },

  /**
   * Register a new user.
   * @param {Object} userData - { userId, fullName, role, mobile, password, username }
   */
  async register(userData) {
    return apiPost(`${AUTH_BASE}/register`, userData);
  },

  /**
   * Change current user's password.
   * @param {{ oldPassword: string, newPassword: string }} data
   */
  async changePassword(data) {
    return apiPost("/users/change-password", data);
  },

  /**
   * Refresh the access token using the refresh token cookie/body.
   */
  async refreshToken() {
    const refreshToken = tokenStore.getRefresh();
    return apiPost(
      `${AUTH_BASE}/refresh-token`,
      { refreshToken },
      { skipAuth: true }
    );
  },

  /**
   * Request a password reset email.
   * @param {{ id: string }} data
   */
  async forgetPassword(data) {
    return apiPost(`${AUTH_BASE}/forget-password`, data, { skipAuth: true });
  },

  /**
   * Reset the password with a token.
   * @param {{ id: string, newPassword: string, token: string }} data
   */
  async resetPassword(data) {
    return apiPost(`${AUTH_BASE}/reset-password`, data, { skipAuth: true });
  },

  /** Logout — clear tokens and user data. */
  logout() {
    tokenStore.clear();
  },

  /** Persist user profile to localStorage. */
  setUser(user) {
    localStorage.setItem("pos_user", JSON.stringify(user));
  },

  /** Retrieve stored user profile. */
  getUser() {
    try {
      const raw = localStorage.getItem("pos_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /** Check if user is authenticated. */
  isAuthenticated() {
    return !!tokenStore.getAccess();
  },
};
