import * as React from "react";
import { CheckSquare } from "lucide-react";
import type { LearningTarget } from "@open-sunsama/types";
import { useSubjects } from "@/hooks/useSubjects";
import { useAssignments } from "@/hooks/useAssignments";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { QuizWorkspace } from "./quiz-workspace";

export function QuizzesPage() {
  const { data: activeSubjects = [] } = useSubjects({ archived: false });
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("all");
  const [selectedAssignmentId, setSelectedAssignmentId] = React.useState<string>("all");

  const { data: assignmentsData } = useAssignments({
    subjectId: selectedSubjectId !== "all" ? selectedSubjectId : undefined,
    limit: 200,
  });
  const assignments = assignmentsData?.data ?? [];

  const activeTarget: LearningTarget = React.useMemo(() => {
    const target: LearningTarget = {};
    if (selectedSubjectId !== "all") target.subjectId = selectedSubjectId;
    if (selectedAssignmentId !== "all") target.assignmentId = selectedAssignmentId;
    return target;
  }, [selectedSubjectId, selectedAssignmentId]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Checks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Author practice tests, test concept recall, and track attempt scores with deterministic scoring.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={selectedSubjectId}
            onValueChange={(val) => {
              setSelectedSubjectId(val);
              setSelectedAssignmentId("all");
            }}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {activeSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedAssignmentId}
            onValueChange={setSelectedAssignmentId}
            disabled={assignments.length === 0}
          >
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="All Assignments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignments</SelectItem>
              {assignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Workspace */}
      <Card className="p-6">
        <QuizWorkspace target={activeTarget} />
      </Card>
    </div>
  );
}
