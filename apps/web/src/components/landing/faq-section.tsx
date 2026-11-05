/** Home-page FAQ. The same copy also feeds the FAQPage structured data. */

import { FaqSection as KitFaqSection } from "@/components/marketing/faq-section";
import type { MarketingFaq } from "@/content/marketing/types";

const FAQS: MarketingFaq[] = [
  {
    question: "What can I use in StudyOS today?",
    answer:
      "The current development build includes a Today planner, tasks, calendar time blocks, Subjects, Assignments, assignment statuses and due-date awareness in a responsive student workspace.",
  },
  {
    question: "How are Assignments different from Tasks?",
    answer:
      "An Assignment holds the academic context: subject, deadline, priority and status. Tasks hold the concrete actions you plan into a day. Keeping them distinct makes both easier to understand.",
  },
  {
    question: "Does StudyOS create Study Sessions automatically?",
    answer:
      "Not yet. Study Sessions are a coming-soon capability. The current build does not automatically split an assignment into sessions or claim to provide AI study planning.",
  },
  {
    question: "Can I download the desktop or Android app?",
    answer:
      "There is no public StudyOS desktop or Android release in this phase. The current web workspace is responsive, while native packaging and release work remain separate future milestones.",
  },
  {
    question: "Where can I find the source code and contribute?",
    answer:
      "StudyOS is completely open source. You can explore the codebase, report issues, suggest new academic tools, and track progress on GitHub.",
    link: {
      label: "View StudyOS on GitHub",
      href: "https://github.com/saishivasanjeethpaikarao-jpg/StudyOS",
    },
  },
];

export function FaqSection() {
  return (
    <KitFaqSection
      heading="Good questions, honest answers."
      lead="StudyOS is still in active development, so this page separates what works now from what comes next."
      items={FAQS}
      className="py-24"
    />
  );
}
