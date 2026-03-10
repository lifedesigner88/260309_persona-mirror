import { spawnSync } from "node:child_process";

const containerName = "persona-mirror-frontend";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 0;
}

run("docker", ["rm", "-f", containerName], { stdio: "ignore" });

const status = run("docker", [
  "run",
  "-d",
  "--name",
  containerName,
  "-p",
  "3000:3000",
  "-e",
  "PERSONA_VITE_CACHE_DIR=/tmp/persona-vite-cache",
  "--env-file",
  "apps/frontend/.env",
  "persona-mirror-frontend:dev",
]);

process.exit(status);
