import { spawnSync } from "node:child_process";

const [dockerfilePath, imageTag] = process.argv.slice(2);

if (!dockerfilePath || !imageTag) {
  console.error("Usage: node scripts/docker-build.mjs <dockerfile-path> <image-tag>");
  process.exit(1);
}

const result = spawnSync(
  "docker",
  ["build", "--progress=plain", "-f", dockerfilePath, "-t", imageTag, "."],
  {
    stdio: "inherit",
    shell: false,
  }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
