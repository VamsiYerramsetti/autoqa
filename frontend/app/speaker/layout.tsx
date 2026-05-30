"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export default function SpeakerLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, openLoginModal } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    openLoginModal();
    router.push(`/?next=${encodeURIComponent(pathname)}`);
  }, [isAuthenticated, isLoading, openLoginModal, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }

  return <>{children}</>;
}