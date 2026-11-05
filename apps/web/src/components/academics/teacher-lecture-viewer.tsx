import * as React from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Maximize2,
  Minimize2,
  Play,
  Printer,
  Sparkles,
  Terminal,
  AlertTriangle,
  Lightbulb,
  Clock,
  Layers,
} from "lucide-react";
import { Button, Badge, Separator } from "@/components/ui";

interface TeacherLectureViewerProps {
  title: string;
  body: string;
  subjectName?: string;
  onBodyChange?: (newBody: string) => void;
  isEditable?: boolean;
}

interface Slide {
  id: number;
  title: string;
  content: string;
  rawSection: string;
}

/**
 * Split markdown content into discrete lecture slides by headers (## or ---)
 */
function parseSlides(body: string, mainTitle: string): Slide[] {
  const sections = body.split(/(?=^##\s+)/gm).filter((s) => s.trim().length > 0);

  if (sections.length <= 1) {
    // Fallback: split by horizontal rules
    const hrSections = body.split(/^---$/gm).filter((s) => s.trim().length > 0);
    if (hrSections.length > 1) {
      return hrSections.map((sec, idx) => {
        const lines = sec.trim().split("\n");
        const titleLine = lines.find((l) => l.startsWith("#"))?.replace(/^#+\s*/, "") || `Slide ${idx + 1}`;
        return {
          id: idx + 1,
          title: titleLine,
          content: sec.trim(),
          rawSection: sec,
        };
      });
    }
  }

  if (sections.length === 0) {
    return [{ id: 1, title: mainTitle, content: body, rawSection: body }];
  }

  return sections.map((sec, idx) => {
    const lines = sec.trim().split("\n");
    const firstLine = lines[0] || "";
    const cleanTitle = firstLine.replace(/^#+\s*/, "").replace(/^[0-9.]+\s*/, "").trim() || `Slide ${idx + 1}`;
    return {
      id: idx + 1,
      title: cleanTitle,
      content: sec.trim(),
      rawSection: sec,
    };
  });
}

/**
 * Custom CodeBlock with one-click copy and terminal styling
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-xl border border-border/80 bg-[#0d1117] text-[#c9d1d9] overflow-hidden font-mono text-xs shadow-md">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#161b22] border-b border-[#30363d] text-[11px] text-[#8b949e]">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-indigo-400" />
          <span>{language || "c"}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#21262d] text-[#c9d1d9] transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto leading-relaxed whitespace-pre font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Formatted Markdown block with teacher callouts, code syntax, and clean tables
 */
function FormattedContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeBuffer: string[] = [];
  let codeLang = "c";
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableRows.length === 0) return;
    const header = tableRows[0];
    const dataRows = tableRows.slice(1).filter((r) => !r.every((c) => c.match(/^[ -:]+$/)));
    elements.push(
      <div key={key} className="my-4 overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-xs">
          {header && (
            <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
              <tr>
                {header.map((col, i) => (
                  <th key={i} className="p-2.5 font-semibold">
                    {col.trim()}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-border/60">
            {dataRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="p-2.5 font-mono text-[11px]">
                    {cell.trim()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  lines.forEach((line, idx) => {
    // Handle code blocks
    if (line.trim().startsWith("```")) {
      if (inCode) {
        elements.push(
          <CodeBlock
            key={`code-${idx}`}
            code={codeBuffer.join("\n")}
            language={codeLang}
          />
        );
        codeBuffer = [];
        inCode = false;
      } else {
        if (inTable) flushTable(`table-${idx}`);
        codeLang = line.trim().replace(/^```/, "").trim() || "c";
        inCode = true;
      }
      return;
    }

    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    // Handle Markdown tables
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      inTable = true;
      const cells = line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable(`table-${idx}`);
    }

    // Headers
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={idx} className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-4 mb-2 pb-2 border-b">
          {line.replace(/^#\s*/, "")}
        </h1>
      );
      return;
    }
    if (line.startsWith("## ")) {
      const titleText = line.replace(/^##\s*/, "");
      elements.push(
        <div key={idx} className="flex items-center gap-2 mt-6 mb-3">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            {titleText}
          </h2>
        </div>
      );
      return;
    }
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={idx} className="text-sm sm:text-base font-semibold text-foreground/90 mt-4 mb-1.5 flex items-center gap-1.5">
          <span className="text-indigo-400">▸</span> {line.replace(/^###\s*/, "")}
        </h3>
      );
      return;
    }

    // Teacher's Callout / Exam Trap Box: Warning (⚠️ or > [!WARNING])
    if (line.includes("⚠️") || line.includes("Exam Trap") || line.includes("Warning") || line.startsWith("> [!WARNING]")) {
      elements.push(
        <div key={idx} className="my-3 p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-amber-300 block mb-0.5">Teacher's Exam Warning & Trap</span>
            {line.replace(/^[>#*\s]+/, "")}
          </div>
        </div>
      );
      return;
    }

    // Teacher's Callout: Tip or Memory Hack (💡 or > [!TIP])
    if (line.includes("💡") || line.includes("Memory Hack") || line.includes("Tip:") || line.startsWith("> [!TIP]")) {
      elements.push(
        <div key={idx} className="my-3 p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-200 text-xs leading-relaxed flex items-start gap-2.5">
          <Lightbulb className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-indigo-300 block mb-0.5">Professor's Insight</span>
            {line.replace(/^[>#*\s]+/, "")}
          </div>
        </div>
      );
      return;
    }

    // Bullet points
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      elements.push(
        <li key={idx} className="ml-4 list-disc text-xs sm:text-sm text-foreground/85 leading-relaxed my-1">
          {line.replace(/^[\s*\-]+/, "")}
        </li>
      );
      return;
    }

    // Numbered list
    if (line.trim().match(/^[0-9]+\.\s+/)) {
      elements.push(
        <li key={idx} className="ml-5 list-decimal text-xs sm:text-sm text-foreground/85 leading-relaxed my-1">
          {line.replace(/^[0-9.]+\s*/, "")}
        </li>
      );
      return;
    }

    // Regular paragraph
    if (line.trim()) {
      elements.push(
        <p key={idx} className="text-xs sm:text-sm text-foreground/80 leading-relaxed my-2">
          {line}
        </p>
      );
    }
  });

  if (inTable) flushTable("table-end");

  return <div className="space-y-1">{elements}</div>;
}

export function TeacherLectureViewer({
  title,
  body,
  subjectName,
  onBodyChange,
  isEditable = true,
}: TeacherLectureViewerProps) {
  const [viewMode, setViewMode] = React.useState<"handout" | "presentation" | "edit">("handout");
  const [currentSlideIdx, setCurrentSlideIdx] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const slides = React.useMemo(() => parseSlides(body, title), [body, title]);

  const activeSlide = slides[currentSlideIdx] || slides[0] || {
    id: 1,
    title,
    content: body,
  };

  const handlePrint = () => {
    window.print();
  };

  // Keyboard navigation for presentation mode
  React.useEffect(() => {
    if (viewMode !== "presentation") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setCurrentSlideIdx((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentSlideIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, slides.length, isFullscreen]);

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? "fixed inset-0 z-50 bg-background p-6" : ""}`}>
      {/* Top Action & View Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b print:hidden">
        <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border">
          <Button
            variant={viewMode === "handout" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setViewMode("handout")}
          >
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
            <span>Lecture Handout</span>
          </Button>
          <Button
            variant={viewMode === "presentation" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setViewMode("presentation")}
          >
            <Play className="h-3.5 w-3.5 text-pink-400" />
            <span>Slide Deck (PPT)</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-pink-500/40 text-pink-300">
              {slides.length} slides
            </Badge>
          </Button>
          {isEditable && (
            <Button
              variant={viewMode === "edit" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setViewMode("edit")}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Markdown</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {viewMode === "presentation" && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10"
            onClick={handlePrint}
            title="Open printable lecture guide or Save as PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Download Lecture PDF</span>
          </Button>
        </div>
      </div>

      {/* VIEW 1: PPT SLIDE DECK MODE */}
      {viewMode === "presentation" && (
        <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full">
          {/* Slide Progress Indicator */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                Slide {currentSlideIdx + 1} of {slides.length}
              </span>
              <span>{Math.round(((currentSlideIdx + 1) / slides.length) * 100)}% Complete</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-300"
                style={{ width: `${((currentSlideIdx + 1) / slides.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Widescreen 16:9 Presentation Canvas */}
          <div className="flex-1 min-h-[380px] sm:min-h-[440px] rounded-2xl border border-border/80 bg-gradient-to-br from-[#0c0d14] via-[#121320] to-[#0c0d14] p-6 sm:p-8 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div>
              {/* Slide Header */}
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-xs">
                    {subjectName || "StudyOS Lecture Series"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Section {currentSlideIdx + 1}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">Press Space or ← → to advance</span>
              </div>

              {/* Slide Content */}
              <div className="max-w-none text-foreground">
                <FormattedContent text={activeSlide.content} />
              </div>
            </div>

            {/* Slide Footer */}
            <div className="flex items-center justify-between pt-4 mt-6 border-t border-border/50 text-[11px] text-muted-foreground">
              <span>StudyOS Academic Lecture Mode</span>
              <span>{title}</span>
            </div>
          </div>

          {/* Bottom Presentation Controller */}
          <div className="flex items-center justify-between pt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentSlideIdx === 0}
              onClick={() => setCurrentSlideIdx((prev) => Math.max(prev - 1, 0))}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>

            <div className="flex items-center gap-1 overflow-x-auto max-w-sm px-2">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSlideIdx(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentSlideIdx ? "w-6 bg-indigo-500" : "w-2 bg-muted hover:bg-muted-foreground/40"
                  }`}
                  title={`Slide ${idx + 1}: ${s.title}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={currentSlideIdx === slides.length - 1}
              onClick={() => setCurrentSlideIdx((prev) => Math.min(prev + 1, slides.length - 1))}
              className="gap-1 text-xs"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* VIEW 2: LECTURE HANDOUT / STUDY VIEW (DEFAULT) */}
      {viewMode === "handout" && (
        <div className="flex-1 overflow-y-auto px-1 py-2 space-y-4 print:p-0 print:overflow-visible">
          {/* Printable Academic Header */}
          <div className="hidden print:block pb-4 mb-4 border-b border-black text-black">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>StudyOS University Engineering Series</span>
              <span>Course: {subjectName || "C Systems & Foundations"}</span>
            </div>
            <h1 className="text-2xl font-bold mt-2 text-black">{title}</h1>
            <p className="text-xs text-gray-500 mt-1">
              Authorized Course Guide & Lecture Handout • StudyOS
            </p>
          </div>

          {/* Teacher's Overview Banner */}
          <div className="p-4 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent flex items-start gap-3 print:hidden">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Teacher's Curated Lecture Guide</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This study guide is structured like a university slide deck and PDF handout. Review the concepts, code walkthroughs, and exam gotchas directly. Use <b>Slide Deck (PPT)</b> mode to study slide-by-slide.
              </p>
            </div>
          </div>

          {/* Formatted Handout Body */}
          <div className="p-2 sm:p-4 rounded-xl border bg-card/60 backdrop-blur-sm">
            <FormattedContent text={body} />
          </div>
        </div>
      )}

      {/* VIEW 3: MARKDOWN EDITOR MODE */}
      {viewMode === "edit" && (
        <div className="flex-1 flex flex-col p-2">
          <textarea
            value={body}
            onChange={(e) => onBodyChange?.(e.target.value)}
            placeholder="Write your study notes, key formulas, lecture takeaways..."
            className="w-full flex-1 resize-none bg-transparent outline-none font-mono text-xs sm:text-sm leading-relaxed p-3 border rounded-xl"
            rows={20}
          />
        </div>
      )}
    </div>
  );
}
