import { randomUUID } from "crypto";

export function generateClarificationQuestions(fileNames: string[]) {
  const focalTopic = fileNames[0]?.replace(/\.[^.]+$/, "") || "the presentation";
  return [
    { id: randomUUID(), question: `What is the core message of ${focalTopic}?`, answerHint: "Summarize the main thesis and why it matters to the audience.", status: "approved" as const },
    { id: randomUUID(), question: "Which supporting data points should be emphasized during Q&A?", answerHint: "Point the system to the slides, exhibits, or speaker notes you trust most.", status: "edited" as const, note: "Prioritize slides 6–9 and appendix A." },
    { id: randomUUID(), question: "Which questions should be treated as out of scope?", answerHint: "Mark topics that should abstain unless explicitly covered by uploaded content.", status: "out-of-scope" as const, note: "Future roadmap and unpublished financial details." },
  ];
}
