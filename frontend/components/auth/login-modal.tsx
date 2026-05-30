"use client";

import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LockKeyhole, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (username: string, password: string) => Promise<void>;
}

export function LoginModal({ isOpen, isSubmitting, error, onClose, onSubmit }: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(username, password);
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close login dialog" className="absolute inset-0 bg-[rgba(4,12,28,0.72)] backdrop-blur-md" onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 w-full max-w-xl overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,40,0.98),rgba(7,14,32,0.98))] p-7 shadow-[0_32px_120px_rgba(0,0,0,0.45)] md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(59,130,246,0.14),transparent_24%)]" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-200">Secure workspace login</div>
              <h2 className="mt-5 text-3xl font-semibold text-white md:text-[2.3rem]">Sign in before using AutoQ&A</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68">Uploads, clarifications, and QR generation are protected behind a standard username/password login. Enter the credentials configured for your local workspace.</p>

              <form className="mt-7 space-y-4" onSubmit={submit}>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white"><UserRound className="h-4 w-4 text-orange-300" /> Username</span>
                  <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter your username" className="w-full rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-orange-400/30" autoComplete="username" />
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white"><LockKeyhole className="h-4 w-4 text-orange-300" /> Password</span>
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="w-full rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-orange-400/30" autoComplete="current-password" />
                </label>

                {error ? <div className="rounded-[20px] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

                <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-end">
                  <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" className="gap-2" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Log in"}</Button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}