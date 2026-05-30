"use client";

import { AutoQAWorkspace } from "@/components/autoqa-workspace";
import { SpeakerShell } from "@/components/speaker/speaker-shell";

export default function SpeakerNewPresentationPage() {
  return (
    <SpeakerShell title="New presentation" subtitle="Launch the full three-step AutoQ&A setup flow for a new presentation workspace.">
      <AutoQAWorkspace embedded />
    </SpeakerShell>
  );
}