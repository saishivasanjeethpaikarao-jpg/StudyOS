export interface SyllabusLectureDeck {
  title: string;
  body: string; // Markdown with ## [SLIDE 1] ... ## [SLIDE 6]
}

export interface SyllabusAssignment {
  title: string;
  description: string;
  daysDue: number; // e.g. 7, 14, 21, 28
}

export interface SyllabusResource {
  type: "youtube" | "web";
  title: string;
  url: string;
  providerItemId: string | null;
}

export interface SyllabusLesson {
  dayNumber: number; // 1 to 24
  title: string;
  notes: string;
  subtasks: string[];
}

export interface SubjectCurriculumPackage {
  id: string; // slug
  aliases: string[];
  subject: {
    name: string;
    description: string;
    color: string;
    icon: string;
  };
  assignments: SyllabusAssignment[];
  resources: SyllabusResource[];
  lectureDecks: SyllabusLectureDeck[];
  dailyLessons: SyllabusLesson[];
}
