"use client";
import { motion } from "framer-motion";
import { ArrowDownRight, FileUp, MessageSquareText, QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const orbit = [
  { label: "Upload", icon: FileUp, top: "15%", left: "12%" },
  { label: "Clarify", icon: MessageSquareText, top: "68%", left: "20%" },
  { label: "Share QR", icon: QrCode, top: "38%", left: "76%" },
  { label: "Grounded", icon: ShieldCheck, top: "76%", left: "74%" },
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-14 md:pt-24">
      <div className="container-shell grid gap-12">
        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="eyebrow"
          >
            Conference-ready Q&A, grounded by design
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08 }}
            className="mt-6 text-5xl font-semibold leading-[0.94] text-white md:text-7xl lg:text-[5.25rem]"
          >
            The <span className="text-orange-400">AI chatbot</span> equipped to answer all your audience <span className="text-orange-400">questions.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.16 }}
            className="mt-6 max-w-4xl text-lg leading-8 text-white/72 md:text-xl"
          >
            Scan one QR code, open the live chatbot, and get answers grounded in your slides and speaker-approved clarifications.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-10 flex flex-col items-start gap-4 sm:flex-row"
          >
            <a href="#try-now">
              <Button size="lg" className="min-w-[188px] gap-2">
                Upload now <ArrowDownRight className="h-5 w-5" />
              </Button>
            </a>
            <a href="#how-it-works">
              <Button variant="secondary" size="lg" className="min-w-[188px]">
                See how it works
              </Button>
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.12 }}
          className="relative mx-auto w-full max-w-6xl"
        >
          <div className="absolute inset-0 -z-10 rounded-[36px] bg-[radial-gradient(circle_at_50%_50%,rgba(29,78,216,0.42),transparent_55%)] blur-3xl" />

          <div className="glass-panel relative overflow-hidden p-5 md:p-6">
            <div className="absolute inset-0 bg-hero-radial opacity-90" />

            <div className="relative z-10 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[24px] border border-white/10 bg-navy-950/72 p-5">
                <div className="text-xs uppercase tracking-[0.24em] text-orange-300">Live workflow</div>
                <div className="mt-3 text-2xl font-semibold text-white">From upload to audience-ready answers</div>

                <div className="mt-6 space-y-4">
                  {[
                    [
                      "Upload material",
                      "Decks, notes, handouts and appendix files are ingested into one source set.",
                    ],
                    [
                      "Clarify intent",
                      "Approve likely questions and explicitly define out-of-scope areas.",
                    ],
                    [
                      "Publish QR",
                      "The audience gets one frictionless entry point for grounded Q&A.",
                    ],
                  ].map(([title, copy], index) => (
                    <motion.div
                      key={title}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 + index * 0.12 }}
                      className="rounded-[22px] border border-white/8 bg-white/5 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                          0{index + 1}
                        </div>
                        <div className="font-medium text-white">{title}</div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/68">{copy}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="relative rounded-[24px] border border-white/10 bg-white/6 p-5">
                <div className="rounded-[20px] border border-white/10 bg-navy-900/78 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-royal-300">Presentation intake</div>
                  <div className="mt-3 rounded-[18px] border border-dashed border-royal-300/30 bg-royal-500/10 p-5 text-center">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-br from-royal-500 to-orange-500" />
                    <div className="mt-3 text-sm font-medium text-white">Drop your files here</div>
                    <div className="mt-1 text-xs text-white/55">PDF · PPTX · DOCX · TXT</div>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-orange-300">Audience view</div>
                      <div className="mt-3 text-lg font-semibold text-white">Scan the QR, ask the bot.</div>
                    </div>
                    <QrCode className="h-5 w-5 text-orange-300" />
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[24px] border border-white/10 bg-navy-950/90 p-4">
                      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-b from-slate-700 via-slate-900 to-slate-950 p-4">
                        <div className="mb-3 h-10 w-10 rounded-2xl bg-white/10" />
                        <div className="h-32 rounded-[22px] border border-white/10 bg-white/5 p-3">
                          <div className="h-14 w-full rounded-[18px] bg-white/10" />
                          <div className="mt-3 space-y-2">
                            <div className="h-3.5 w-5/6 rounded-full bg-orange-300/20" />
                            <div className="h-3.5 w-3/4 rounded-full bg-white/15" />
                            <div className="h-3.5 w-2/3 rounded-full bg-white/15" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-[20px] bg-white/8 p-3 text-sm text-white/84">Scan one QR code to open an audience chatbot for your presentation.</div>
                      <div className="rounded-[20px] bg-orange-500/10 p-3 text-sm text-orange-200">"What slide explains our go-to-market plan?"</div>
                      <div className="rounded-[20px] bg-white/8 p-3 text-sm text-white/84">Answers are drawn only from uploaded material and your approved clarifications.</div>
                    </div>
                  </div>
                </div>

                {orbit.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.label}
                      className="absolute"
                      style={{ top: item.top, left: item.left }}
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 7 + index, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-md">
                        <Icon className="h-4 w-4 text-orange-300" />
                        <span className="text-xs font-medium text-white/90">{item.label}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
