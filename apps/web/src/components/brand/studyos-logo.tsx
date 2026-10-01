import { cn } from "@/lib/utils";

export function StudyOSLogo({
  className,
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <img
      src="/studyos-symbol.svg"
      alt={decorative ? "" : "StudyOS"}
      className={cn("shrink-0", className)}
      draggable={false}
    />
  );
}

export function StudyOSWordmark({
  className,
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  const alt = decorative ? "" : "StudyOS";
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <img
        src="/studyos-wordmark-on-light.svg"
        alt={alt}
        width={280}
        height={76}
        className="block h-full w-auto dark:hidden"
        draggable={false}
      />
      <img
        src="/studyos-wordmark-on-dark.svg"
        alt={alt}
        width={280}
        height={76}
        className="hidden h-full w-auto dark:block"
        draggable={false}
      />
    </span>
  );
}
