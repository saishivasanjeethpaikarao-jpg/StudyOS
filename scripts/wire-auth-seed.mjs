import fs from "fs";

// 1. auth.ts
let authFile = fs.readFileSync("apps/api/src/routes/auth.ts", "utf8");
if (!authFile.includes("UniversalSyllabusService")) {
  authFile = authFile.replace(
    /import { googleAuthRouter } from ['"]\.\/google-auth\.js['"];/,
    `import { googleAuthRouter } from './google-auth.js';\nimport { UniversalSyllabusService } from '../services/academics/universal-syllabus.js';`
  );
  authFile = authFile.replace(
    /if \(!newUser\) throw new Error\(['"]Failed to create user['"]\);/,
    `if (!newUser) throw new Error('Failed to create user');\n  void UniversalSyllabusService.seedNewUserWorkspace(newUser.id).catch((err) => console.error('Starter seed error:', err));`
  );
  fs.writeFileSync("apps/api/src/routes/auth.ts", authFile, "utf8");
  console.log("auth.ts updated successfully");
} else {
  console.log("auth.ts already has UniversalSyllabusService");
}

// 2. google-auth.ts
let googleFile = fs.readFileSync("apps/api/src/routes/google-auth.ts", "utf8");
if (!googleFile.includes("UniversalSyllabusService")) {
  googleFile = `import { UniversalSyllabusService } from '../services/academics/universal-syllabus.js';\n` + googleFile;
  googleFile = googleFile.replace(
    /userId = created\.id;/,
    `userId = created.id;\n        void UniversalSyllabusService.seedNewUserWorkspace(userId).catch((err) => console.error('OAuth starter seed error:', err));`
  );
  fs.writeFileSync("apps/api/src/routes/google-auth.ts", googleFile, "utf8");
  console.log("google-auth.ts updated successfully");
} else {
  console.log("google-auth.ts already has UniversalSyllabusService");
}
