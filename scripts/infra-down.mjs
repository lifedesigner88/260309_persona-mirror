import { spawnSync } from "node:child_process";

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  const status = result.status ?? 0;
  if (!allowFailure && status !== 0) {
    process.exit(status);
  }
}

// Only stop/remove infra services used by local dev.
run("docker", ["compose", "stop", "db", "redis"], { allowFailure: true });
run("docker", ["compose", "rm", "-f", "db", "redis"], { allowFailure: true });
