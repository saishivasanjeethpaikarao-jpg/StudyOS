/**
 * Future-facing StudyOS section. The file name is retained to avoid a broad
 * component move, but the experience is intentionally not marketed as live AI.
 */

import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
} from "lucide-react";
import { Reveal } from "./motion";

const SESSIONS = [
  {
    label: "Understand the brief",
    detail: "Tuesday · 35 min",
    color: "#fb7185",
  },
  {
    label: "Work through key problems",
    detail: "Thursday · 60 min",
    color: "#a78bfa",
  },
  {
    label: "Review before submission",
    detail: "Sunday · 30 min",
    color: "#60a5fa",
  },
];

function StudyPlanPreview() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[32px] bg-[radial-gradient(50%_55%_at_55%_45%,rgb(139_92_246/0.2),transparent_72%)] blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[hsl(228_14%_8%)] text-white shadow-[0_28px_90px_-34px_rgb(0_0_0/0.7)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-400/15 text-orange-300">
              <ClipboardCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold">Research essay</p>
              <p className="text-[11px] text-white/45">
                History · Due in 8 days
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
            Concept preview
          </span>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[0.86fr_auto_1.14fr] sm:items-center sm:p-6">
          <div className="rounded-xl bg-white/[0.05] p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-300">
              <BookOpen className="h-3.5 w-3.5" />
              Assignment
            </div>
            <p className="mt-3 text-[15px] font-semibold">
              Industrial Revolution essay
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-white/50">
              One deadline with enough room to make a thoughtful plan.
            </p>
          </div>

          <ArrowRight
            className="mx-auto h-5 w-5 rotate-90 text-white/25 sm:rotate-0"
            aria-hidden
          />

          <div className="space-y-2.5">
            {SESSIONS.map((session) => (
              <div
                key={session.label}
                className="flex items-center gap-3 rounded-xl bg-white/[0.05] p-3 ring-1 ring-white/10"
              >
                <span
                  className="h-9 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: session.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">
                    {session.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/45">
                    {session.detail}
                  </p>
                </div>
                <CalendarClock className="ml-auto h-4 w-4 shrink-0 text-white/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FutureStudyPlanSection() {
  return (
    <section
      id="study-sessions"
      className="relative scroll-mt-16 overflow-hidden border-t border-border/50 py-24 md:py-32"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -right-40 top-10 h-[560px] w-[760px] rounded-full bg-[radial-gradient(closest-side,rgb(249_115_22/0.14),transparent)] blur-2xl" />
        <div className="absolute -left-28 bottom-0 h-[420px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.13),transparent)] blur-2xl" />
      </div>

      <div className="container mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-[0.76fr_1.24fr] lg:gap-16">
        <Reveal className="mx-auto max-w-2xl lg:mx-0">
          <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            Academic Execution Engine
          </span>
          <h2 className="mt-5 text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[48px]">
            From assignment to study plan.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground md:text-[17px]">
            StudyOS turns large assignments, lectures, and exams into manageable
            Study Sessions that fit around your day. Time block your study sessions,
            synchronize with FocusTube, and track your daily academic mastery.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-500">
              ✓ Released across Web, Windows & Android
            </span>
          </div>
        </Reveal>

        <Reveal delay={140} y={28} className="min-w-0">
          <StudyPlanPreview />
        </Reveal>
      </div>
    </section>
  );
}
