import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetCurrentUser, useLogout, UserProfile } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

// Initialize auth token getter for API client
setAuthTokenGetter(() => localStorage.getItem("isp_token"));

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading: isUserLoading, refetch, error } = useGetCurrentUser({
    query: {
      queryKey: ["auth", "me"],
      enabled: !!localStorage.getItem("isp_token"),
      retry: false,
    }
  });

  // Auto-logout when token is invalid or expired
  useEffect(() => {
    if (error && (error as { status?: number }).status === 401) {
      localStorage.removeItem("isp_token");
      setLocation("/login");
    }
  }, [error, setLocation]);

  const logoutMutation = useLogout({
    mutation: {
      onSettled: () => {
        localStorage.removeItem("isp_token");
        setLocation("/login");
      }
    }
  });

  const login = (token: string) => {
    localStorage.setItem("isp_token", token);
    refetch().then(() => {
      setLocation("/dashboard");
    });
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  // If we have a token but no user yet, we are loading
  const hasToken = !!localStorage.getItem("isp_token");
  const isLoading = hasToken && isUserLoading;

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
