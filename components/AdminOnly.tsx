"use client";

import { useIsAdmin } from "@/context/AuthContext";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminOnly({ children, fallback = null }: Props) {
  return useIsAdmin() ? <>{children}</> : <>{fallback}</>;
}
