import { QrCode, ScanSearch, Users, XCircle } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const pillars = [
  { title: "No guessing", copy: "If your material does not support an answer, AutoQ&A abstains clearly.", icon: XCircle },
  { title: "Grounded retrieval", copy: "Answers are constrained to uploaded source material, approved clarification with citations directly from your slide deck.", icon: ScanSearch },
  { title: "One share point", copy: "A single QR code turns your presentation into a live, guided Q&A channel.", icon: QrCode },
  { title: "Connect with audience", copy: "Turn audience questions into a stronger relationship by extending the conversation and making it easier for people to stay connected after the session.", icon: Users },
];

export function TrustSection() {
  return (
    <section id="grounded" className="pt-4 pb-24 md:pt-6 md:pb-32"><div className="container-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]"><Reveal><h2 className="section-title">Built to answer from evidence, not from confidence.</h2></Reveal><div className="grid gap-5 sm:grid-cols-2">{pillars.map((pillar, index) => { const Icon = pillar.icon; return <Reveal key={pillar.title} delay={0.08 + index * 0.06}><div className="glass-panel interactive-panel h-full p-6"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8"><Icon className="h-5 w-5 text-orange-300" /></div><h3 className="mt-6 text-2xl font-semibold text-white">{pillar.title}</h3><p className="mt-3 text-sm leading-7 text-white/67">{pillar.copy}</p></div></Reveal>; })}</div></div></section>
  );
}
