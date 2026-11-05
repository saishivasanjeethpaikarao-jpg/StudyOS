import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Download,
  FileText,
  Printer,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui";
import type { TimeBlock, CalendarViewMode } from "@open-sunsama/types";
import { cn } from "@/lib/utils";

interface CalendarViewToolbarProps {
  /**
   * The user's anchor date — also what `Today` resets to. The button only
   * highlights when today is within the visible range, not just when
   * `selectedDate === today` (which would feel wrong on the week / month
   * view where the user expects "Today" to mean "today is on screen").
   */
  selectedDate: Date;
  /**
   * The full window the calendar is displaying. For "day" mode this is
   * just the selected date; for "3-day" / "week" / "month" it's the
   * range. Used to label the toolbar (e.g. "Aug 1 – 7" for a week).
   */
  rangeStart: Date;
  rangeEnd: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  timeBlocks: TimeBlock[];
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  className?: string;
}

const VIEW_MODE_LABELS: Record<CalendarViewMode, string> = {
  day: "Day",
  "3-day": "3 days",
  week: "Week",
  month: "Month",
};

const VIEW_MODES: CalendarViewMode[] = ["day", "3-day", "week", "month"];

function describeRange(
  rangeStart: Date,
  rangeEnd: Date,
  viewMode: CalendarViewMode
): { primary: string; secondary: string } {
  if (viewMode === "day") {
    return {
      primary: format(rangeStart, "EEEE"),
      secondary: format(rangeStart, "MMM d, yyyy"),
    };
  }

  if (viewMode === "month") {
    return {
      primary: format(rangeStart, "MMMM"),
      secondary: format(rangeStart, "yyyy"),
    };
  }

  // 3-day / week — show the visible window.
  const sameMonth = rangeStart.getMonth() === rangeEnd.getMonth();
  const sameYear = rangeStart.getFullYear() === rangeEnd.getFullYear();

  let secondary: string;
  if (sameMonth && sameYear) {
    secondary = `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "d, yyyy")}`;
  } else if (sameYear) {
    secondary = `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`;
  } else {
    secondary = `${format(rangeStart, "MMM d, yyyy")} – ${format(rangeEnd, "MMM d, yyyy")}`;
  }

  return {
    primary: viewMode === "week" ? "This week" : "3 days",
    secondary,
  };
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportIcsCalendar(
  timeBlocks: TimeBlock[],
  rangeStart: Date,
  _rangeEnd: Date,
  viewMode: CalendarViewMode
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StudyOS//Student Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const block of timeBlocks) {
    const startDt = new Date(block.startTime);
    const endDt = new Date(block.endTime);
    const startTimeFormatted = format(startDt, "yyyyMMdd'T'HHmmss");
    const endTimeFormatted = format(endDt, "yyyyMMdd'T'HHmmss");
    lines.push(
      "BEGIN:VEVENT",
      `UID:studyos-${block.id}@studyos.app`,
      `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
      `DTSTART:${startTimeFormatted}`,
      `DTEND:${endTimeFormatted}`,
      `SUMMARY:${block.title.replace(/[,;\n]/g, " ")}`,
      `DESCRIPTION:${(block.notes || "StudyOS Study Session").replace(/[,;\n]/g, " ")}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  const icsContent = lines.join("\r\n");
  const filename = `StudyOS_${viewMode}_schedule_${format(rangeStart, "yyyy-MM-dd")}.ics`;
  downloadFile(icsContent, filename, "text/calendar;charset=utf-8");
}

function exportTimetableText(
  timeBlocks: TimeBlock[],
  rangeStart: Date,
  rangeEnd: Date,
  viewMode: CalendarViewMode
) {
  const header = `==================================================\nStudyOS Academic Timetable (${viewMode.toUpperCase()} VIEW)\nPeriod: ${format(rangeStart, "MMM d, yyyy")} to ${format(rangeEnd, "MMM d, yyyy")}\nTotal Planned Blocks: ${timeBlocks.length}\n==================================================\n\n`;

  const byDate: Record<string, TimeBlock[]> = {};
  for (const block of timeBlocks) {
    const startDt = new Date(block.startTime);
    const dateKey = format(startDt, "yyyy-MM-dd");
    const list = byDate[dateKey] ?? [];
    list.push(block);
    byDate[dateKey] = list;
  }

  const dates = Object.keys(byDate).sort();
  let body = "";
  if (dates.length === 0) {
    body = "No study sessions or time blocks scheduled in this range.\n";
  } else {
    for (const d of dates) {
      body += `📅 Date: ${d}\n`;
      const dateBlocks = byDate[d] ?? [];
      for (const b of dateBlocks) {
        const startDt = new Date(b.startTime);
        const endDt = new Date(b.endTime);
        const durationMins = Math.round((endDt.getTime() - startDt.getTime()) / 60000);
        const timeStr = `${format(startDt, "HH:mm")} - ${format(endDt, "HH:mm")}`;
        body += `  • [${timeStr}] ${b.title} (${durationMins} mins)\n`;
      }
      body += "\n";
    }
  }

  const content = header + body;
  const filename = `StudyOS_Timetable_${viewMode}_${format(rangeStart, "yyyy-MM-dd")}.txt`;
  downloadFile(content, filename, "text/plain;charset=utf-8");
}

export function CalendarViewToolbar({
  selectedDate: _selectedDate,
  rangeStart,
  rangeEnd,
  viewMode,
  onViewModeChange,
  timeBlocks,
  onPreviousDay,
  onNextDay,
  onToday,
}: CalendarViewToolbarProps) {
  // "Today" is highlighted when today's date falls anywhere in the visible
  // range — for day view that collapses back to "selectedDate is today",
  // but for week / month it correctly stays lit while the user navigates
  // around the current week / month.
  const today = new Date();
  const todayInRange = isWithinInterval(today, {
    start: startOfDay(rangeStart),
    end: endOfDay(rangeEnd),
  });
  const { primary, secondary } = describeRange(rangeStart, rangeEnd, viewMode);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b px-3 sm:px-4 py-2 sm:py-3 bg-background gap-2 sm:gap-4">
      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={onPreviousDay}
            aria-label="Previous range"
            className="h-10 w-10 sm:h-9 sm:w-9"
          >
            <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant={todayInRange ? "default" : "outline"}
            onClick={onToday}
            className="min-w-[60px] sm:min-w-[70px] h-10 sm:h-9 text-sm"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onNextDay}
            aria-label="Next range"
            className="h-10 w-10 sm:h-9 sm:w-9"
          >
            <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
        </div>

        {/* Selected Range Display */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground hidden sm:block" />
          <div>
            <h2 className="text-base sm:text-lg font-semibold leading-none">
              {primary}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {secondary}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-between sm:justify-end">
        {/* View mode selector — segmented control */}
        <div
          className="inline-flex items-center rounded-md border border-border/50 bg-muted/30 p-0.5"
          role="tablist"
          aria-label="Calendar view"
        >
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              role="tab"
              aria-selected={viewMode === mode}
              onClick={() => onViewModeChange(mode)}
              className={cn(
                "px-2.5 sm:px-3 h-7 sm:h-8 rounded text-xs sm:text-[13px] font-medium transition-colors",
                viewMode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {VIEW_MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        {/* Export / Download Schedule Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 sm:h-8 px-2.5 sm:px-3 text-xs sm:text-[13px] font-medium gap-1.5 border-border/70 hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() =>
                exportIcsCalendar(timeBlocks, rangeStart, rangeEnd, viewMode)
              }
              className="cursor-pointer gap-2"
            >
              <CalendarIcon className="h-4 w-4 text-indigo-500" />
              <div>
                <p className="font-medium text-xs">Download .ics Calendar</p>
                <p className="text-[10px] text-muted-foreground">
                  Google / Apple / Phone Calendar
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                exportTimetableText(timeBlocks, rangeStart, rangeEnd, viewMode)
              }
              className="cursor-pointer gap-2"
            >
              <FileText className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="font-medium text-xs">Download Timetable (.txt)</p>
                <p className="text-[10px] text-muted-foreground">
                  Clean printable text schedule
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => window.print()}
              className="cursor-pointer gap-2"
            >
              <Printer className="h-4 w-4 text-amber-500" />
              <div>
                <p className="font-medium text-xs">Print / PDF</p>
                <p className="text-[10px] text-muted-foreground">
                  Print visible {viewMode} schedule
                </p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Block count badge — only on day view (per-day signal) */}
        {viewMode === "day" && timeBlocks.length > 0 && (
          <span className="hidden sm:inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {timeBlocks.length} block{timeBlocks.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
