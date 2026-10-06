"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface AdminAuthContextType {
  token: string | null;
  adminToken: string | null;
  user: AdminUser | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setAuthToken: (token: string) => void;
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token") || localStorage.getItem("admin_token");
    if (savedToken) {
      setToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch admin profile
  const fetchProfile = useCallback(async (jwtToken: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/users/me", {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("admin_token");
          setToken(null);
          setUser(null);
        }
        throw new Error("Failed to authenticate administrator account");
      }

      const data = await res.json();
      const profile = data.data;

      if (profile.role !== "ADMIN") {
        throw new Error("Access denied: Your account does not possess administrative privileges");
      }

      setUser({
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        role: profile.role,
        isActive: profile.isActive,
      });
    } catch (err: any) {
      setError(err.message || "Authentication error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    }
  }, [token, fetchProfile]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Invalid credentials");
      }

      const receivedToken = data.data.token;
      localStorage.setItem("admin_token", receivedToken);
      localStorage.setItem("token", receivedToken);
      setToken(receivedToken);

      await fetchProfile(receivedToken);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to log in");
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    router.push("/test/login");
  };

  const setAuthToken = (newToken: string) => {
    localStorage.setItem("admin_token", newToken);
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const fetchWithAuth = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers || {});
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    },
    [token]
  );

  const isAdmin = !!user && user.role === "ADMIN" && user.isActive;

  return (
    <AdminAuthContext.Provider
      value={{
        token,
        adminToken: token,
        user,
        loading,
        error,
        isAdmin,
        login,
        logout,
        setAuthToken,
        fetchWithAuth,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
