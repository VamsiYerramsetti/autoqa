"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MessageSquareText, QrCode, ScanLine } from "lucide-react";
import { getPresentation } from "@/lib/api";
import { PresentationRecord } from "@/lib/types";
import { SpeakerShell } from "@/components/speaker/speaker-shell";
import { formatDateTime } from "@/lib/utils";

export default function SpeakerPresentationDetailPage() {
  const params = useParams<{ id: string }>();
  const [presentation, setPresentation] = useState<PresentationRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    getPresentation(params.id).then(setPresentation).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Couldn't load the presentation."));
  }, [params?.id]);

  return (
    <SpeakerShell title={presentation?.title || "Presentation detail"} subtitle="Review uploaded assets, clarifications, QR share status, and the question stream for this presentation.">
      {error ? <div className="rounded-[20px] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

      {presentation ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="glass-panel p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: MessageSquareText, value: presentation.audienceQuestions.length, label: "Questions" },
                { icon: ScanLine, value: presentation.qrScans, label: "QR scans" },
                { icon: QrCode, value: presentation.shareUrl ? "Ready" : "Pending", label: "Share QR" },
              ].map(({ icon: StatIcon, value, label }) => {
                return (
                  <div key={label} className="rounded-[22px] border border-white/8 bg-navy-950/60 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-white"><StatIcon className="h-4 w-4 text-orange-300" /> {label}</div>
                    <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-white/8 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.24em] text-white/42">Uploaded assets</div>
                <div className="mt-4 grid gap-3">
                  {presentation.assets.map((asset) => (
                    <div key={asset.name} className="rounded-[18px] border border-white/8 bg-navy-950/60 px-4 py-3 text-sm text-white/72">{asset.name}</div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.24em] text-white/42">Session metadata</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="text-sm text-white/66">Created {formatDateTime(presentation.createdAt)}</div>
                  <div className="text-sm text-white/66">Updated {formatDateTime(presentation.updatedAt)}</div>
                  <div className="text-sm text-white/66">Status {presentation.status}</div>
                  <div className="text-sm text-white/66">Share URL {presentation.shareUrl ? <a href={presentation.shareUrl} className="text-white underline">open</a> : "not generated yet"}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-panel p-6 md:p-8">
            <div className="text-xs uppercase tracking-[0.28em] text-orange-300">Audience questions</div>
            <div className="mt-6 space-y-4">
              {presentation.audienceQuestions.length ? presentation.audienceQuestions.map((question) => (
                <div key={question.id} className="rounded-[24px] border border-white/8 bg-white/5 p-5">
                  <div className="text-lg font-semibold text-white">{question.question}</div>
                  <div className="mt-2 text-sm text-white/56">{question.attendeeName} · {formatDateTime(question.askedAt)}</div>
                  <div className="mt-4 rounded-[18px] border border-white/8 bg-navy-950/60 p-4 text-sm leading-7 text-white/68">{question.answerPreview}</div>
                </div>
              )) : <div className="rounded-[24px] border border-dashed border-white/10 bg-white/4 p-8 text-center text-white/62">Questions from the audience QR code will appear here once attendees start asking.</div>}
            </div>
          </section>
        </div>
      ) : null}
    </SpeakerShell>
  );
}