import { spawnSync } from "node:child_process";

const containerName = "persona-mirror-backend";

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
  "8000:8000",
  "--env-file",
  "apps/backend/.env",
  "-e",
  "DATABASE_URL=postgresql+psycopg://persona:persona@host.docker.internal:5432/persona_mirror",
  "--add-host",
  "host.docker.internal:host-gateway",
  "persona-mirror-backend:dev",
]);

process.exit(status);
