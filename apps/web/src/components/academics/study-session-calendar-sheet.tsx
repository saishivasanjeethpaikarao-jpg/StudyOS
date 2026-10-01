import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from "@/components/ui";
import { useStudySession } from "@/hooks/useStudySessions";
import { getApi } from "@/lib/api";
import { assignmentKeys } from "@/lib/query-keys";
import { StudySessionsPanel } from "./study-sessions-panel";

/** Opens the academic source record, never the generic Time Block editor. */
export function StudySessionCalendarSheet({
  sessionId,
  open,
  onOpenChange,
}: {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const session = useStudySession(open ? sessionId : null);
  const assignmentId = session.data?.assignmentId;
  const assignment = useQuery({
    queryKey: assignmentKeys.detail(assignmentId ?? ""),
    queryFn: () => getApi().assignments.get(assignmentId!),
    enabled: open && !!assignmentId,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-4 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Study session</SheetTitle>
        </SheetHeader>
        {session.isLoading || assignment.isLoading ? (
          <Skeleton className="mt-5 h-40" />
        ) : session.isError ||
          assignment.isError ||
          !session.data ||
          !assignment.data ? (
          <div className="mt-5 space-y-3 text-sm">
            <p>This study session is unavailable. It may have been removed.</p>
            <Button variant="outline" onClick={() => void session.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Assignment</p>
                <h2 className="font-semibold">{assignment.data.title}</h2>
              </div>
              <Button asChild variant="outline">
                <Link to="/app/assignments" onClick={() => onOpenChange(false)}>
                  View assignment
                </Link>
              </Button>
            </div>
            <StudySessionsPanel
              assignment={assignment.data}
              focusedSessionId={sessionId ?? undefined}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
