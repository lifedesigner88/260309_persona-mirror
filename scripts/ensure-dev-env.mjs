import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

const envPairs = [
  ["apps/frontend/.env.example", "apps/frontend/.env"],
  ["apps/backend/.env.example", "apps/backend/.env"],
  ["apps/ai-worker/.env.example", "apps/ai-worker/.env"]
];

for (const [exampleRelative, targetRelative] of envPairs) {
  const examplePath = path.join(rootDir, exampleRelative);
  const targetPath = path.join(rootDir, targetRelative);

  if (!existsSync(examplePath)) {
    throw new Error(`Missing required env example: ${exampleRelative}`);
  }

  if (!existsSync(targetPath)) {
    copyFileSync(examplePath, targetPath);
    console.log(`Created ${targetRelative} from ${exampleRelative}`);
  }
}
