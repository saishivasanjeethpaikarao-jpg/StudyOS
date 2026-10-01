/**
 * Marketing home page. Sections live in components/landing; the shell
 * (header, footer, skip link) is the marketing kit's, shared by every public
 * page. The hero and product story use real StudyOS workspace captures.
 */

import { useSEO, SEO_CONFIGS } from "@/hooks/useSEO";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { FutureStudyPlanSection } from "@/components/landing/ai-section";
import { FaqSection } from "@/components/landing/faq-section";
import { Hero } from "@/components/landing/hero";
import {
  FeaturesSection,
  FinalCta,
  WorkspaceSection,
} from "@/components/landing/sections";
import { StorySection } from "@/components/landing/story-section";

export default function LandingPage() {
  useSEO(SEO_CONFIGS.landing);

  return (
    <MarketingLayout backdrop={false}>
      <Hero />
      <StorySection />
      <FutureStudyPlanSection />
      <FeaturesSection />
      <WorkspaceSection />
      <FaqSection />
      <FinalCta />
    </MarketingLayout>
  );
}
