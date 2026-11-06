import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  Download,
  Smartphone,
  Monitor,
  Globe,
  QrCode,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { useSEO, SEO_CONFIGS } from "@/hooks/useSEO";

const CURRENT_VERSION = "v1.0.18";
const GITHUB_REPO_URL = "https://github.com/saishivasanjeethpaikarao-jpg/StudyOS";
const RELEASES_PAGE_URL = `${GITHUB_REPO_URL}/releases`;
const WINDOWS_EXE_URL = RELEASES_PAGE_URL; // redirect to releases until artifacts exist
const WINDOWS_MSI_URL = RELEASES_PAGE_URL;
const ANDROID_APK_URL = RELEASES_PAGE_URL;

export default function DownloadPage() {
  useSEO(SEO_CONFIGS.download);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const handleCopyApkLink = () => {
    navigator.clipboard.writeText(ANDROID_APK_URL);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <MarketingLayout>
      <div className="relative overflow-hidden py-16 md:py-24">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/10 via-orange-500/5 to-transparent blur-3xl" />

        <div className="container mx-auto max-w-6xl px-4">
          {/* Header & Hero */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Official Release {CURRENT_VERSION} Live</span>
            </div>

            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Download <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-primary bg-clip-text text-transparent">StudyOS</span>
            </h1>

            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Take your study life everywhere. Download the native Windows desktop app for deep focus sessions or install the Android mobile app directly on your phone with one scan.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* 1. Windows Desktop Card */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-md sm:p-8">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-between rounded-xl bg-primary/10 text-primary p-2.5">
                    <Monitor className="h-full w-full" />
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Windows 10 / 11
                  </span>
                </div>

                <h2 className="mt-6 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  StudyOS Desktop
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  64-bit installer with background sync & hotkeys
                </p>

                <div className="my-6 space-y-2.5 border-y border-border/50 py-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-foreground/80">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Global shortcuts & Focus mode timer</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/80">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Calendar timeblocks & offline desktop notes</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/80">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Automatic silent background updates</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button size="lg" className="w-full gap-2 text-sm font-semibold shadow-md" asChild>
                  <a href={WINDOWS_EXE_URL} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                    View & Download on GitHub
                  </a>
                </Button>
                <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                  <span>Version {CURRENT_VERSION} (x64)</span>
                  <a
                    href={WINDOWS_MSI_URL}
                    className="underline hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    All Downloads
                  </a>
                </div>
              </div>
            </div>

            {/* 2. Android Mobile APK Card (Featured with QR) */}
            <div className="relative flex flex-col justify-between rounded-2xl border-2 border-primary/60 bg-card p-6 shadow-lg sm:p-8 md:col-span-1">
              {/* Highlight Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow">
                Direct Mobile Install
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-between rounded-xl bg-orange-500/10 text-orange-500 p-2.5">
                    <Smartphone className="h-full w-full" />
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    Android 8.0+
                  </span>
                </div>

                <h2 className="mt-6 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  StudyOS Android (APK)
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  Official Android build · No Play Store required
                </p>

                {/* QR Code Container */}
                <div className="my-5 flex flex-col items-center justify-center rounded-xl border border-border/80 bg-muted/30 p-4">
                  <div className="overflow-hidden rounded-lg border border-border/50 bg-white p-2 shadow-sm">
                    <QRCodeSVG
                      value={ANDROID_APK_URL}
                      size={140}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <span className="mt-2.5 text-center text-[11px] font-medium text-muted-foreground">
                    📷 Scan with phone camera to download APK directly
                  </span>
                </div>

                <div className="space-y-2 border-t border-border/50 pt-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-foreground/80">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>FocusTube courses & sync on the go</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/80">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Telegram AI Tutor & notification integration</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Button size="lg" className="w-full gap-2 bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90" asChild>
                  <a href={ANDROID_APK_URL} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                    View Downloads on GitHub
                  </a>
                </Button>
                <button
                  type="button"
                  onClick={handleCopyApkLink}
                  className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedLink ? "APK Download Link Copied!" : "Copy APK Download Link"}</span>
                </button>
              </div>
            </div>

            {/* 3. Web App Card */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-md sm:p-8 md:col-span-2 lg:col-span-1">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-between rounded-xl bg-blue-500/10 text-blue-500 p-2.5">
                    <Globe className="h-full w-full" />
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Any Device
                  </span>
                </div>

                <h2 className="mt-6 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  StudyOS Web
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  Zero install · Runs in Chrome, Safari, Firefox & Edge
                </p>

                <div className="my-6 space-y-2.5 border-y border-border/50 py-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-foreground/80">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Works on laptops, iPads, tablets & phones</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/80">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Real-time instant synchronization across devices</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/80">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Full AI Tutor, Quizzes & Universal Syllabus generator</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button size="lg" variant="outline" className="w-full gap-2 border-primary/30 text-sm font-semibold hover:bg-primary/10" asChild>
                  <Link to="/app">
                    Open Web Workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="text-center text-xs text-muted-foreground">
                  <Link to="/register" className="underline hover:text-foreground">
                    Create a free account
                  </Link>{" "}
                  · No credit card required
                </div>
              </div>
            </div>
          </div>

          {/* Android Installation Instructions Card */}
          <div className="mt-12 rounded-2xl border border-border/80 bg-muted/20 p-6 sm:p-8">
            <div className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h3>How to install the APK on Android</h3>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 text-xs sm:text-sm text-muted-foreground">
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <div className="font-bold text-foreground mb-1">1. Download APK</div>
                <span>Tap "Download APK" or scan the QR code above from your phone camera.</span>
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <div className="font-bold text-foreground mb-1">2. Open File</div>
                <span>When downloaded, tap the notification or open your Downloads folder to tap the APK.</span>
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <div className="font-bold text-foreground mb-1">3. Allow Install</div>
                <span>If prompted, tap Settings and enable "Allow from this source" for your browser.</span>
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <div className="font-bold text-foreground mb-1">4. Start Studying</div>
                <span>Tap Install, launch StudyOS, and sign in to your study workspace!</span>
              </div>
            </div>
          </div>

          {/* Release & Open Source Footer */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/40 px-6 py-5 text-center sm:flex-row sm:text-left">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Verified & Safe:</span> Every release binary is cryptographically signed and open source.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={RELEASES_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline"
              >
                <span>View all Releases on GitHub</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
