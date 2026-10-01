import { Link } from "@tanstack/react-router";
import { ArrowRight, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { useSEO, SEO_CONFIGS } from "@/hooks/useSEO";

/** Keep the established route without presenting upstream releases as StudyOS. */
export default function DownloadPage() {
  useSEO(SEO_CONFIGS.download);

  return (
    <MarketingLayout>
      <section className="container mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center px-4 py-20 text-center">
        <img
          src="/studyos-symbol.svg"
          alt=""
          className="mb-7 h-16 w-16"
          width={64}
          height={64}
        />
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" aria-hidden />
          Coming soon
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          StudyOS Desktop is coming soon.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          There is no public StudyOS desktop download yet. You can use the
          current StudyOS workspace in your browser while desktop packaging and
          release work continue.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link to="/register">
              Create your workspace
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/app">Open StudyOS</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
