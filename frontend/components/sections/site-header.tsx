"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="sticky top-0 z-40 border-b border-white/6 bg-navy-950/70 backdrop-blur-xl">
      <div className="container-shell flex h-20 items-center justify-between">
        <Link href="#top" className="group flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/14 bg-gradient-to-br from-royal-500 to-royal-700 shadow-royal"><Sparkles className="h-5 w-5 text-white" /></div><div><div className="font-display text-[1.08rem] font-semibold tracking-[-0.04em] text-white">AutoQ&A</div><div className="text-xs uppercase tracking-[0.24em] text-white/46">The Q&A bot that answers for you</div></div></Link>
        <nav className="hidden items-center gap-8 md:flex"><Link href="#how-it-works" className="text-sm text-white/72 transition hover:text-white">How it works</Link><Link href="#grounded" className="text-sm text-white/72 transition hover:text-white">Grounding</Link><Link href="#try-now" className="text-sm text-white/72 transition hover:text-white">Upload</Link></nav>
        <a href="#try-now"><Button size="md" className="gap-2">Upload now <ChevronRight className="h-4 w-4" /></Button></a>
      </div>
    </motion.header>
  );
}
