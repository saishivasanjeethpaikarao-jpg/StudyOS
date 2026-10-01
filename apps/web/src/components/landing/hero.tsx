import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudyOSWordmark } from "@/components/brand/studyos-logo";
import { cn } from "@/lib/utils";
import { BorderBeam } from "./border-beam";
import {
  HeadlineReveal,
  introStyle,
  useIntro,
  useReducedMotion,
  useScrollProgress,
} from "./motion";
import { BrowserFrame, ThemedShot, type ShotName } from "./product-shot";

const HEADLINE = [
  { text: "Your studies.", accent: false },
  { text: "Finally under control.", accent: true },
];

const VIEWS: Array<{
  id: ShotName;
  label: string;
  icon: typeof LayoutDashboard;
  alt: string;
}> = [
  {
    id: "today",
    label: "Today",
    icon: LayoutDashboard,
    alt: "StudyOS Today view with academic deadlines and the day's tasks",
  },
  {
    id: "assignments",
    label: "Assignments",
    icon: ClipboardCheck,
    alt: "StudyOS Assignments workspace showing coursework, due dates, status and priority",
  },
  {
    id: "subjects",
    label: "Subjects",
    icon: BookOpen,
    alt: "StudyOS Subjects workspace organizing courses by color",
  },
  {
    id: "calendar-week",
    label: "Calendar",
    icon: CalendarDays,
    alt: "StudyOS weekly calendar with color-coded study and planning blocks",
  },
];

const AUTOPLAY_MS = 4800;

/** Kept for the inherited feature-page hero; it is not part of the StudyOS landing story. */
export const WORKS_WITH = [
  "Claude",
  "ChatGPT",
  "Claude Code",
  "Cursor",
  "VS Code",
  "Any MCP client",
];

function Showcase({ ready, reduced }: { ready: boolean; reduced: boolean }) {
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const tiltRef = useScrollProgress<HTMLDivElement>("page", { distance: 560 });

  React.useEffect(() => {
    if (paused || reduced || !ready) return;
    const id = window.setTimeout(
      () => setActive((i) => (i + 1) % VIEWS.length),
      AUTOPLAY_MS
    );
    return () => window.clearTimeout(id);
  }, [active, paused, reduced, ready]);

  return (
    <div
      className="relative mx-auto mt-14 max-w-[1120px] md:mt-16"
      style={
        reduced
          ? undefined
          : {
              transition:
                "opacity 1000ms cubic-bezier(0.2,0.8,0.2,1), transform 1200ms cubic-bezier(0.2,0.8,0.2,1)",
              transitionDelay: "520ms",
              opacity: ready ? 1 : 0,
              transform: ready ? "none" : "translateY(48px)",
            }
      }
    >
      {/* Scroll-linked tilt: leans back at the top of the page, flattens as you scroll. */}
      <div
        ref={tiltRef}
        className="relative [--p:0] [perspective:2200px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="relative origin-top will-change-transform"
          style={
            reduced
              ? undefined
              : {
                  transform:
                    "rotateX(calc((1 - var(--p)) * 14deg)) scale(calc(0.94 + var(--p) * 0.06)) translateY(calc((1 - var(--p)) * -8px))",
                }
          }
        >
          {/* Sunrise behind the window: amber core fading through orange to rose. */}
          <div className="pointer-events-none absolute -inset-x-16 -top-16 bottom-[20%] -z-10 rounded-[48px] bg-[radial-gradient(55%_65%_at_50%_18%,rgb(251_191_36/0.38),rgb(249_115_22/0.24)_38%,rgb(244_63_94/0.12)_62%,transparent_78%)] blur-2xl dark:bg-[radial-gradient(55%_65%_at_50%_18%,rgb(251_191_36/0.26),rgb(249_115_22/0.2)_38%,rgb(244_63_94/0.12)_62%,transparent_78%)]" />
          <BrowserFrame className="relative">
            <div className="relative aspect-[16/10] w-full overflow-hidden">
              {VIEWS.map((view, i) => (
                <div
                  key={view.id}
                  className={cn(
                    "absolute inset-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                    i === active
                      ? "opacity-100 [transform:none]"
                      : "opacity-0 [transform:scale(1.015)]"
                  )}
                  aria-hidden={i !== active}
                >
                  <ThemedShot
                    name={view.id}
                    alt={view.alt}
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>
            <BorderBeam size={260} duration={12} delay={2} />
          </BrowserFrame>

          {/* Floating details, parallaxed against the frame. */}
          <FloatingChip
            className="-left-10 top-[22%]"
            depth={34}
            visible={ready}
            delay={1250}
            reduced={reduced}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ClipboardCheck className="h-3.5 w-3.5" />
            </span>
            <span className="leading-tight">
              <span className="block text-[12px] font-semibold text-foreground">
                3 assignments due soon
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Everything visible at a glance
              </span>
            </span>
          </FloatingChip>

          <FloatingChip
            className="-right-8 top-[9%] !p-0"
            depth={-26}
            visible={ready}
            delay={1450}
            reduced={reduced}
          >
            <div
              className="w-[204px] rounded-md border-l-[3px] px-2 py-1"
              style={{
                backgroundColor: "rgba(239,68,68,0.15)",
                borderColor: "rgba(239,68,68,0.6)",
              }}
            >
              <p className="truncate text-sm font-medium text-foreground">
                Calculus problem set
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Due tomorrow · High priority
              </p>
            </div>
          </FloatingChip>

          <FloatingChip
            className="-right-6 bottom-[14%]"
            depth={22}
            visible={ready}
            delay={1650}
            reduced={reduced}
          >
            <span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_0_3px_rgb(139_92_246/0.18)]" />
            <span className="text-[12px] font-semibold text-foreground">
              Biology review
            </span>
            <span className="text-[11px] text-muted-foreground">
              4:00–5:00 PM
            </span>
          </FloatingChip>
        </div>
      </div>

      {/* View switcher with autoplay progress. */}
      <div className="mt-8 flex justify-center">
        <div
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1 backdrop-blur"
          role="tablist"
          aria-label="Product views"
        >
          {VIEWS.map((view, i) => (
            <button
              key={view.id}
              role="tab"
              aria-selected={i === active}
              onClick={() => {
                setActive(i);
                setPaused(true);
              }}
              className={cn(
                "relative flex items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors sm:px-3.5 sm:text-[13px]",
                i === active
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <view.icon
                className={cn(
                  "hidden h-3.5 w-3.5 sm:block",
                  i === active ? "text-primary" : ""
                )}
              />
              <span>{view.label}</span>
              {i === active && !paused && !reduced && ready && (
                <span
                  key={`progress-${active}`}
                  className="absolute inset-x-3 bottom-0.5 h-[2px] origin-left rounded-full bg-primary/70"
                  style={{
                    animation: `landing-progress ${AUTOPLAY_MS}ms linear forwards`,
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A small card floating beside a product frame, parallaxed with the page scroll (`--p`). */
export function FloatingChip({
  children,
  className,
  depth,
  visible,
  delay,
  reduced,
}: {
  children: React.ReactNode;
  className?: string;
  /** Parallax distance in px as the page scrolls from 0 → 1 progress. */
  depth: number;
  visible: boolean;
  delay: number;
  reduced: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 hidden lg:block",
        className
      )}
      style={
        reduced
          ? undefined
          : { transform: `translateY(calc(var(--p) * ${depth}px))` }
      }
    >
      <div
        className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/90 p-2.5 pr-3.5 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.25)] backdrop-blur-md dark:border-white/10 dark:bg-[hsl(228_14%_11%/0.92)]"
        style={
          reduced
            ? undefined
            : {
                transition:
                  "opacity 600ms ease, transform 700ms cubic-bezier(0.34,1.56,0.64,1)",
                transitionDelay: `${delay}ms`,
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : "translateY(10px) scale(0.92)",
              }
        }
      >
        {children}
      </div>
    </div>
  );
}

export function Hero() {
  const ready = useIntro();
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden pb-20 pt-16 md:pb-28 md:pt-24">
      {/* Backdrop: fine grid + drifting glow. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="landing-grid absolute inset-0 opacity-70 dark:opacity-40" />
        <div
          className="absolute left-1/2 top-[-160px] h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.16),transparent)] blur-2xl motion-safe:animate-[landing-drift_18s_ease-in-out_infinite]"
          style={{ opacity: ready ? 1 : 0, transition: "opacity 1400ms ease" }}
        />
        {/* Morning light: a rose glow on the left, amber on the right. */}
        <div className="absolute left-[-6%] top-[140px] h-[380px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(244_63_94/0.13),transparent)] blur-2xl dark:bg-[radial-gradient(closest-side,rgb(244_63_94/0.16),transparent)]" />
        <div className="absolute right-[-4%] top-[60px] h-[400px] w-[540px] rounded-full bg-[radial-gradient(closest-side,rgb(245_158_11/0.18),transparent)] blur-2xl" />
      </div>

      <div className="container mx-auto max-w-6xl px-4 text-center">
        <div style={introStyle(ready, 0, reduced)}>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-border/70 bg-background/70 py-1.5 pl-2 pr-3 text-[12px] font-medium text-muted-foreground shadow-sm backdrop-blur">
            <StudyOSWordmark className="h-5" />
            <span className="h-3 w-px bg-border" aria-hidden />
            Your study life, in one place
          </span>
        </div>

        <h1 className="mx-auto mt-7 max-w-4xl text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[56px] md:text-[68px]">
          <HeadlineReveal lines={HEADLINE} ready={ready} reduced={reduced} />
        </h1>

        <p
          className="mx-auto mt-6 max-w-2xl text-balance text-[16px] leading-relaxed text-muted-foreground md:text-[18px]"
          style={introStyle(ready, 520, reduced)}
        >
          Assignments, subjects, deadlines and your daily plan — together in one
          calm workspace.
        </p>

        <div
          className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row"
          style={introStyle(ready, 640, reduced)}
        >
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
            className="h-11 rounded-lg bg-background/70 px-5 text-[14px] backdrop-blur"
            asChild
          >
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>

        <p
          className="mt-5 text-[12px] text-muted-foreground"
          style={introStyle(ready, 760, reduced)}
        >
          Available in the current StudyOS development build
        </p>

        <Showcase ready={ready} reduced={reduced} />
      </div>
    </section>
  );
}
