import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundled = path.join(
  homedir(),
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
);
const venv = path.join(
  root,
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python",
);
const python =
  process.env.NOVA_PYTHON ||
  (existsSync(venv) ? venv : existsSync(bundled) ? bundled : "python");
const env = {
  ...process.env,
  PYTHONPATH: [
    path.join(root, ".python-deps"),
    path.join(root, "backend"),
    process.env.PYTHONPATH,
  ]
    .filter(Boolean)
    .join(path.delimiter),
};
const tasks = {
  backend: [
    python,
    [
      "-m",
      "uvicorn",
      "app.main:app",
      "--host",
      "127.0.0.1",
      "--port",
      process.env.NOVA_PORT || "8010",
    ],
  ],
  seed: [python, ["-m", "app.seed", ...process.argv.slice(3)]],
  test: [python, ["-m", "pytest", "-q"]],
  ruff: [python, ["-m", "ruff", "check", "backend"]],
  "ruff-format": [python, ["-m", "ruff", "format", "--check", "backend"]],
  install: [
    python,
    [
      "-m",
      "pip",
      "install",
      "--target",
      ".python-deps",
      "-r",
      "backend/requirements-lock.txt",
    ],
  ],
  frontend: [
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
  ],
  build: [process.execPath, ["node_modules/vite/bin/vite.js", "build"]],
};
const task = tasks[process.argv[2]];
if (!task) {
  console.error(
    "Usage: node scripts/run.mjs backend|frontend|seed [--reset]|test|ruff|ruff-format|install|build",
  );
  process.exit(1);
}
if (spawnSync(python, ["--version"], { env, stdio: "ignore" }).error) {
  console.error(
    "Python 3.12+ is required. Install Python or set NOVA_PYTHON to its executable.",
  );
  process.exit(1);
}
const child = spawn(task[0], task[1], {
  cwd: root,
  env,
  stdio: "inherit",
  windowsHide: true,
});
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 1));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
