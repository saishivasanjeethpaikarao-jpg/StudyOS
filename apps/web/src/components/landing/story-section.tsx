/**
 * The StudyOS product story, told with the landing page's existing pinned
 * scroll treatment and real captures from the current student workspace.
 */

import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
} from "lucide-react";
import {
  StoryPinned,
  type PinnedStep,
} from "@/components/marketing/story-pinned";
import { Reveal } from "./motion";
import { ThemedShot, type ShotName } from "./product-shot";

interface Step {
  shot: ShotName;
  icon: typeof LayoutDashboard;
  eyebrow: string;
  title: string;
  body: string;
  zoom: { scale: number; origin: string };
}

const STEPS: Step[] = [
  {
    shot: "today",
    icon: LayoutDashboard,
    eyebrow: "Today",
    title: "Open StudyOS and know what needs your attention.",
    body: "See academic deadlines beside the tasks you plan for today. The important work stays visible without turning your day into noise.",
    zoom: { scale: 1, origin: "50% 0%" },
  },
  {
    shot: "assignments",
    icon: ClipboardCheck,
    eyebrow: "Assignments",
    title: "Never wonder what is due next.",
    body: "Track due dates, priority and progress in one assignment workspace. Switch between upcoming, overdue, in-progress and completed work.",
    zoom: { scale: 1.02, origin: "50% 20%" },
  },
  {
    shot: "subjects",
    icon: BookOpen,
    eyebrow: "Subjects",
    title: "Organize school the way you actually study.",
    body: "Keep every course distinct with a name, color and icon, then filter assignments down to the subject you need.",
    zoom: { scale: 1.02, origin: "50% 20%" },
  },
  {
    shot: "calendar-week",
    icon: CalendarDays,
    eyebrow: "Calendar",
    title: "Turn deadlines into a day you can follow.",
    body: "Place tasks into real time blocks and see your week before it gets crowded. StudyOS keeps the plan practical and editable.",
    zoom: { scale: 1, origin: "50% 0%" },
  },
];

const PINNED: PinnedStep[] = STEPS.map((step) => ({
  key: step.shot,
  icon: step.icon,
  eyebrow: step.eyebrow,
  title: step.title,
  body: step.body,
  still: (
    <ThemedShot
      name={step.shot}
      alt={`${step.title} Shown in the real StudyOS workspace.`}
      focusMobile
      className="absolute inset-0 h-full object-cover object-top"
    />
  ),
  zoom: step.zoom,
}));

export function StorySection() {
  return (
    <StoryPinned
      id="how-it-works"
      steps={PINNED}
      className="py-24"
      header={
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[44px]">
            Your school life should not be scattered everywhere.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
            Subjects, assignments, deadlines and your daily plan belong
            together. Every view below is captured from the real StudyOS
            application.
          </p>
        </Reveal>
      }
    />
  );
}
