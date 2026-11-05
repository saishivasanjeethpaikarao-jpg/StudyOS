import {
  and,
  assignments,
  eq,
  getDb,
  like,
  or,
  resources,
  studyNotes,
  subjects,
  subtasks,
  tasks,
  timeBlocks,
} from "@open-sunsama/database";
import type { SubjectCurriculumPackage } from "./types.js";
import { cPackage } from "./catalogs/c-programming.js";
import { pythonPackage } from "./catalogs/python.js";
import { dsaPackage } from "./catalogs/dsa.js";
import { webReactPackage } from "./catalogs/web-react.js";
import { javaPackage } from "./catalogs/java.js";
import { machineLearningPackage } from "./catalogs/machine-learning.js";
import { operatingSystemsPackage } from "./catalogs/operating-systems.js";
import { databaseSqlPackage } from "./catalogs/database-sql.js";

export const MASTER_CATALOGS: SubjectCurriculumPackage[] = [
  cPackage,
  pythonPackage,
  dsaPackage,
  webReactPackage,
  javaPackage,
  machineLearningPackage,
  operatingSystemsPackage,
  databaseSqlPackage,
];

export class UniversalSyllabusService {
  /**
   * List all officially curated catalog subjects with metadata.
   */
  static listCuratedSubjects() {
    return MASTER_CATALOGS.map((pkg) => ({
      id: pkg.id,
      name: pkg.subject.name,
      description: pkg.subject.description,
      color: pkg.subject.color,
      icon: pkg.subject.icon,
      lectureCount: pkg.lectureDecks.length,
      assignmentCount: pkg.assignments.length,
      resourceCount: pkg.resources.length,
      lessonDays: pkg.dailyLessons.length,
    }));
  }

  /**
   * Resolve a curriculum package by matching query against pre-curated catalog,
   * or dynamically generating one using Groq AI if custom.
   */
  static async resolveCurriculum(query: string): Promise<SubjectCurriculumPackage> {
    const cleanQuery = query
      .replace(/^(plan|schedule|create a schedule for|plan my|how to learn|study|learn|curriculum for)\s*/i, "")
      .replace(/\b(this month|month|to learn|roadmap|guide|syllabus|deck|notes)\b/gi, "")
      .trim()
      .toLowerCase();

    // 1. Check exact or alias match in curated catalogs
    for (const pkg of MASTER_CATALOGS) {
      if (
        pkg.id === cleanQuery ||
        pkg.aliases.some((alias) => cleanQuery.includes(alias) || alias.includes(cleanQuery)) ||
        pkg.subject.name.toLowerCase().includes(cleanQuery)
      ) {
        return pkg;
      }
    }

    // 2. If no pre-curated catalog matched, dynamically generate a complete package using Groq AI
    return await this.generateDynamicPackageWithAI(query, cleanQuery);
  }

  /**
   * Generate an exhaustive, professional academic package using Groq AI for ANY custom topic.
   */
  private static async generateDynamicPackageWithAI(
    rawQuery: string,
    cleanTopic: string
  ): Promise<SubjectCurriculumPackage> {
    const topicTitle =
      cleanTopic
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ") || "Computer Science Specialization";

    const groqKey = process.env.GROQ_API_KEY || "";

    const systemPrompt = `You are an elite university curriculum architect and professor. Generate a comprehensive, 24-day progressive course curriculum with 8 multi-slide lecture decks, 4 assignments, and resources for the given subject. Output strictly valid JSON matching this schema:
{
  "subject": {
    "name": "${topicTitle} Foundations & Advanced Practice",
    "description": "Comprehensive academic curriculum covering core mechanics, theory, and production applications of ${topicTitle}.",
    "color": "#6366F1",
    "icon": "code"
  },
  "assignments": [
    { "title": "Week 1 Project: ...", "description": "...", "daysDue": 7 },
    { "title": "Week 2 Project: ...", "description": "...", "daysDue": 14 },
    { "title": "Week 3 Project: ...", "description": "...", "daysDue": 21 },
    { "title": "Week 4 Capstone: ...", "description": "...", "daysDue": 28 }
  ],
  "resources": [
    { "type": "web", "title": "${topicTitle} Official Documentation & Reference", "url": "https://en.wikipedia.org/wiki/${encodeURIComponent(cleanTopic)}", "providerItemId": null }
  ],
  "lectureDecks": [
    {
      "title": "Lecture 1: ${topicTitle} Core Architecture & Foundations",
      "body": "## [SLIDE 1] 🎯 Course Objectives\\nDetailed objectives...\\n\\n---\\n\\n## [SLIDE 2] 🧠 Mental Model & Architecture\\nArchitecture breakdown...\\n\\n---\\n\\n## [SLIDE 3] 🏗️ Core Mechanics & Theory\\nDeep dive...\\n\\n---\\n\\n## [SLIDE 4] 💻 Production Code & Walkthrough\\nWorking code example...\\n\\n---\\n\\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\\nTop 3 mistakes...\\n\\n---\\n\\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\\n* Q1: ...\\n  * Answer: ..."
    }
  ],
  "dailyLessons": [
    {
      "dayNumber": 1,
      "title": "Day 1: ${topicTitle} Setup & Environment",
      "subtasks": ["Install tools", "Verify runtime", "Write starter program", "Run tests"],
      "notes": "# Day 1 Notes\\n\\nKey concepts and guide."
    }
  ]
}`;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Generate the complete curriculum for the topic: "${rawQuery}". Provide 8 lecture decks (each with slides 1 to 6), 4 weekly assignments, 4-6 resources, and 24 daily progression lessons with 4 actionable subtasks each.`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 8000,
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as any;
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            id: cleanTopic.replace(/\s+/g, "-"),
            aliases: [cleanTopic],
            subject: parsed.subject || {
              name: `${topicTitle} Comprehensive Series`,
              description: `Mastering ${topicTitle} through progressive study and hands-on drills.`,
              color: "#3B82F6",
              icon: "book-open",
            },
            assignments: parsed.assignments || [],
            resources: parsed.resources || [],
            lectureDecks: parsed.lectureDecks || [],
            dailyLessons: parsed.dailyLessons || [],
          };
        }
      }
    } catch (err) {
      console.warn("[UniversalSyllabusService] Groq AI fallback generation failed:", err);
    }

    // Default Fallback Generator if network fails
    return this.buildDeterministicFallback(topicTitle, cleanTopic);
  }

  /**
   * Deterministic fallback when offline or AI call unavailable.
   */
  private static buildDeterministicFallback(
    topicTitle: string,
    cleanTopic: string
  ): SubjectCurriculumPackage {
    const lectureDecks = Array.from({ length: 8 }, (_, i) => ({
      title: `Lecture ${i + 1}: ${topicTitle} - Module ${i + 1}`,
      body: `## [SLIDE 1] 🎯 Course Objectives & Systems Motivation
Welcome to ${topicTitle} Module ${i + 1}!

### 🎯 Key Learning Objectives
* Master the fundamental principles of ${topicTitle} in Module ${i + 1}.
* Build intuition through mental models and architectural diagrams.
* Implement robust solutions and avoid common traps.

---

## [SLIDE 2] 🧠 Architectural Mental Model
\`\`\`text
${topicTitle} Input ──► Processing Engine ──► Validated Output
\`\`\`

---

## [SLIDE 3] 🏗️ Deep Technical Architecture
Core theoretical mechanics and formulas for ${topicTitle} Module ${i + 1}.

---

## [SLIDE 4] 💻 Production Code & Line-by-Line Breakdown
\`\`\`text
// Implementation for ${topicTitle} Module ${i + 1}
Initialize ${topicTitle} Runtime;
Execute Core Logic;
Verify Results;
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Edge Case Handling:** Failing to validate null, empty, or boundary conditions.
2. **Resource Leaks:** Ensure connections, file descriptors, or memory allocations are safely closed.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the primary objective of ${topicTitle} Module ${i + 1}?
  * *Answer:* To establish modular, reliable understanding of the domain principles.`,
    }));

    const dailyLessons = Array.from({ length: 24 }, (_, i) => ({
      dayNumber: i + 1,
      title: `Day ${i + 1}: ${topicTitle} Progressive Study Session ${i + 1}`,
      subtasks: [
        `Review theoretical foundations for ${topicTitle} Session ${i + 1}`,
        `Implement hands-on code and exercises for Session ${i + 1}`,
        `Test edge cases and benchmark performance`,
        `Complete self-assessment checklist and review notes`,
      ],
      notes: `# ${topicTitle} - Day ${i + 1}\\n\\nProgressive study session covering core concepts and practical exercises.`,
    }));

    return {
      id: cleanTopic.replace(/\s+/g, "-"),
      aliases: [cleanTopic],
      subject: {
        name: `${topicTitle} Academic Series`,
        description: `Comprehensive academic curriculum for ${topicTitle}.`,
        color: "#6366F1",
        icon: "book-open",
      },
      assignments: [
        { title: `Week 1: ${topicTitle} Foundations Project`, description: "Implement fundamental concepts and problem sets.", daysDue: 7 },
        { title: `Week 2: ${topicTitle} Intermediate Architecture`, description: "Apply core patterns and data manipulation drills.", daysDue: 14 },
        { title: `Week 3: ${topicTitle} Advanced Implementation`, description: "Design modular, scalable components with testing.", daysDue: 21 },
        { title: `Week 4: ${topicTitle} Capstone Portfolio System`, description: "Deliver comprehensive end-to-end working implementation.", daysDue: 28 },
      ],
      resources: [
        {
          type: "web",
          title: `${topicTitle} Official Documentation & Reference Guide`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanTopic)}`,
          providerItemId: null,
        },
      ],
      lectureDecks,
      dailyLessons,
    };
  }

  /**
   * Enroll a user in a curriculum package:
   * Creates subject, assignments, resources, study notes (lecture slide decks), tasks, subtasks, and timeblocks.
   */
  static async enrollPackage(userId: string, pkg: SubjectCurriculumPackage) {
    const db = getDb();

    // 1. Ensure Subject exists or create it
    let subjectId: string;
    const [existingSub] = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.userId, userId), eq(subjects.name, pkg.subject.name)))
      .limit(1);

    if (existingSub) {
      subjectId = existingSub.id;
    } else {
      const [newSub] = await db
        .insert(subjects)
        .values({
          userId,
          name: pkg.subject.name,
          description: pkg.subject.description,
          color: pkg.subject.color,
          icon: pkg.subject.icon,
        })
        .returning({ id: subjects.id });
      if (!newSub) {
        throw new Error("Failed to create subject");
      }
      subjectId = newSub.id;
    }

    // 2. Clean up any previous tasks and notes for this subject so user sees fresh, clean workspace
    await db.delete(tasks).where(
      and(
        eq(tasks.userId, userId),
        or(
          like(tasks.title, `${pkg.subject.name.split(" ")[0]}%`),
          like(tasks.title, "Week % Day %"),
          like(tasks.title, "Day %")
        )
      )
    );

    if (subjectId) {
      await db
        .delete(studyNotes)
        .where(and(eq(studyNotes.userId, userId), eq(studyNotes.subjectId, subjectId)));
    }

    // 3. Insert 4 Weekly Project Assignments
    const assignmentValues = pkg.assignments.map((a) => ({
      userId,
      subjectId,
      title: a.title,
      description: a.description,
      dueAt: new Date(Date.now() + a.daysDue * 86400000),
      status: "not_started" as const,
      priority: "P1",
      estimatedMinutes: 120,
    }));
    if (assignmentValues.length > 0) {
      await db.insert(assignments).values(assignmentValues);
    }

    // 4. Insert Verified Resources & FocusTube Courses (preserves existing courses, deduplicates by URL)
    if (pkg.resources.length > 0) {
      const existingResources = await db
        .select({ url: resources.url, providerItemId: resources.providerItemId })
        .from(resources)
        .where(eq(resources.userId, userId));
      const existingUrls = new Set(existingResources.map((r) => r.url));
      const existingItemIds = new Set(
        existingResources.map((r) => r.providerItemId).filter(Boolean)
      );

      const toInsert = pkg.resources.filter(
        (r) =>
          !existingUrls.has(r.url) &&
          (!r.providerItemId || !existingItemIds.has(r.providerItemId))
      );

      if (toInsert.length > 0) {
        const resourceValues = toInsert.map((r) => ({
          userId,
          type: r.type,
          title: r.title,
          url: r.url,
          providerItemId: r.providerItemId,
        }));
        await db.insert(resources).values(resourceValues);
      }
    }

    // 5. Insert 8 Structured Lecture Slide Decks in study_notes table
    if (pkg.lectureDecks.length > 0) {
      const noteValues = pkg.lectureDecks.map((d) => ({
        userId,
        subjectId,
        title: d.title,
        body: d.body,
        revision: 1,
      }));
      await db.insert(studyNotes).values(noteValues);
    }

    // 6. Insert 24 Daily Progression Tasks with Checklist Subtasks & TimeBlocks
    const today = new Date();
    const insertedTasks = [];
    const allSubtaskValues: Array<{
      taskId: string;
      title: string;
      completed: boolean;
      position: number;
      revision: number;
    }> = [];
    const allTimeBlockValues: Array<{
      userId: string;
      taskId: string;
      title: string;
      description: string;
      date: string;
      startTime: string;
      endTime: string;
      durationMins: number;
      color: string;
      position: number;
    }> = [];

    for (let i = 0; i < pkg.dailyLessons.length; i++) {
      const lesson = pkg.dailyLessons[i];
      if (!lesson) continue;

      const lessonDate = new Date(today);
      lessonDate.setDate(today.getDate() + i);
      const dateStr: string = lessonDate.toISOString().split("T")[0]!;

      const [taskRow] = await db
        .insert(tasks)
        .values({
          userId,
          title: lesson.title,
          notes: lesson.notes,
          scheduledDate: dateStr,
          estimatedMins: 90,
          actualMins: 0,
          priority: i < 6 ? "P1" : "P2",
          position: i,
          subtasksHidden: false,
          revision: 1,
        })
        .returning({ id: tasks.id });

      if (taskRow) {
        insertedTasks.push(taskRow);

        // Queue Checklist Subtasks
        if (lesson.subtasks && lesson.subtasks.length > 0) {
          for (let stIdx = 0; stIdx < lesson.subtasks.length; stIdx++) {
            const st = lesson.subtasks[stIdx];
            if (st) {
              allSubtaskValues.push({
                taskId: taskRow.id,
                title: st,
                completed: false,
                position: stIdx,
                revision: 1,
              });
            }
          }
        }

        // Queue Calendar TimeBlock (18:00 to 19:30)
        allTimeBlockValues.push({
          userId,
          taskId: taskRow.id,
          title: `Study: ${lesson.title}`,
          description: `Dedicated focused session for ${lesson.title}`,
          date: dateStr,
          startTime: "18:00",
          endTime: "19:30",
          durationMins: 90,
          color: pkg.subject.color || "#6366F1",
          position: 0,
        });
      }
    }

    if (allSubtaskValues.length > 0) {
      await db.insert(subtasks).values(allSubtaskValues);
    }
    if (allTimeBlockValues.length > 0) {
      await db.insert(timeBlocks).values(allTimeBlockValues);
    }

    return {
      success: true,
      subjectId,
      subjectName: pkg.subject.name,
      tasksCreated: insertedTasks.length,
      lectureDecksCreated: pkg.lectureDecks.length,
      assignmentsCreated: pkg.assignments.length,
      resourcesCreated: pkg.resources.length,
    };
  }

  /**
   * Seed a new user account with foundational starter subjects so their workspace is never empty.
   */
  static async seedNewUserWorkspace(userId: string, topic = "c-programming") {
    const pkg = await this.resolveCurriculum(topic);
    return await this.enrollPackage(userId, pkg);
  }
}
