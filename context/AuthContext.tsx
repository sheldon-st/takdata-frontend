"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api";
import type { User } from "@/lib/types";

const LOGOUT_URL =
  "https://auth.opengeo.space/application/o/tak-manager/end-session/";

const AuthContext = createContext<User | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["me"],
    queryFn: getMe,
    staleTime: Infinity,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  // 401 means the Authentik session is gone — show a sign-in prompt instead
  // of looping. Traefik will handle the redirect when the user clicks through.
  if ((error as any)?.status === 401) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">Session expired.</p>
          <a href={LOGOUT_URL} className="text-sm underline underline-offset-4">
            Sign in
          </a>
        </div>
      </div>
    );
  }

  // Any other error (endpoint not reachable, 404, etc.) — render the app in
  // read-only mode rather than blocking. All write controls are hidden when
  // user is null.
  return (
    <AuthContext.Provider value={user ?? null}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const useIsAdmin = () => useAuth()?.role === "admin";
