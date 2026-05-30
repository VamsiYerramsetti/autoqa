"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquareMore } from "lucide-react";
import { listPresentations } from "@/lib/api";
import { PresentationRecord } from "@/lib/types";
import { SpeakerShell } from "@/components/speaker/speaker-shell";
import { formatDateTime } from "@/lib/utils";

export default function SpeakerQuestionsPage() {
  const [presentations, setPresentations] = useState<PresentationRecord[]>([]);

  useEffect(() => {
    listPresentations().then((payload) => setPresentations(payload.presentations)).catch(() => setPresentations([]));
  }, []);

  const groupedQuestions = useMemo(() => presentations.flatMap((presentation) => presentation.audienceQuestions.map((question) => ({ presentation, question }))), [presentations]);

  return (
    <SpeakerShell title="Question inbox" subtitle="Review audience questions across all live presentation QR codes in one place.">
      <section className="glass-panel p-6 md:p-8">
        {groupedQuestions.length ? (
          <div className="space-y-4">
            {groupedQuestions.map(({ presentation, question }) => (
              <div key={question.id} className="rounded-[24px] border border-white/8 bg-white/5 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-orange-300">{presentation.title}</div>
                    <div className="mt-3 text-lg font-semibold text-white">{question.question}</div>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/56">
                      <span>{question.attendeeName}</span>
                      <span>{formatDateTime(question.askedAt)}</span>
                      <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.18em] text-[11px]">{question.status}</span>
                    </div>
                  </div>
                  <Link href={`/speaker/presentations/${presentation.id}`} className="text-sm text-white/68 transition hover:text-white">Open presentation</Link>
                </div>

                <div className="mt-4 rounded-[20px] border border-white/8 bg-navy-950/64 p-4 text-sm leading-7 text-white/68">{question.answerPreview}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/4 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><MessageSquareMore className="h-6 w-6 text-orange-300" /></div>
            <div className="mt-5 text-xl font-semibold text-white">No audience questions yet</div>
            <p className="mt-3 text-sm leading-7 text-white/62">Once attendees scan a presentation QR code and ask something, it will show up here in a speaker-friendly inbox.</p>
          </div>
        )}
      </section>
    </SpeakerShell>
  );
}