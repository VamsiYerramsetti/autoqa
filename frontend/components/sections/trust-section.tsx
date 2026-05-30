import { CheckCheck, LockKeyhole, ScanSearch, XCircle } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const pillars = [
  { title: "Uploaded content is the ground truth", copy: "Answers are constrained to the material you provided.", icon: ScanSearch },
  { title: "Speaker clarifications sharpen quality", copy: "Predicted audience questions let you shape priority topics before the room asks them.", icon: CheckCheck },
  { title: "Abstain when unsupported", copy: "When the deck or notes do not support a response, the system declines instead of guessing.", icon: XCircle },
  { title: "Designed for enterprise confidence", copy: "No sign-in in this version, but the architecture stays ready for future auth and governance.", icon: LockKeyhole },
];

export function TrustSection() {
  return (
    <section id="grounded" className="py-24 md:py-32"><div className="container-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]"><Reveal><span className="eyebrow">Grounding & trust</span><h2 className="section-title mt-6">Built to answer from evidence, not from confidence.</h2><p className="section-copy">The product promise is simple: answers should be traceable to what the speaker uploaded and explicitly approved.</p></Reveal><div className="grid gap-5 sm:grid-cols-2">{pillars.map((pillar, index) => { const Icon = pillar.icon; return <Reveal key={pillar.title} delay={0.08 + index * 0.06}><div className="glass-panel h-full p-6"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8"><Icon className="h-5 w-5 text-orange-300" /></div><h3 className="mt-6 text-2xl font-semibold text-white">{pillar.title}</h3><p className="mt-3 text-sm leading-7 text-white/67">{pillar.copy}</p></div></Reveal>; })}</div></div></section>
  );
}
