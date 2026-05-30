"use client";

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthSession, loginWithPassword, logoutFromSession, registerAccount } from "@/lib/api";
import { AuthenticatedUser, RegisterAccountInput } from "@/lib/types";
import { LoginModal } from "./login-modal";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthenticatedUser | null;
  openLoginModal: () => void;
  requireLogin: () => Promise<boolean>;
  logout: () => Promise<void>;
  register: (input: RegisterAccountInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const loginWaiters = useRef<Array<(didLogin: boolean) => void>>([]);

  const resolveWaiters = (didLogin: boolean) => {
    loginWaiters.current.forEach((resolve) => resolve(didLogin));
    loginWaiters.current = [];
  };

  const refreshSession = async () => {
    try {
      const session = await getAuthSession();
      setUser(session.user);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const openLoginModal = () => {
    setError("");
    setIsModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsModalOpen(false);
    setError("");
    resolveWaiters(false);
  };

  const requireLogin = async () => {
    if (user) return true;

    openLoginModal();
    return new Promise<boolean>((resolve) => {
      loginWaiters.current.push(resolve);
    });
  };

  const submitLogin = async (username: string, password: string) => {
    try {
      setIsSubmitting(true);
      setError("");
      const session = await loginWithPassword(username, password);
      setUser(session.user);
      setIsModalOpen(false);
      resolveWaiters(true);
      if (!pathname.startsWith("/speaker")) {
        router.push("/speaker");
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await logoutFromSession();
    setUser(null);
    if (pathname.startsWith("/speaker")) {
      router.push("/");
    }
  };

  const register = async (input: RegisterAccountInput) => {
    const session = await registerAccount(input);
    setUser(session.user);
    router.push("/speaker");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: Boolean(user), isLoading, user, openLoginModal, requireLogin, logout, register }}>
      {children}
      <LoginModal isOpen={isModalOpen} isSubmitting={isSubmitting} error={error} onClose={closeLoginModal} onSubmit={submitLogin} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}