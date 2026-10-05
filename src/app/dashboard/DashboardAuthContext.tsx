"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface BuyerUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
}

interface DashboardAuthContextType {
  token: string | null;
  user: BuyerUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setAuthToken: (token: string) => void;
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  refreshProfile: () => Promise<void>;
}

const DashboardAuthContext = createContext<DashboardAuthContextType | undefined>(undefined);

export function DashboardAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<BuyerUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Load token from storage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("buyer_token") || localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/v1/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.data?.user || data.data);
        setError(null);
      } else {
        // If 401 or invalid token, clear it
        localStorage.removeItem("buyer_token");
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshProfile();
    }
  }, [token, refreshProfile]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.data?.token) {
        const receivedToken = data.data.token;
        localStorage.setItem("buyer_token", receivedToken);
        localStorage.setItem("token", receivedToken);
        setToken(receivedToken);
        setUser(data.data.user);
        setLoading(false);
        return true;
      } else {
        setError(data.error?.message || "Invalid credentials");
        setLoading(false);
        return false;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem("buyer_token");
      localStorage.removeItem("token");
    } catch {}
    setToken(null);
    setUser(null);
    router.push("/test/login");
  };

  const setAuthToken = (newToken: string) => {
    try {
      localStorage.setItem("buyer_token", newToken);
      localStorage.setItem("token", newToken);
    } catch {}
    setToken(newToken);
  };

  const fetchWithAuth = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers });
  };

  return (
    <DashboardAuthContext.Provider
      value={{
        token,
        user,
        loading,
        error,
        login,
        logout,
        setAuthToken,
        fetchWithAuth,
        refreshProfile,
      }}
    >
      {children}
    </DashboardAuthContext.Provider>
  );
}

export function useDashboardAuth() {
  const ctx = useContext(DashboardAuthContext);
  if (!ctx) {
    throw new Error("useDashboardAuth must be used within DashboardAuthProvider");
  }
  return ctx;
}
