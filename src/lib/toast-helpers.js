/**
 * Toast Helpers
 * Utility functions for showing success/error toasts with proper formatting.
 * Handles multiline error messages from backend validation errors.
 */

import { toast } from "sonner";

/**
 * Show a success toast.
 * @param {string} message
 */
export function showSuccess(message) {
  toast.success(message, {
    duration: 3000,
  });
}

/**
 * Show an error toast with proper formatting.
 * Handles multiline messages (e.g., from Zod validation with multiple field errors).
 *
 * @param {Error|string} error - The error object or message string
 * @param {string} [fallback] - Fallback message if error is empty
 */
export function showError(error, fallback = "Something went wrong") {
  const message =
    typeof error === "string" ? error : error?.message || fallback;

  // If the message has multiple lines (multiple validation errors),
  // show them as a description under the title
  const lines = message.split("\n").filter(Boolean);

  if (lines.length > 1) {
    toast.error("Validation Error", {
      description: lines.join(" • "),
      duration: 6000,
    });
  } else {
    toast.error(lines[0] || fallback, {
      duration: 4000,
    });
  }
}
