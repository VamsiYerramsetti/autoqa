"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { isAuthenticated, isLoading, openLoginModal, logout, user } = useAuth();

  return (
    <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="sticky top-0 z-50 border-b border-white/10 bg-navy-950/55 shadow-[0_10px_40px_rgba(3,10,24,0.22)] backdrop-blur-2xl supports-[backdrop-filter]:bg-navy-950/40">
      <div className="container-shell flex h-20 items-center justify-between">
        <Link href="/" className="group flex items-center gap-3 transition-transform duration-300 hover:-translate-y-0.5"><div className="interactive-ring flex h-11 w-11 items-center justify-center rounded-2xl border border-white/14 bg-gradient-to-br from-royal-500 to-royal-700 shadow-royal"><Sparkles className="h-5 w-5 text-white transition-transform duration-300 group-hover:scale-110" /></div><div><div className="font-display text-[1.08rem] font-semibold tracking-[-0.04em] text-white">AutoQ&A</div><div className="text-xs uppercase tracking-[0.24em] text-white/46">The Q&A bot that answers for you</div></div></Link>
        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-8 md:flex"><Link href="/#how-it-works" className="text-sm text-white/72 transition duration-300 hover:-translate-y-0.5 hover:text-white">How it works</Link><Link href="/#grounded" className="text-sm text-white/72 transition duration-300 hover:-translate-y-0.5 hover:text-white">Grounding</Link><Link href="/speaker" className="text-sm text-white/72 transition duration-300 hover:-translate-y-0.5 hover:text-white">Speaker workspace</Link></nav>
          {isAuthenticated && user ? <div className="hidden rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/76 md:block">Signed in as <span className="font-semibold text-white">{user.displayName}</span></div> : null}
          {isAuthenticated ? (
            <>
              <Link href="/speaker"><Button size="sm" className="gap-2"><ArrowRight className="h-4 w-4" /> Workspace</Button></Link>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => void logout()}><LogOut className="h-4 w-4" /> Log out</Button>
            </>
          ) : (
            <>
              <Link href="/create-account"><Button variant="secondary" size="sm">Create account</Button></Link>
              <Button size="sm" onClick={() => openLoginModal()} disabled={isLoading}>Log in</Button>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
