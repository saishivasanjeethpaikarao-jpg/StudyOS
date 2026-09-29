import * as React from "react";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Calculator,
  FlaskConical,
  GraduationCap,
  Languages,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Subject } from "@open-sunsama/types";
import {
  useCreateSubject,
  useDeleteSubject,
  useSubjects,
  useUpdateSubject,
} from "@/hooks";
import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { DeleteSubjectDialog, SubjectDialog } from "./subject-dialog";
import { getAcademicErrorMessage } from "./academic-utils";

const subjectIconMap = {
  "book-open": BookOpen,
  calculator: Calculator,
  "flask-conical": FlaskConical,
  languages: Languages,
  palette: Palette,
};

export function SubjectsPage() {
  const activeQuery = useSubjects({ archived: false });
  const archivedQuery = useSubjects({ archived: true });
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingSubject, setEditingSubject] = React.useState<
    Subject | undefined
  >();
  const [deletingSubject, setDeletingSubject] = React.useState<Subject | null>(
    null
  );

  const openCreate = () => {
    setEditingSubject(undefined);
    setDialogOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setDialogOpen(true);
  };

  const renderList = (
    subjects: Subject[] | undefined,
    loading: boolean,
    error: unknown,
    retry: () => void,
    archived: boolean
  ) => {
    if (loading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-40 rounded-xl" />
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <StatePanel
          title="Subjects could not be loaded"
          description={getAcademicErrorMessage(error)}
          action={<Button onClick={retry}>Try again</Button>}
        />
      );
    }
    if (!subjects?.length) {
      return (
        <StatePanel
          title={archived ? "No archived subjects" : "Add your first subject"}
          description={
            archived
              ? "Subjects you archive will remain available here."
              : "Subjects keep coursework organized without changing your existing tasks."
          }
          action={
            archived ? undefined : (
              <Button onClick={openCreate}>Add subject</Button>
            )
          }
        />
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            onEdit={() => openEdit(subject)}
            onArchive={() =>
              updateSubject.mutate({
                id: subject.id,
                input: {
                  archivedAt: archived ? null : new Date().toISOString(),
                },
              })
            }
            onDelete={() => setDeletingSubject(subject)}
          />
        ))}
      </div>
    );
  };

  return (
    <main className="h-full overflow-y-auto bg-muted/20 pb-24 lg:pb-8">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
              Academic workspace
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Subjects
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Organize assignments around the courses and areas you study.
            </p>
          </div>
          <Button className="h-11 shrink-0" onClick={openCreate}>
            <Plus />
            <span className="hidden sm:inline">Add subject</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        <Tabs defaultValue="active">
          <TabsList className="mb-4 h-11 w-full justify-start sm:w-auto">
            <TabsTrigger className="h-9 flex-1 sm:flex-none" value="active">
              Active
            </TabsTrigger>
            <TabsTrigger className="h-9 flex-1 sm:flex-none" value="archived">
              Archived
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            {renderList(
              activeQuery.data,
              activeQuery.isLoading,
              activeQuery.error,
              () => void activeQuery.refetch(),
              false
            )}
          </TabsContent>
          <TabsContent value="archived">
            {renderList(
              archivedQuery.data,
              archivedQuery.isLoading,
              archivedQuery.error,
              () => void archivedQuery.refetch(),
              true
            )}
          </TabsContent>
        </Tabs>
      </div>

      <SubjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subject={editingSubject}
        pending={createSubject.isPending || updateSubject.isPending}
        onSubmit={(input) =>
          editingSubject
            ? updateSubject.mutateAsync({ id: editingSubject.id, input })
            : createSubject.mutateAsync(input)
        }
      />
      <DeleteSubjectDialog
        subject={deletingSubject}
        pending={deleteSubject.isPending}
        onOpenChange={(open) => !open && setDeletingSubject(null)}
        onConfirm={() => deleteSubject.mutateAsync(deletingSubject!.id)}
      />
    </main>
  );
}

function SubjectCard({
  subject,
  onEdit,
  onArchive,
  onDelete,
}: {
  subject: Subject;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const Icon =
    subjectIconMap[subject.icon as keyof typeof subjectIconMap] ?? BookOpen;
  const archived = Boolean(subject.archivedAt);
  return (
    <Card className="group overflow-hidden shadow-sm hover:border-border/90 hover:shadow-md">
      <div
        className="h-1.5"
        style={{ backgroundColor: subject.color ?? "#4f46e5" }}
      />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: subject.color ?? "#4f46e5" }}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                aria-label={`Actions for ${subject.name}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                {archived ? (
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                ) : (
                  <Archive className="mr-2 h-4 w-4" />
                )}
                {archived ? "Restore" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h2 className="mt-4 text-base font-semibold">{subject.name}</h2>
        <p className="mt-1 min-h-10 line-clamp-2 text-sm text-muted-foreground">
          {subject.description || "No description yet."}
        </p>
        <Button asChild variant="outline" className="mt-4 h-11 w-full">
          <Link to="/app/assignments" search={{ subject: subject.id }}>
            View assignments
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function StatePanel({
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
      <GraduationCap
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
