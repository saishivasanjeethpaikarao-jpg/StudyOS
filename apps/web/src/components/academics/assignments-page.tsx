import * as React from "react";
import {
  CalendarClock,
  ChevronDown,
  CheckCircle2,
  CirclePlay,
  Clock3,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type {
  Assignment,
  AssignmentStatus,
  CreateAssignmentInput,
  Subject,
} from "@open-sunsama/types";
import {
  useAssignments,
  useCreateAssignment,
  useDeleteAssignment,
  useSubjects,
  useUpdateAssignment,
} from "@/hooks";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { AssignmentDialog, DeleteAssignmentDialog } from "./assignment-dialog";
import { StudySessionsPanel } from "./study-sessions-panel";
import { LearningWorkspace } from "./learning-workspace";
import {
  type AssignmentView,
  assignmentStatusLabel,
  filterAssignments,
  formatAssignmentDue,
  getAcademicErrorMessage,
  mergeSubjects,
  priorityLabel,
} from "./academic-utils";

const assignmentViews: { value: AssignmentView; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

export function AssignmentsPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { subject?: string };
  const subjectId = search.subject;
  const assignmentsQuery = useAssignments({ subjectId, limit: 200 });
  const activeSubjects = useSubjects({ archived: false });
  const archivedSubjects = useSubjects({ archived: true });
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const [view, setView] = React.useState<AssignmentView>("upcoming");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingAssignment, setEditingAssignment] =
    React.useState<Assignment>();
  const [deletingAssignment, setDeletingAssignment] =
    React.useState<Assignment | null>(null);

  const subjects = React.useMemo(
    () => mergeSubjects(activeSubjects.data, archivedSubjects.data),
    [activeSubjects.data, archivedSubjects.data]
  );
  const subjectMap = React.useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects]
  );
  const assignments = filterAssignments(
    assignmentsQuery.data?.data ?? [],
    view
  );

  const setSubjectFilter = (next: string) => {
    void navigate({
      to: "/app/assignments",
      search: next === "all" ? {} : { subject: next },
      replace: true,
    });
  };

  const updateStatus = (assignment: Assignment, status: AssignmentStatus) =>
    updateAssignment.mutate({ id: assignment.id, input: { status } });

  return (
    <main className="h-full overflow-y-auto bg-muted/20 pb-24 lg:pb-8">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
              Academic workspace
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Assignments
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Keep deadlines visible, then plan focused study time around them.
            </p>
          </div>
          <Button
            className="h-11 shrink-0"
            onClick={() => {
              setEditingAssignment(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus />
            <span className="hidden sm:inline">Add assignment</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs
            value={view}
            onValueChange={(value) => setView(value as AssignmentView)}
          >
            <TabsList className="h-auto w-full justify-start overflow-x-auto p-1 [scrollbar-width:none] md:w-auto [&::-webkit-scrollbar]:hidden">
              {assignmentViews.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="h-9 px-3"
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="w-full md:w-64">
            <span className="sr-only" id="subject-filter-label">
              Filter by subject
            </span>
            <Select value={subjectId ?? "all"} onValueChange={setSubjectFilter}>
              <SelectTrigger
                className="h-11"
                aria-labelledby="subject-filter-label"
              >
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                    {subject.archivedAt ? " (archived)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {assignmentsQuery.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : assignmentsQuery.error ? (
          <AssignmentState
            title="Assignments could not be loaded"
            description={getAcademicErrorMessage(assignmentsQuery.error)}
            action={
              <Button onClick={() => void assignmentsQuery.refetch()}>
                Try again
              </Button>
            }
          />
        ) : assignments.length === 0 ? (
          <AssignmentState
            title={
              view === "upcoming"
                ? "No upcoming assignments"
                : `No ${assignmentViews.find((item) => item.value === view)?.label.toLowerCase()} assignments`
            }
            description={
              subjectId
                ? "Nothing in this subject matches the selected view."
                : "Add a deadline to start building your academic workspace."
            }
            action={
              <Button
                onClick={() => {
                  setEditingAssignment(undefined);
                  setDialogOpen(true);
                }}
              >
                Add assignment
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                subject={
                  assignment.subjectId
                    ? subjectMap.get(assignment.subjectId)
                    : undefined
                }
                onEdit={() => {
                  setEditingAssignment(assignment);
                  setDialogOpen(true);
                }}
                onDelete={() => setDeletingAssignment(assignment)}
                onStatusChange={(status) => updateStatus(assignment, status)}
              />
            ))}
          </div>
        )}
      </div>

      <AssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        assignment={editingAssignment}
        subjects={subjects}
        initialSubjectId={subjectId}
        pending={createAssignment.isPending || updateAssignment.isPending}
        onSubmit={(input) => {
          if (editingAssignment) {
            return updateAssignment.mutateAsync({
              id: editingAssignment.id,
              input,
            });
          }
          return createAssignment.mutateAsync(input as CreateAssignmentInput);
        }}
      />
      <DeleteAssignmentDialog
        assignment={deletingAssignment}
        pending={deleteAssignment.isPending}
        onOpenChange={(open) => !open && setDeletingAssignment(null)}
        onConfirm={() => deleteAssignment.mutateAsync(deletingAssignment!.id)}
      />
    </main>
  );
}

export function AssignmentCard({
  assignment,
  subject,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  assignment: Assignment;
  subject?: Subject;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: AssignmentStatus) => void;
}) {
  const [studyOpen, setStudyOpen] = React.useState(false);
  const overdue =
    new Date(assignment.dueAt) < new Date() &&
    !["completed", "cancelled"].includes(assignment.status);
  const nextAction =
    assignment.status === "not_started"
      ? { label: "Start", status: "in_progress" as const, icon: CirclePlay }
      : assignment.status === "in_progress"
        ? {
            label: "Complete",
            status: "completed" as const,
            icon: CheckCircle2,
          }
        : assignment.status === "completed"
          ? { label: "Reopen", status: "not_started" as const, icon: RotateCcw }
          : null;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="mt-0.5 h-12 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: subject?.color ?? "#94a3b8" }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words font-semibold">{assignment.title}</h2>
              <Badge
                variant={
                  assignment.status === "completed"
                    ? "success"
                    : assignment.status === "cancelled"
                      ? "outline"
                      : overdue
                        ? "destructive"
                        : "secondary"
                }
              >
                {assignmentStatusLabel(assignment.status)}
              </Badge>
              <Badge variant="outline">
                {priorityLabel(assignment.priority)}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span
                className={overdue ? "font-medium text-destructive" : undefined}
              >
                <CalendarClock
                  className="mr-1 inline h-4 w-4"
                  aria-hidden="true"
                />
                {overdue ? "Overdue · " : ""}
                {formatAssignmentDue(assignment.dueAt)}
              </span>
              <span>{subject?.name ?? "No subject"}</span>
              {assignment.estimatedMinutes && (
                <span>
                  <Clock3 className="mr-1 inline h-4 w-4" aria-hidden="true" />
                  {assignment.estimatedMinutes} min
                </span>
              )}
            </div>
            {assignment.description && (
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                {assignment.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0"
                aria-label={`Actions for ${assignment.title}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <LearningWorkspace
            target={{ assignmentId: assignment.id }}
            label={assignment.title}
          />
          <Button
            variant="outline"
            className="h-11"
            aria-expanded={studyOpen}
            onClick={() => setStudyOpen((open) => !open)}
          >
            <ChevronDown className={studyOpen ? "rotate-180" : undefined} />
            {studyOpen ? "Hide study plan" : "Study plan"}
          </Button>
          {nextAction && (
            <Button
              variant="outline"
              className="h-11"
              onClick={() => onStatusChange(nextAction.status)}
            >
              <nextAction.icon /> {nextAction.label}
            </Button>
          )}
        </div>
        {studyOpen && <StudySessionsPanel assignment={assignment} />}
      </CardContent>
    </Card>
  );
}

function AssignmentState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-10 text-center">
      <CalendarClock
        className="mb-4 h-9 w-9 text-muted-foreground"
        aria-hidden="true"
      />
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-5 mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {action}
    </div>
  );
}
