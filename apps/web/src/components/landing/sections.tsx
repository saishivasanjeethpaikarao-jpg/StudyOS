import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  MonitorSmartphone,
} from "lucide-react";
import { StudyOSLogo } from "@/components/brand/studyos-logo";
import { Button } from "@/components/ui/button";
import {
  BenefitGrid,
  type BenefitItem,
} from "@/components/marketing/benefit-grid";
import { Reveal } from "./motion";

// Header and footer live in components/marketing so every public page shares them.
export { SiteHeader } from "@/components/marketing/site-header";
export { SiteFooter } from "@/components/marketing/site-footer";

const FEATURES: BenefitItem[] = [
  {
    icon: ClipboardCheck,
    title: "Assignments that make sense",
    body: "Keep the title, due date, subject, priority and progress together instead of rebuilding the picture every day.",
    color: "#F97316",
  },
  {
    icon: CalendarClock,
    title: "Deadline awareness",
    body: "See what is overdue, due today and coming up from the workspace you already use to plan the day.",
    color: "#FB7185",
  },
  {
    icon: BookOpen,
    title: "Subjects with context",
    body: "Give each course its own color and icon, archive it when the term ends, and filter coursework when you need focus.",
    color: "#C084FC",
  },
  {
    icon: ListChecks,
    title: "Tasks for the real work",
    body: "Keep assignments distinct from everyday tasks, then use tasks and subtasks to plan the steps you can actually finish.",
    color: "#8B5CF6",
  },
  {
    icon: CalendarDays,
    title: "A calendar you can act on",
    body: "Turn intention into time by placing tasks into editable blocks across your day and week.",
    color: "#6366F1",
  },
  {
    icon: MonitorSmartphone,
    title: "Responsive by default",
    body: "Use the same student workspace across wide screens, tablets and phones without losing the important controls.",
    color: "#3B82F6",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-16 border-t border-border/50 py-24 md:py-28"
    >
      <div className="container mx-auto max-w-6xl px-4">
        <Reveal className="mx-auto max-w-3xl text-balance text-center">
          <h2 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[44px]">
            Built around the way students plan.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
            Academic context stays close to the daily actions that move work
            forward.
          </p>
        </Reveal>
        <div className="mt-12">
          <BenefitGrid items={FEATURES} />
        </div>
      </div>
    </section>
  );
}

const WORKFLOW = [
  {
    icon: ClipboardCheck,
    title: "Capture the deadline",
    body: "Add the assignment once with its subject, priority and due date.",
  },
  {
    icon: LayoutDashboard,
    title: "Choose today's work",
    body: "Keep the next academic deadline visible while planning ordinary tasks.",
  },
  {
    icon: CalendarDays,
    title: "Make room for it",
    body: "Use time blocks to turn a vague intention into a day you can follow.",
  },
  {
    icon: CheckCircle2,
    title: "See progress clearly",
    body: "Move coursework from not started to in progress and completed.",
  },
];

export function WorkspaceSection() {
  return (
    <section className="border-t border-border/50 py-24">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-3xl bg-[hsl(228_14%_7%)] p-8 text-[hsl(220_13%_93%)] shadow-[0_32px_100px_-40px_hsl(var(--shadow-color)/0.5)] ring-1 ring-white/10 md:p-12">
          <div
            className="landing-grid-dark pointer-events-none absolute inset-0 opacity-45"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgb(249_115_22/0.34),transparent)] blur-2xl motion-safe:animate-[landing-drift_16s_ease-in-out_infinite]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-96 rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.22),transparent)] blur-3xl"
            aria-hidden
          />

          <div className="relative grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <Reveal>
              <StudyOSLogo decorative className="h-11 w-11" />
              <h2 className="mt-6 text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[44px]">
                One calm path from deadline to done.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
                StudyOS connects academic context to the plan you can act on
                today. Nothing important has to live in a separate mental list.
              </p>
            </Reveal>

            <div className="grid gap-3 sm:grid-cols-2">
              {WORKFLOW.map((item, index) => (
                <Reveal key={item.title} delay={90 + index * 70} y={18}>
                  <div className="h-full rounded-2xl bg-white/[0.055] p-5 ring-1 ring-white/10">
                    <item.icon className="h-5 w-5 text-orange-300" />
                    <h3 className="mt-4 text-[15px] font-semibold">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-white/50">
                      {item.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-border/50 py-28">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.15),transparent)] blur-2xl" />
      </div>
      <Reveal className="container mx-auto max-w-2xl px-4 text-center">
        <StudyOSLogo
          decorative
          className="mx-auto h-12 w-12 drop-shadow-[0_12px_24px_rgb(139_92_246/0.24)]"
        />
        <h2 className="mt-6 text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] md:text-[48px]">
          Make space for the work that matters.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-muted-foreground">
          Bring subjects, assignments, deadlines and your daily plan into one
          focused student workspace.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <Button
            size="lg"
            className="h-11 rounded-lg px-5 text-[14px] shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]"
            asChild
          >
            <Link to="/register">
              Create your workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 rounded-lg px-5 text-[14px]"
            asChild
          >
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">
          Subjects · Assignments · Today · Calendar
        </p>
      </Reveal>
    </section>
  );
}
