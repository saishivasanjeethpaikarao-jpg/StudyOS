import * as React from "react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({
  value,
  size = 180,
  className = "",
}: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch((err) => {
        console.error("QR Code generation error:", err);
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border bg-muted/30 text-xs text-muted-foreground ${className}`}
        style={{ width: size, height: size }}
      >
        Generating QR…
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white p-2 shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={dataUrl}
        alt="Scan QR code"
        width={size - 16}
        height={size - 16}
        className="block"
      />
    </div>
  );
}
