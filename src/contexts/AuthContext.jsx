/**
 * Auth Context
 * Provides authentication state (user, role, token) to the entire app.
 * Handles login, logout, and auth persistence via localStorage.
 */

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authService } from "@/services/auth.service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getUser());
  const [isLoading, setIsLoading] = useState(true);

  // On mount, verify stored auth is still valid
  useEffect(() => {
    const stored = authService.getUser();
    const hasToken = authService.isAuthenticated();
    if (stored && hasToken) {
      setUser(stored);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authService.login(credentials);
    const userData = res?.data?.user || res?.data;
    if (userData) {
      authService.setUser(userData);
      setUser(userData);
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user && authService.isAuthenticated(),
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context.
 * @returns {{ user, role, isAuthenticated, isLoading, login, logout }}
 */
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
}
