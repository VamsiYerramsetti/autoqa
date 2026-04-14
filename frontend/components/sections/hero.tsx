"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-14 md:pt-24">
      <div className="container-shell grid gap-12">
        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08 }}
            className="text-5xl font-semibold leading-[0.94] text-white md:text-7xl lg:text-[5.25rem]"
          >
            The <span className="text-orange-400">AI chatbot</span> equipped to answer all your live audience <span className="text-orange-400">questions</span>
            <span className="block">via a QR code.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.16 }}
            className="mt-6 max-w-4xl text-lg leading-8 text-white/72 md:text-xl"
          >
            Upload slides, notes, briefs, and supporting documents in one place. The chatbot is trained on your raw slide deck, speaker notes, and any additional material you upload as well as its clarification session with you. This enables it to fully understand your content and answer audience questions on your behalf.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-10 flex flex-col items-start gap-4 sm:flex-row"
          >
            <a href="#try-now">
              <Button size="lg" className="min-w-[188px]">
                Upload now
              </Button>
            </a>
            <a href="#how-it-works">
              <Button variant="secondary" size="lg" className="min-w-[188px]">
                See how it works
              </Button>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
