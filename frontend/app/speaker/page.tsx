"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { BarChart3, FilePlus2, MessageSquareText, QrCode } from "lucide-react";
import { PresentationRecord } from "@/lib/types";
import { listPresentations } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { SpeakerShell } from "@/components/speaker/speaker-shell";
import { PresentationCard } from "@/components/speaker/presentation-card";

export default function SpeakerHomePage() {
  const [presentations, setPresentations] = useState<PresentationRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listPresentations().then((payload) => setPresentations(payload.presentations)).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Couldn't load the workspace."));
  }, []);

  const totalQuestions = presentations.reduce((sum, presentation) => sum + presentation.audienceQuestions.length, 0);
  const totalScans = presentations.reduce((sum, presentation) => sum + presentation.qrScans, 0);
  const liveCount = presentations.filter((presentation) => presentation.status === "live").length;

  return (
    <SpeakerShell title="Speaker dashboard" subtitle="Manage presentations, launch new grounded Q&A sessions, and keep a clean view of what your audience is asking." actions={<Link href={"/speaker/new" as Route}><Button className="gap-2"><FilePlus2 className="h-4 w-4" /> New presentation</Button></Link>}>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { icon: MessageSquareText, value: totalQuestions, label: "Audience questions" },
          { icon: QrCode, value: totalScans, label: "QR scans tracked" },
          { icon: BarChart3, value: liveCount, label: "Live presentation links" },
        ].map(({ icon: MetricIcon, value, label }) => {
          return (
            <div key={label} className="glass-panel p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/42">{label}</div>
                  <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><MetricIcon className="h-5 w-5 text-orange-300" /></div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="glass-panel p-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-orange-300">Presentations</div>
            <h2 className="mt-3 text-2xl font-semibold text-white">Your recent sessions</h2>
          </div>
          <Link href={"/speaker/questions" as Route} className="text-sm text-white/68 transition hover:text-white">Open question inbox</Link>
        </div>

        {error ? <div className="mt-6 rounded-[20px] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

        <div className="mt-6 grid gap-4">
          {presentations.length ? presentations.map((presentation) => <PresentationCard key={presentation.id} presentation={presentation} />) : <div className="rounded-[24px] border border-dashed border-white/10 bg-white/4 p-8 text-center text-white/62">No presentations yet. Start with <Link href={"/speaker/new" as Route} className="font-medium text-white">New presentation</Link> to launch your first speaker workspace.</div>}
        </div>
      </section>
    </SpeakerShell>
  );
}