import { AutoQAWorkspace } from "@/components/autoqa-workspace";
import { SiteFooter } from "@/components/sections/footer";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { SiteHeader } from "@/components/sections/site-header";
import { TrustSection } from "@/components/sections/trust-section";
import { WorkflowPreview } from "@/components/sections/workflow-preview";

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <SiteHeader />
      <Hero />
      <HowItWorks />
      <TrustSection />
      <AutoQAWorkspace />
      <WorkflowPreview />
      <SiteFooter />
    </main>
  );
}
