import { FileUp, Fingerprint, MessageSquareMore, QrCode, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const steps = [
  { title: "Upload material", copy: "The chatbot is trained on your raw slide deck, speaker notes, and any additional material you upload, enabling it to fully understand your content and answer audience questions on your behalf.", icon: FileUp, accent: "from-royal-500/30 to-royal-600/5", cardClass: "bg-white/[0.04]" },
  { title: "Give clarifications", copy: "AutoQ&A will engange in a short chat with you and ask you clarifications to fill any knowledge gaps.", icon: MessageSquareMore, accent: "from-orange-500/18 to-royal-500/6", cardClass: "bg-royal-950/68" },
  { title: "Share QR code", copy: "By scanning the QR code displayed on the slide, the audience is taken to your web-based chatbot trained on the presentation data, where they can ask presentation-related questions, anonymously if they prefer.", icon: QrCode, accent: "from-royal-400/18 to-orange-500/8", cardClass: "bg-white/[0.04]" },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="pt-14 pb-10 md:pt-16 md:pb-12">
      <div className="container-shell">
        <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <Reveal delay={0.08}>
            <div className="glass-panel interactive-panel relative h-full overflow-hidden p-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h3 className="text-3xl font-semibold text-white">Easy three step setup</h3>
                </div>
                <Fingerprint className="h-10 w-10 text-orange-300" />
              </div>

              <div className="mt-8 space-y-5">
                {[
                  ["Question trends", "Presenters can see aggregated insights, recurring themes, and rising audience interests as questions come in."],
                  ["Audience simplicity", "One QR code opens a live chatbot that answers only from your presentation."],
                  ["Direct follow-up", "Not satisfied with the answer? Jump into the chat yourself and respond directly to the audience member."],
                ].map(([title, copy]) => (
                  <div key={title} className="interactive-panel rounded-[22px] border border-white/8 bg-white/5 p-5">
                    <div className="font-medium text-white">{title}</div>
                    <p className="mt-2 text-sm text-white/66">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <Reveal key={step.title} delay={0.12 + index * 0.08}>
                  <div className={`glass-panel interactive-panel relative h-full overflow-hidden p-6 ${step.cardClass}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${step.accent}`} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/46">0{index + 1}</div>
                      </div>

                      <h3 className="mt-10 text-2xl font-semibold text-white">{step.title}</h3>
                      <p className="mt-4 text-sm leading-7 text-white/68">{step.copy}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
