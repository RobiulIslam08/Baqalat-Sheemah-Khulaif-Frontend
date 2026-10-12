import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiGet } from "@/services/api";

const LicenseContext = createContext(null);

export function LicenseProvider({ children }) {
  const [license, setLicense] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiGet("/license/status", {}, { skipAuth: true });
      if (res?.data) {
        setLicense(res.data);
      }
    } catch {
      // keep existing state on network hiccup
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Periodic poll every 20 seconds to keep clients in sync with developer actions
    const interval = setInterval(fetchStatus, 20000);

    // Also refresh on window focus
    const onFocus = () => fetchStatus();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchStatus]);

  const value = {
    license,
    setLicense,
    isLoading,
    refreshLicense: fetchStatus,
    isSuspended: Boolean(license?.suspended),
    isReadOnly: Boolean(license?.readOnly),
    isOpen: Boolean(license?.open),
  };

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export function useLicense() {
  const ctx = useContext(LicenseContext);
  if (!ctx) {
    throw new Error("useLicense must be used within a LicenseProvider");
  }
  return ctx;
}
