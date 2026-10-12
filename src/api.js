/**
 * ============================================================================
 * 🌐 BACKEND API URL CONFIGURATION (Localhost vs Live cPanel)
 * ============================================================================
 * এই ফাইল থেকে আপনি সহজেই Backend URL কমেন্ট ও আনকমেন্ট করে পরিবর্তন করতে পারবেন।
 *
 * [1] LOCALHOST URL (লোকালহোস্টে চালানোর জন্য এইটা ব্যবহার করুন):
 */
export const BACKEND_URL = "http://localhost:5100/api/v1";

/**
 * [2] LIVE CPANEL URL (cPanel-এ লাইভ করার সময় এইটা আনকমেন্ট করুন এবং [1] কমেন্ট করুন):
 * export const BACKEND_URL = "https://your-domain.com/api/v1";
 *
 * [3] RELATIVE URL (যদি ফ্রন্টএন্ড ও ব্যাকএন্ড একই ডোমেইনে রিভার্স প্রক্সি থাকে):
 * export const BACKEND_URL = "/api/v1";
 */

// Re-export everything from services/api for convenience
export * from "./services/api";
export { default } from "./services/api";
