/**
 * API Client
 * ----------
 * Centralized HTTP client for all backend API calls.
 * Handles JWT auth, error parsing, token refresh, and consistent responses.
 *
 * Backend error response format:
 * {
 *   success: false,
 *   message: "Zod Validation Error" | "Mongoose Validation Error" | ...,
 *   errorSources: [{ path: "fieldName", message: "Human readable message" }],
 *   stack: "..." (development only)
 * }
 */

import { APP_CONFIG } from "@/config/app.config";

// ============================================================================
// 🌐 BACKEND API URL CONFIGURATION (Localhost vs Live cPanel)
// ============================================================================
// [1] LOCALHOST URL (লোকালহোস্টে চালানোর জন্য এইটা ব্যবহার করুন):
export const BACKEND_URL = "http://localhost:5100/api/v1";

// [2] LIVE CPANEL URL (cPanel-এ লাইভ করার সময় এইটা আনকমেন্ট করুন এবং [1] কমেন্ট করুন):
// export const BACKEND_URL = "https://your-domain.com/api/v1";

// [3] RELATIVE URL (যদি ফ্রন্টএন্ড ও ব্যাকএন্ড একই ডোমেইনে রিভার্স প্রক্সি থাকে):
// export const BACKEND_URL = "/api/v1";
// ============================================================================

const BASE_URL = BACKEND_URL || APP_CONFIG.apiBaseUrl || "/api/v1";

// ─── Token helpers ───────────────────────────────────────────
const TOKEN_KEY = "pos_access_token";
const REFRESH_KEY = "pos_refresh_token";

export const tokenStore = {
  getAccess: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (access, refresh) => {
    localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem("pos_user");
  },
};

// ─── Error class ─────────────────────────────────────────────
export class ApiError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} message - Human-readable summary (parsed from errorSources)
   * @param {Array<{path: string, message: string}>} errorSources - Field-level errors
   */
  constructor(status, message, errorSources = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorSources = errorSources;
  }
}

/**
 * Parse the backend errorSources array into a clean, human-readable message.
 *
 * Input:  [{ path: "productId", message: "Product ID is required" },
 *          { path: "vat",       message: "VAT must be 0, 5, or 15" }]
 *
 * Output: "• Product ID is required\n• VAT must be 0, 5, or 15"
 *
 * If errorSources is empty, falls back to the top-level `message`.
 */
function parseErrorMessage(body) {
  const errorSources = body?.errorSources || [];
  const topMessage = body?.message || "";

  // If there are field-level errors, build a readable summary
  if (errorSources.length > 0) {
    const fieldErrors = errorSources
      .map((e) => {
        const field = e.path ? String(e.path) : "";
        const msg = e.message || "Invalid value";
        // If field name is present, prefix it for clarity
        if (field) {
          // Make field name more readable: "productId" → "Product Id"
          const label = field
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase())
            .trim();
          return `${label}: ${msg}`;
        }
        return msg;
      })
      .filter(Boolean);

    if (fieldErrors.length === 1) {
      return fieldErrors[0];
    }
    return fieldErrors.join("\n");
  }

  // Generic error messages — make them friendlier
  if (topMessage === "Zod Validation Error") {
    return "Please fill in all required fields correctly.";
  }
  if (topMessage === "Mongoose Validation Error") {
    return "Some field values are invalid. Please check and try again.";
  }
  if (topMessage === "Invalid Id") {
    return "This record already exists (duplicate entry).";
  }

  return topMessage || "An unexpected error occurred.";
}

// ─── Core request function ───────────────────────────────────
async function request(method, endpoint, data = null, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const headers = {};
  if (!(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Attach JWT token unless explicitly skipped
  if (!options.skipAuth) {
    const token = tokenStore.getAccess();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const fetchOptions = {
    method,
    headers,
    credentials: "include",
  };

  if (data) {
    fetchOptions.body =
      data instanceof FormData ? data : JSON.stringify(data);
  }

  let res;
  try {
    res = await fetch(url, fetchOptions);
  } catch (networkErr) {
    throw new ApiError(
      0,
      "Cannot connect to server. Please make sure the backend is running on " +
        BASE_URL,
      []
    );
  }

  // Try to parse JSON body (even for errors)
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  // ── Handle 401 → attempt token refresh once ──
  if (res.status === 401 && !options._isRetry && !options.skipAuth) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      return request(method, endpoint, data, {
        ...options,
        _isRetry: true,
      });
    }
    // Refresh failed → clear tokens, redirect to login
    tokenStore.clear();
    window.location.href = "/login";
    throw new ApiError(401, "Session expired. Please login again.");
  }

  // ── Handle non-OK responses ──
  if (!res.ok) {
    const errorSources = body?.errorSources || [];
    const message = parseErrorMessage(body);
    if (
      res.status === 403 &&
      !options.skipAuth &&
      /license expired|shop is suspended/i.test(message)
    ) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    throw new ApiError(res.status, message, errorSources);
  }

  return body;
}

// ─── Token refresh ───────────────────────────────────────────
async function attemptTokenRefresh() {
  try {
    const refreshToken = tokenStore.getRefresh();

    const res = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });

    if (!res.ok) return false;

    const body = await res.json();
    if (body?.data?.accessToken) {
      tokenStore.setTokens(body.data.accessToken, body.data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Query string builder ────────────────────────────────────
export function buildQueryString(params = {}) {
  const filtered = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (filtered.length === 0) return "";
  return "?" + new URLSearchParams(filtered).toString();
}

// ─── Exported HTTP methods ───────────────────────────────────
export const apiGet = (endpoint, params, options) =>
  request("GET", endpoint + buildQueryString(params), null, options);

export const apiPost = (endpoint, data, options) =>
  request("POST", endpoint, data, options);

export const apiPatch = (endpoint, data, options) =>
  request("PATCH", endpoint, data, options);

export const apiPut = (endpoint, data, options) =>
  request("PUT", endpoint, data, options);

export const apiDelete = (endpoint, options) =>
  request("DELETE", endpoint, null, options);
