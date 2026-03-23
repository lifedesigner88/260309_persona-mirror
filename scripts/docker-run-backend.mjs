import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const containerName = "persona-mirror-backend";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 0;
}

// Parse app env and pass it through as-is.
const envVars = Object.fromEntries(
  readFileSync("apps/backend/.env", "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const envFlags = Object.entries(envVars).flatMap(([k, v]) => ["-e", `${k}=${v}`]);

run("docker", ["rm", "-f", containerName], { stdio: "ignore" });

const status = run("docker", [
  "run",
  "-d",
  "--name",
  containerName,
  "--network",
  "persona-mirror_default",
  "-p",
  "8000:8000",
  ...envFlags,
  "persona-mirror-backend:dev"
]);

process.exit(status);
