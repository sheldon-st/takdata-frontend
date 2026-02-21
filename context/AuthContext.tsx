"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api";
import type { User } from "@/lib/types";

const AuthContext = createContext<User | null>(null);

function AppLoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["me"],
    queryFn: getMe,
    staleTime: Infinity,
    retry: false,
  });

  if (isLoading) return <AppLoadingShell />;

  if ((error as any)?.status === 401) {
    window.location.reload();
    return <AppLoadingShell />;
  }

  return (
    <AuthContext.Provider value={user ?? null}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const useIsAdmin = () => useAuth()?.role === "admin";
