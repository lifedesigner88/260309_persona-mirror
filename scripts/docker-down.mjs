import { spawnSync } from "node:child_process";

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

run(
  "docker",
  ["rm", "-f", "persona-mirror-backend", "persona-mirror-frontend", "persona-mirror-ai-worker"],
  {
    stdio: "ignore"
  }
);

process.exit(run("docker", ["compose", "down"]));
