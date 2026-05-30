"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { getPublicPresentation, submitAudienceQuestion } from "@/lib/api";
import { PublicPresentationResponse } from "@/lib/types";

export default function AudiencePage({ params, searchParams }: { params: { id: string }; searchParams: { token?: string } }) {
  const token = searchParams.token ?? "";
  const [presentation, setPresentation] = useState<PublicPresentationResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [attendeeName, setAttendeeName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) return;
    getPublicPresentation(params.id, token).then(setPresentation).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Couldn't load this presentation."));
  }, [params.id, token]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setError("");
      setSuccess("");
      const payload = await submitAudienceQuestion(params.id, token, question, attendeeName);
      setSuccess(`Question received. AutoQ&A drafted a grounded reply for \"${payload.question.question}\".`);
      setQuestion("");
      setAttendeeName("");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Couldn't submit the question.");
    }
  };

  return (
    <main className="min-h-screen bg-background text-white">
      <div className="container-shell flex min-h-screen items-center justify-center py-20">
        <div className="glass-panel w-full max-w-3xl p-8 md:p-10">
          <div className="eyebrow">Audience Q&A</div>
          <h1 className="mt-6 text-4xl font-semibold text-white md:text-5xl">Ask a grounded question</h1>
          <p className="mt-4 text-base leading-8 text-white/72">Questions submitted here are routed to the speaker workspace for this presentation and answered only from uploaded material and approved clarifications.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-white"><MessageSquare className="h-4 w-4 text-orange-300" /> Presentation</div>
              <div className="mt-3 text-lg font-semibold text-white">{presentation?.title || "Loading presentation..."}</div>
              <div className="mt-2 text-sm text-white/65">Session: {params.id}</div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-white"><ShieldCheck className="h-4 w-4 text-orange-300" /> Grounding promise</div>
              <div className="mt-3 text-sm leading-7 text-white/65">Responses should use uploaded and speaker-approved material only. Unsupported questions should abstain clearly.</div>
            </div>
          </div>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white">Your name</span>
              <input value={attendeeName} onChange={(event) => setAttendeeName(event.target.value)} placeholder="Optional" className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-orange-400/30" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white">Question</span>
              <textarea value={question} onChange={(event) => setQuestion(event.target.value)} required placeholder="Ask about the presentation, slides, or supporting material." className="min-h-[160px] w-full rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-orange-400/30" />
            </label>

            {error ? <div className="rounded-[20px] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
            {success ? <div className="rounded-[20px] border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{success}</div> : null}

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Link href="/" className="text-sm text-white/58 transition hover:text-white">Return to AutoQ&A</Link>
              <button type="submit" className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-royal-500 to-royal-600 px-6 py-3 text-sm font-semibold text-white shadow-royal transition hover:-translate-y-0.5">Send question</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
