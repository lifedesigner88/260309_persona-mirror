import { spawnSync } from "node:child_process";
const rootDir = process.cwd();

function commandName(command) {
  return process.platform === "win32" ? `${command}.cmd` : command;
}

function run(command, args) {
  const result = spawnSync(commandName(command), args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Ensuring local app env files...");
run("node", ["scripts/ensure-dev-env.mjs"]);

console.log("Installing Node workspace dependencies...");
run("pnpm", ["install"]);

console.log("Syncing backend Python environment...");
run("uv", ["sync", "--project", "apps/backend"]);

console.log("Syncing ai-worker Python environment...");
run("uv", ["sync", "--project", "apps/ai-worker"]);

console.log("Setup complete. Run `pnpm dev` to start the local stack.");
