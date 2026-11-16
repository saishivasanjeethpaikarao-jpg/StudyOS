import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Smartphone,
  Download,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Bell,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const ANDROID_APK_URL = "https://github.com/saishivasanjeethpaikarao-jpg/StudyOS/releases/latest/download/StudyOS.apk";
export const ANDROID_APK_VERSION = "v1.2.0";
export const ANDROID_APK_SHA256 = "35ea9c1db1ecd96e3378d1c0585894d363c635468e505dd0b74140b4827bb511";

interface MobileAppQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileAppQrModal({ open, onOpenChange }: MobileAppQrModalProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ANDROID_APK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-center sm:text-left">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                StudyOS Android Mobile
              </DialogTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                  <Sparkles className="h-3 w-3" /> {ANDROID_APK_VERSION}
                </span>
                <span>• Universal APK (Android 8.0+)</span>
              </div>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Scan this QR code with your phone camera to download and install StudyOS APK directly onto your device.
          </DialogDescription>
        </DialogHeader>

        {/* QR Code Container */}
        <div className="my-4 flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-muted/40 p-5">
          <div className="overflow-hidden rounded-xl border border-border/60 bg-white p-3 shadow-md">
            <QRCodeSVG
              value={ANDROID_APK_URL}
              size={170}
              level="M"
              includeMargin={false}
            />
          </div>
          <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
            📷 Point your camera to download <strong className="text-foreground">StudyOS.apk</strong>
          </p>
        </div>

        {/* Key Features included in v1.2.0 */}
        <div className="space-y-2 rounded-xl border border-border/60 bg-card p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Hardware Phone Clock Alarms with Subject Notes</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Bell className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            <span>Telegram Bot Auto-Alarms & Morning Schedule Sync</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Auto-Update Engine — automatic prompts for future versions</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-2">
          <Button className="w-full gap-2 font-semibold shadow" asChild>
            <a href={ANDROID_APK_URL} download="StudyOS_1.2.0.apk">
              <Download className="h-4 w-4" />
              Download APK Directly ({ANDROID_APK_VERSION})
            </a>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex-1 gap-1.5 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Download Link</span>
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <a href="/download" target="_blank" rel="noopener noreferrer">
                <span>All Downloads</span>
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
