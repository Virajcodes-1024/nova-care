import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const root = process.cwd();
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
  PLAYWRIGHT_BROWSERS_PATH: existsSync(".browsers")
    ? path.join(root, ".browsers")
    : process.env.PLAYWRIGHT_BROWSERS_PATH,
};
const children = [];
function launch(command, args, extra = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...env, ...extra },
    stdio: "inherit",
    windowsHide: true,
  });
  child.on("error", (error) => console.error(error.message));
  children.push(child);
  return child;
}
async function ready(url) {
  for (let n = 0; n < 60; n++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* A server may still be starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Test server did not become ready: ${url}`);
}
let code = 1;
try {
  for (const port of [8017, 5187]) {
    try {
      await fetch(`http://127.0.0.1:${port}`, {
        signal: AbortSignal.timeout(500),
      });
      throw new Error(
        `Test port ${port} is already occupied; stop your previous NOVA test server.`,
      );
    } catch (error) {
      if (error.message.includes("occupied")) throw error;
    }
  }
  launch(
    python,
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8017"],
    { NOVA_DATABASE_URL: "sqlite:///./e2e.db" },
  );
  launch(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--port", "5187", "--host", "127.0.0.1"],
    { NOVA_API_TARGET: "http://127.0.0.1:8017" },
  );
  await Promise.all([
    ready("http://127.0.0.1:8017/api/health"),
    ready("http://127.0.0.1:5187"),
  ]);
  const tests = launch(process.execPath, [
    "node_modules/@playwright/test/cli.js",
    "test",
    ...process.argv.slice(2),
  ]);
  code = await new Promise((resolve) =>
    tests.on("exit", (value) => resolve(value ?? 1)),
  );
} catch (error) {
  console.error(error.message);
} finally {
  for (const child of children)
    if (child.exitCode === null) child.kill("SIGKILL");
}
process.exit(code);
