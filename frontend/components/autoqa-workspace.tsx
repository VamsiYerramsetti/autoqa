"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, FileCheck2, LoaderCircle, MessageSquareQuote, QrCode, Sparkles, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { generateQr, saveClarifications, uploadFiles } from "@/lib/api";
import { ClarificationItem } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";

type FlowStep = "upload" | "processing" | "clarify" | "share";
const supportedFormats = ["PDF", "PPTX", "DOCX", "TXT"];
const MIN_PROCESSING_MS = 5200;
const trainingPhrases = [
  "Training on your presentation language.",
  "Linking slides, notes, and supporting documents.",
  "Drafting likely audience questions.",
  "Preparing a grounded Q+A workspace.",
];
const trainingSignals = ["Reading slides", "Mapping context", "Drafting Q+A", "Readying review"];
const clarificationStatusLabels: Record<ClarificationItem["status"], string> = {
  approved: "Approve",
  edited: "Refine",
  "out-of-scope": "Skip",
};

export function AutoQAWorkspace() {
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<FlowStep>("upload");
  const [progress, setProgress] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clarifications, setClarifications] = useState<ClarificationItem[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [activePhrase, setActivePhrase] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const mergeFiles = (incomingFiles: File[]) => {
    setFiles((currentFiles) => {
      const mergedFiles = [...currentFiles];

      incomingFiles.forEach((file) => {
        const alreadyIncluded = mergedFiles.some(
          (existingFile) =>
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.lastModified === file.lastModified,
        );

        if (!alreadyIncluded && mergedFiles.length < 8) {
          mergedFiles.push(file);
        }
      });

      return mergedFiles;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => { setError(""); mergeFiles(acceptedFiles); },
    multiple: true,
    maxFiles: 8,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"]
    }
  });

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const beginProgress = () => { if (intervalRef.current) clearInterval(intervalRef.current); setProgress(6); intervalRef.current = setInterval(() => setProgress((v) => v >= 88 ? v : v + Math.max(2, Math.round((92 - v) / 8))), 180); };
  const finishProgress = () => { if (intervalRef.current) clearInterval(intervalRef.current); setProgress(100); setTimeout(() => setProgress(0), 600); };

  useEffect(() => {
    if (step !== "processing") {
      setActivePhrase(0);
      return;
    }

    const phraseTimer = setInterval(() => {
      setActivePhrase((value) => (value + 1) % trainingPhrases.length);
    }, 1400);

    return () => clearInterval(phraseTimer);
  }, [step]);

  const handleUpload = async () => {
    if (!files.length) { setError("Add at least one presentation asset to continue."); return; }
    try {
      setIsBusy(true); setError(""); setStep("processing"); beginProgress();
      const [payload] = await Promise.all([
        uploadFiles(files),
        new Promise((resolve) => setTimeout(resolve, MIN_PROCESSING_MS)),
      ]);
      finishProgress();
      setSessionId(payload.sessionId); setClarifications(payload.clarifications);
      setTimeout(() => setStep("clarify"), 640);
    } catch (err) {
      setStep("upload"); setError(err instanceof Error ? err.message : "Upload failed.");
    } finally { setIsBusy(false); if (intervalRef.current) clearInterval(intervalRef.current); }
  };

  const updateClarification = (id: string, field: keyof ClarificationItem, value: string) => setClarifications((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const finalize = async () => { if (!sessionId) return; try { setIsBusy(true); await saveClarifications(sessionId, clarifications); const qr = await generateQr(sessionId); setShareUrl(qr.shareUrl); setStep("share"); } catch (err) { setError(err instanceof Error ? err.message : "Unable to save clarifications."); } finally { setIsBusy(false); } };
  const resetFlow = () => { setFiles([]); setStep("upload"); setProgress(0); setSessionId(null); setClarifications([]); setShareUrl(""); setError(""); };
  const copyShareUrl = async () => { if (shareUrl) await navigator.clipboard.writeText(shareUrl); };

  return (
    <section id="try-now" className="pt-14 pb-24 md:pt-20 md:pb-32">
      <div className="container-shell">
        <div className="glass-panel interactive-panel overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[0.84fr_1.16fr]">
            <div className="border-b border-white/6 bg-gradient-to-b from-royal-700/14 via-royal-900/10 to-transparent p-8 lg:border-b-0 lg:border-r lg:p-10">
              <h2 className="text-4xl font-semibold text-white md:text-5xl">Try AutoQ&A immediately.</h2>

              <div className="mt-10 space-y-4">
                {[
                  ["01", "Upload material", ""],
                  ["02", "Give clarifications", ""],
                  ["03", "Share QR code", ""],
                ].map(([num, title, copy]) => (
                  <div
                    key={title}
                    className={cn(
                      "interactive-panel rounded-[24px] border p-5 transition duration-300",
                      (step === "upload" && title === "Upload material") ||
                        (step === "processing" && title === "Upload material") ||
                        (step === "clarify" && title === "Give clarifications") ||
                        (step === "share" && title === "Share QR code")
                        ? "border-orange-400/24 bg-orange-500/10"
                        : "border-white/8 bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/9 text-sm font-semibold text-white">{num}</div>
                      <div>
                        <div className="font-medium text-white">{title}</div>
                        {copy ? <div className="text-sm text-white/62">{copy}</div> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="interactive-panel mt-10 rounded-[24px] border border-white/8 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.24em] text-orange-300">Supported formats</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {supportedFormats.map((format) => (
                    <span key={format} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80">
                      {format}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative p-6 md:p-8 lg:p-10">
              <AnimatePresence mode="wait">
                {step === "upload" && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-5"
                  >
                    <div>
                      <div className="text-xs uppercase tracking-[0.28em] text-orange-300">Step 1 of 3</div>
                      <div className="mt-3 text-3xl font-semibold text-white">Upload your presentation material</div>
                    </div>

                    <div
                      {...getRootProps()}
                      className={cn(
                        "interactive-panel group relative cursor-pointer overflow-hidden rounded-[30px] border border-dashed p-8 transition duration-300",
                        isDragActive
                          ? "border-orange-400/60 bg-orange-500/10"
                          : "border-royal-300/25 bg-gradient-to-br from-royal-500/14 via-royal-500/5 to-transparent hover:border-royal-300/40 hover:bg-royal-500/12"
                      )}
                    >
                      <input {...getInputProps()} />
                      <div className="relative z-10 flex flex-col items-center justify-center text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/12 bg-gradient-to-br from-royal-500 to-orange-500 shadow-royal">
                          <UploadCloud className="h-9 w-9 text-white" />
                        </div>
                        <div className="mt-6 text-2xl font-semibold text-white">Drag and drop files</div>
                        <p className="mt-3 max-w-md text-sm leading-6 text-white/68">
                          <span className="block">Drop presentation decks, handouts, speaker notes or any material in the supported formats.</span>
                          <span className="block">AutoQ&A will ingest the content and prepare for the Q&A session.</span>
                        </p>
                        <div className="interactive-chip mt-6 inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-white/84">Browse files</div>
                      </div>
                    </div>

                    {files.length ? (
                      <div className="interactive-panel rounded-[24px] border border-white/8 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.24em] text-white/42">Uploaded files</div>
                            <div className="mt-1 text-sm text-white/62">
                              {files.length} {files.length === 1 ? "file" : "files"} ready · {formatBytes(totalSize)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3">
                          {files.map((file) => (
                            <div key={`${file.name}-${file.size}`} className="interactive-chip flex items-center justify-between gap-4 rounded-[18px] border border-white/8 bg-navy-950/60 px-4 py-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-white">{file.name}</div>
                                <div className="mt-1 text-xs text-white/48">{file.type || "Unknown format"}</div>
                              </div>
                              <div className="shrink-0 text-xs font-medium text-white/58">{formatBytes(file.size)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <Button size="lg" className="w-full justify-center" onClick={handleUpload} disabled={isBusy || !files.length}>
                      Activate AutoQ&A
                    </Button>

                    {error ? <div className="rounded-[20px] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
                  </motion.div>
                )}

                {step === "processing" && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="interactive-panel overflow-hidden rounded-[32px] border border-white/8 bg-white/5 p-8"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.12),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.12),transparent_22%)]" />
                    <div className="relative z-10">
                      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                          <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/18 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-200">
                            <Sparkles className="h-3.5 w-3.5" /> Training in progress
                          </div>
                          <div className="mt-4 text-3xl font-semibold text-white md:text-[2.15rem]">AutoQ+A is training on your data</div>
                          <p className="mt-4 max-w-xl text-sm leading-7 text-white/64">We are building a grounded session from your uploaded material, waiting for the model response, and preparing the clarification workspace that comes next.</p>

                          <div className="mt-8 rounded-[24px] border border-white/8 bg-navy-950/64 p-5">
                            <div className="text-xs uppercase tracking-[0.24em] text-white/42">Current pass</div>
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={trainingPhrases[activePhrase]}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.28 }}
                                className="mt-3 text-xl font-medium text-white"
                              >
                                {trainingPhrases[activePhrase]}
                              </motion.div>
                            </AnimatePresence>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                              {trainingSignals.map((signal, index) => (
                                <div key={signal} className="interactive-chip flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/72">
                                  <div className={cn("h-2.5 w-2.5 rounded-full", index <= activePhrase ? "bg-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.55)]" : "bg-white/18")} />
                                  {signal}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex w-full max-w-[320px] flex-col gap-4 rounded-[30px] border border-white/10 bg-navy-950/70 p-5 shadow-[0_24px_90px_rgba(4,10,28,0.35)]">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs uppercase tracking-[0.24em] text-white/42">Live training view</div>
                              <div className="mt-2 text-lg font-semibold text-white">Signal stack</div>
                            </div>
                            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-orange-400/24 bg-orange-500/10 text-orange-300">
                              <LoaderCircle className="h-7 w-7 animate-spin" />
                            </div>
                          </div>

                          <div className="space-y-3">
                            {[
                              `${files.length} uploaded ${files.length === 1 ? "asset" : "assets"}`,
                              `${formatBytes(totalSize)} queued for grounding`,
                              "Clarification prompts assembling",
                            ].map((item) => (
                              <div key={item} className="interactive-chip rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/74">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 rounded-[24px] border border-white/8 bg-navy-950/82 p-4">
                        <div className="flex items-center justify-between text-sm text-white/58">
                          <span>Training progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="mt-4 rounded-full border border-white/8 bg-white/5 p-2">
                          <motion.div className="h-3 rounded-full bg-gradient-to-r from-orange-500 via-orange-300 to-royal-400" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ ease: [0.22, 1, 0.36, 1] }} />
                        </div>
                        <p className="mt-4 text-sm text-white/56">Holding this screen briefly so the model response can settle before the clarification session opens.</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === "clarify" && (
                  <motion.div
                    key="clarify"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-6"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.28em] text-orange-300">Step 2 of 3</div>
                        <div className="mt-3 text-3xl font-semibold text-white">Clarify the session with AutoQ&amp;A</div>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/64">This step should feel like a short working chat. AutoQ&amp;A asks for scope, intent, and edge-case guidance before anything is shared with your audience.</p>
                      </div>
                      <div className="interactive-chip rounded-[20px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/62">Clarification chat · {sessionId?.slice(0, 8).toUpperCase()}</div>
                    </div>

                    <div className="grid gap-5">
                      {clarifications.map((item, index) => (
                        <div key={item.id} className="interactive-panel rounded-[28px] border border-white/8 bg-white/5 p-5 md:p-6">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex-1">
                              <div className="text-xs uppercase tracking-[0.28em] text-white/40">AutoQ&amp;A asks · 0{index + 1}</div>
                              <div className="mt-3 max-w-2xl rounded-[22px] border border-white/8 bg-navy-950/74 px-5 py-4 text-lg font-medium leading-8 text-white">
                                {item.question}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(["approved", "edited", "out-of-scope"] as const).map((status) => (
                                <button
                                  key={status}
                                  onClick={() => updateClarification(item.id, "status", status)}
                                  className={cn(
                                    "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
                                    item.status === status
                                      ? status === "out-of-scope"
                                        ? "border-orange-400/28 bg-orange-500/14 text-orange-100"
                                        : "border-royal-300/20 bg-royal-500/16 text-white"
                                      : "border-white/10 bg-white/5 text-white/56 hover:text-white/78"
                                  )}
                                >
                                  {clarificationStatusLabels[status]}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div className="interactive-panel rounded-[22px] border border-white/8 bg-navy-950/72 p-4">
                              <div className="flex items-center gap-2 text-sm font-medium text-white">
                                <MessageSquareQuote className="h-4 w-4 text-orange-300" /> Your reply
                              </div>
                              <p className="mt-2 text-xs leading-6 text-white/44">Tell AutoQ&amp;A how to answer this if it comes up live.</p>
                              <textarea value={item.answerHint} onChange={(e) => updateClarification(item.id, "answerHint", e.target.value)} className="mt-3 min-h-[126px] w-full resize-none rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-orange-400/30" />
                            </div>

                            <div className="interactive-panel rounded-[22px] border border-white/8 bg-navy-950/72 p-4">
                              <div className="flex items-center gap-2 text-sm font-medium text-white">
                                <FileCheck2 className="h-4 w-4 text-orange-300" /> Extra context
                              </div>
                              <p className="mt-2 text-xs leading-6 text-white/44">Optional: point it to a slide, appendix, phrase, or boundary to respect.</p>
                              <textarea value={item.note ?? ""} onChange={(e) => updateClarification(item.id, "note", e.target.value)} placeholder="Optional note — direct the model to specific slides or appendices." className="mt-3 min-h-[126px] w-full resize-none rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-orange-400/30" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="interactive-panel flex flex-col gap-3 rounded-[28px] border border-orange-400/16 bg-orange-500/8 p-5 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm text-white/72">Once this short clarification chat is complete, AutoQ&amp;A packages the session into a share-ready QR experience.</p>
                      <Button size="lg" onClick={finalize} disabled={isBusy}>Generate QR preview</Button>
                    </div>

                    {error ? <div className="rounded-[20px] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
                  </motion.div>
                )}

                {step === "share" && (
                  <motion.div
                    key="share"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-6"
                  >
                    <div>
                      <div className="text-xs uppercase tracking-[0.28em] text-orange-300">Step 3 of 3</div>
                      <div className="mt-3 text-3xl font-semibold text-white">QR preview is ready</div>
                    </div>

                    <div className="interactive-panel mx-auto max-w-[420px] rounded-[30px] border border-white/8 bg-white/5 p-6 md:p-7">
                      <div className="mx-auto flex max-w-[240px] flex-col items-center rounded-[28px] border border-white/10 bg-white p-5 text-ink shadow-[0_18px_60px_rgba(8,23,51,0.32)]">
                        <QRCode value={shareUrl || "https://localhost"} size={190} />
                        <div className="mt-5 flex items-center gap-2 text-sm font-semibold">
                          <QrCode className="h-4 w-4 text-orange-500" /> Audience QR
                        </div>
                      </div>

                      <div className="mt-5 flex justify-center">
                        <Button variant="secondary" className="gap-2" onClick={copyShareUrl}>
                          <Copy className="h-4 w-4" /> Copy link
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
