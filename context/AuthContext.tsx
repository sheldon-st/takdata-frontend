"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe, isApiError } from "@/lib/api";
import type { User } from "@/lib/types";

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

  // 401 means the Authentik session is gone — route users back through the app
  // domain so forward-auth can send them to the right login flow.
  if (isApiError(error, 401)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">Session expired.</p>
          {/* Full reload, not client-side navigation: the request has to pass
              through the proxy so forward-auth can redirect to the login flow. */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm underline underline-offset-4"
          >
            Sign in
          </button>
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
// Default true so that, before /me resolves or when it fails, the UI assumes
// auth is on (safer — hides nothing it shouldn't). Backend is source of truth.
export const useAuthEnabled = () => useAuth()?.auth_enabled ?? true;
