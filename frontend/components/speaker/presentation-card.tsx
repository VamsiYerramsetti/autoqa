import Link from "next/link";
import { ArrowUpRight, MessageSquare, QrCode, ScanLine } from "lucide-react";
import { PresentationRecord } from "@/lib/types";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

export function PresentationCard({ presentation }: { presentation: PresentationRecord }) {
  return (
    <div className="interactive-panel rounded-[28px] border border-white/8 bg-white/5 p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/58">{presentation.status}</div>
          <h2 className="mt-4 text-2xl font-semibold text-white">{presentation.title}</h2>
          <p className="mt-2 text-sm text-white/58">Updated {formatRelativeTime(presentation.updatedAt)} · Created {formatDateTime(presentation.createdAt)}</p>
        </div>
        <Link href={`/speaker/presentations/${presentation.id}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10">Open <ArrowUpRight className="h-4 w-4" /></Link>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-[20px] border border-white/8 bg-navy-950/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white"><MessageSquare className="h-4 w-4 text-orange-300" /> Questions</div>
          <div className="mt-3 text-2xl font-semibold text-white">{presentation.audienceQuestions.length}</div>
        </div>
        <div className="rounded-[20px] border border-white/8 bg-navy-950/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white"><ScanLine className="h-4 w-4 text-orange-300" /> QR scans</div>
          <div className="mt-3 text-2xl font-semibold text-white">{presentation.qrScans}</div>
        </div>
        <div className="rounded-[20px] border border-white/8 bg-navy-950/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white"><QrCode className="h-4 w-4 text-orange-300" /> Share status</div>
          <div className="mt-3 text-sm text-white/70">{presentation.shareUrl ? "QR ready to share" : "Generate QR after clarifications"}</div>
        </div>
      </div>
    </div>
  );
}