import Link from "next/link";
import { MessageSquare, ShieldCheck } from "lucide-react";

export default function AudiencePage({ params, searchParams }: { params: { id: string }; searchParams: { token?: string } }) {
  return (
    <main className="min-h-screen bg-background text-white">
      <div className="container-shell flex min-h-screen items-center justify-center py-20">
        <div className="glass-panel w-full max-w-2xl p-8 md:p-10">
          <div className="eyebrow">Audience view preview</div>
          <h1 className="mt-6 text-4xl font-semibold text-white md:text-5xl">Ask a grounded question</h1>
          <p className="mt-4 text-base leading-8 text-white/72">This preview route completes the share-link story. It validates the generated URL shape and communicates the grounding promise for audience questions.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-white"><MessageSquare className="h-4 w-4 text-orange-300" /> Session link</div>
              <div className="mt-3 break-all text-sm text-white/65">Token: {searchParams.token ?? "preview"}</div>
              <div className="mt-2 break-all text-sm text-white/65">Session: {params.id}</div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-white"><ShieldCheck className="h-4 w-4 text-orange-300" /> Grounding promise</div>
              <div className="mt-3 text-sm leading-7 text-white/65">Responses should use uploaded and speaker-approved material only. Unsupported questions should abstain clearly.</div>
            </div>
          </div>
          <div className="mt-8"><Link href="/" className="inline-flex rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10">Return to AutoQ&A</Link></div>
        </div>
      </div>
    </main>
  );
}
