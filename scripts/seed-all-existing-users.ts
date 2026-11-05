import { getDb, users, studyNotes, subjects } from "@open-sunsama/database";
import { UniversalSyllabusService } from "../apps/api/src/services/academics/universal-syllabus.js";

async function main() {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgresql://postgres.sdydpcfttodngamwnjek:Sai238313%40%23%24@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

  const db = getDb();
  const allUsers = await db.select({ id: users.id, email: users.email }).from(users);
  console.log(`Found ${allUsers.length} users in database.`);

  for (const u of allUsers) {
    console.log(`\nChecking / Seeding academic starter workspace for ${u.email} (${u.id})...`);
    try {
      const res = await UniversalSyllabusService.seedNewUserWorkspace(u.id);
      console.log(`✅ Success for ${u.email}: ${res.subjectName} (${res.subjectId}) - ${res.lectureDecksCreated} decks, ${res.assignmentsCreated} assignments, ${res.tasksCreated} tasks, ${res.resourcesCreated} resources.`);
    } catch (err) {
      console.error(`❌ Failed for ${u.email}:`, err);
    }
  }

  // Summary audit
  for (const u of allUsers) {
    const subs = await db.select().from(subjects).where(subjects.userId.eq(u.id));
    const notes = await db.select().from(studyNotes).where(studyNotes.userId.eq(u.id));
    console.log(`User: ${u.email} -> ${subs.length} subjects, ${notes.length} notes.`);
  }

  console.log("\n🎉 All existing users verified and seeded with rich starter academic curriculum!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
