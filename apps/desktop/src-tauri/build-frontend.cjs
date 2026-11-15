const { existsSync } = require("fs");
const { execSync } = require("child_process");
const path = require("path");

const candidates = [
  path.join(__dirname, "scripts/prepare-frontend.mjs"),
  path.join(__dirname, "../scripts/prepare-frontend.mjs"),
  path.join(process.cwd(), "scripts/prepare-frontend.mjs"),
  path.join(process.cwd(), "apps/desktop/scripts/prepare-frontend.mjs")
];

const script = candidates.find(c => existsSync(c));
if (!script) {
  console.error("Could not find prepare-frontend.mjs among:", candidates);
  process.exit(1);
}

console.log("Executing desktop frontend preparation via:", script);
execSync(`node "${script}"`, { stdio: "inherit" });
