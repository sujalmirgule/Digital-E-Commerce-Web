"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface SellerProfileData {
  id: string;
  storeName: string;
  storeSlug: string;
  status: string;
  country: string;
  totalRevenuePaise: number;
  netEarningsPaise: number;
  availableBalance: number;
  pendingBalance: number;
}

export interface SellerUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  hasSellerProfile: boolean;
  sellerStatus: string | null;
}

interface SellerAuthContextType {
  token: string | null;
  user: SellerUser | null;
  profile: SellerProfileData | null;
  loading: boolean;
  error: string | null;
  isApproved: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setAuthToken: (token: string) => void;
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  refreshProfile: () => Promise<void>;
}

const SellerAuthContext = createContext<SellerAuthContextType | undefined>(undefined);

export function SellerAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SellerUser | null>(null);
  const [profile, setProfile] = useState<SellerProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedToken =
        localStorage.getItem("seller_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("buyer_token");
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
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch user auth profile
      const userRes = await fetch("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) {
        setToken(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const userData = await userRes.json();
      const authUser = userData.data?.user || userData.data;
      setUser(authUser);

      // 2. If approved seller, fetch store profile
      if (authUser.sellerStatus === "APPROVED") {
        const profileRes = await fetch("/api/v1/seller/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData.data);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load seller profile");
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
        localStorage.setItem("seller_token", receivedToken);
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
      localStorage.removeItem("seller_token");
      localStorage.removeItem("token");
    } catch {}
    setToken(null);
    setUser(null);
    setProfile(null);
    router.push("/test/login");
  };

  const setAuthToken = (newToken: string) => {
    try {
      localStorage.setItem("seller_token", newToken);
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

  const isApproved = user?.sellerStatus === "APPROVED";

  return (
    <SellerAuthContext.Provider
      value={{
        token,
        user,
        profile,
        loading,
        error,
        isApproved,
        login,
        logout,
        setAuthToken,
        fetchWithAuth,
        refreshProfile,
      }}
    >
      {children}
    </SellerAuthContext.Provider>
  );
}

export function useSellerAuth() {
  const ctx = useContext(SellerAuthContext);
  if (!ctx) {
    throw new Error("useSellerAuth must be used within SellerAuthProvider");
  }
  return ctx;
}
