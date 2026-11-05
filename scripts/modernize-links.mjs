import fs from "fs";

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping missing file: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  for (const [from, to] of replacements) {
    if (typeof from === "string") {
      if (content.includes(from)) {
        content = content.replaceAll(from, to);
        modified = true;
      }
    } else if (from instanceof RegExp) {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Updated: ${filePath}`);
  }
}

// 1. FAQ Section
replaceInFile("apps/web/src/components/landing/faq-section.tsx", [
  [
    `    question: "How does StudyOS relate to Open Sunsama?",
    answer:
      "StudyOS is being built incrementally on the inherited Open Sunsama foundation. The project preserves upstream attribution and license information while developing a student-first product.",
    link: {
      label: "View the inherited foundation",
      href: "https://github.com/ShadowWalker2014/open-sunsama",
    },`,
    `    question: "Where can I find the source code and contribute?",
    answer:
      "StudyOS is completely open source. You can explore the codebase, report issues, suggest new academic tools, and track progress on GitHub.",
    link: {
      label: "View StudyOS on GitHub",
      href: "https://github.com/saishivasanjeethpaikarao-jpg/StudyOS",
    },`,
  ],
]);

// 2. Agent Panel & MCP Settings
replaceInFile("apps/web/src/components/marketing/agent-panel.tsx", [
  ["https://api.opensunsama.com/mcp", "https://studyos-api-wy5w.onrender.com/mcp"],
]);

replaceInFile("apps/web/src/components/settings/mcp-settings.tsx", [
  ["https://api.opensunsama.com", "https://studyos-api-wy5w.onrender.com"],
]);

// 3. SEO schemas & headers
replaceInFile("apps/web/src/components/seo/seo-head.tsx", [
  ["https://opensunsama.com", "https://studyos-web-8ruc.onrender.com"],
]);

replaceInFile("apps/web/src/components/seo/software-schema.tsx", [
  ["https://opensunsama.com", "https://studyos-web-8ruc.onrender.com"],
  ["https://github.com/ShadowWalker2014/open-sunsama", "https://github.com/saishivasanjeethpaikarao-jpg/StudyOS"],
  ["Open Sunsama contributors", "StudyOS Team"],
]);

replaceInFile("apps/web/src/components/seo/docs-schema.tsx", [
  ["https://opensunsama.com", "https://studyos-web-8ruc.onrender.com"],
  ["https://github.com/ShadowWalker2014/open-sunsama", "https://github.com/saishivasanjeethpaikarao-jpg/StudyOS"],
  ["Open Sunsama contributors", "StudyOS Team"],
]);

replaceInFile("apps/web/src/components/seo/collection-schema.tsx", [
  ["https://opensunsama.com", "https://studyos-web-8ruc.onrender.com"],
]);

replaceInFile("apps/web/src/components/seo/product-comparison-schema.tsx", [
  ["https://opensunsama.com", "https://studyos-web-8ruc.onrender.com"],
]);

replaceInFile("apps/web/src/components/blog/share-buttons.tsx", [
  ["https://opensunsama.com", "https://studyos-web-8ruc.onrender.com"],
]);

replaceInFile("apps/web/src/components/pwa/phone-demo.tsx", [
  ["opensunsama.com", "studyos.app"],
]);

// 4. Legal documents (Privacy & Terms)
replaceInFile("apps/web/src/content/legal/privacy.mdx", [
  ["Open Sunsama", "StudyOS"],
  ["support@opensunsama.com", "support@studyos.com"],
  ["https://github.com/ShadowWalker2014/open-sunsama", "https://github.com/saishivasanjeethpaikarao-jpg/StudyOS"],
]);

replaceInFile("apps/web/src/content/legal/terms.mdx", [
  ["Open Sunsama", "StudyOS"],
  ["legal@opensunsama.com", "legal@studyos.com"],
  ["https://github.com/ShadowWalker2014/open-sunsama", "https://github.com/saishivasanjeethpaikarao-jpg/StudyOS"],
]);

console.log("All target links modernized to StudyOS successfully!");
