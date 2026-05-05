import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const apiPort = process.env.API_PORT ?? "8080";
const webPort = process.env.WEB_PORT ?? "3000";
const pnpmExec = resolvePnpmExec();

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function resolvePnpmExec() {
  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const pnpmProbe = spawnSync(pnpmCommand, ["--version"], {
    cwd: rootDir,
    stdio: "ignore",
    shell: false,
  });

  if (pnpmProbe.status === 0) {
    return { command: pnpmCommand, prefix: [] };
  }

  const corepackCommand = process.platform === "win32" ? "corepack.cmd" : "corepack";
  return { command: corepackCommand, prefix: ["pnpm"] };
}

loadEnvFile(path.join(rootDir, ".env"));
loadEnvFile(path.join(rootDir, ".env.local"));

const requiredEnv = [
  "VITE_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
  "SESSION_SECRET",
];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}\n` +
      "Create a .env.local file in the repo root before running pnpm dev.",
  );
  process.exit(1);
}

const baseEnv = {
  ...process.env,
  NODE_ENV: "development",
  API_PORT: apiPort,
  BASE_PATH: "/",
};

function start(command, args, env) {
  const child = spawn(command, args, {
    cwd: rootDir,
    env,
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    if (typeof code === "number" && code !== 0) {
      process.exit(code);
    }
  });

  return child;
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Process exited from signal ${signal}`));
        return;
      }

      resolve(code ?? 0);
    });
  });
}

function shutdown(children) {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

const apiBuild = spawn(
  pnpmExec.command,
  [...pnpmExec.prefix, "--filter", "@workspace/api-server", "run", "build"],
  { cwd: rootDir, env: baseEnv, stdio: "inherit", shell: false },
);

apiBuild.on("exit", async (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const api = start(pnpmExec.command, [...pnpmExec.prefix, "--filter", "@workspace/api-server", "run", "start"], {
    ...baseEnv,
    PORT: apiPort,
  });
  const web = start(pnpmExec.command, [...pnpmExec.prefix, "--filter", "@workspace/project-nexus", "run", "dev"], {
    ...baseEnv,
    PORT: webPort,
  });

  const cleanup = () => shutdown([api, web]);
  const stop = (signal) => {
    cleanup();
    process.exit(signal === "SIGINT" ? 130 : 143);
  };
  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  try {
    await Promise.race([waitForExit(api), waitForExit(web)]);
  } finally {
    cleanup();
  }
});
