"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}