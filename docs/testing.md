# Testing

## Commands

```sh
node scripts/run.mjs test
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc -b
node node_modules/eslint/bin/eslint.js .
node scripts/run.mjs ruff
node scripts/run.mjs ruff-format
node node_modules/prettier/bin/prettier.cjs --check .
node node_modules/vite/bin/vite.js build
node scripts/e2e.mjs
```

Install Chromium first with `npx playwright install chromium` (or use the workspace-local browser instructions in README). The e2e launcher owns only its Python/Vite/test subprocesses, uses separate `e2e.db`, refuses occupied test ports, and tears down its subprocesses after tests. Backend fixtures use a fresh temporary SQLite file per test and never reset `nova.db`.

## Coverage

Backend: schedule retrieval and dynamic dashboard counts; plan priority/order/evidence; all eight tools and registry validation; task/notes updates; API validation, limits and filtering; unknown intents; missing and unavailable data; confirmation and reset; rejection and attempted approval after rejection; repeated and concurrent approvals; actual ledger transition order; injected execution and partial-write/verification failure; exclusion of completed tasks; database persistence across a new engine/session and non-destructive seed.

Frontend: unresolved/loading fetch, backend error without invented metrics, actual empty-state counts, validated chat submission and scenario payload, approved versus completed labels, explicit dialog confirmation.

Playwright: full dashboard → plan → linked task evidence → approval confirmation → persisted result after reload → ledger; missing-record plan and rejection across reload; unavailable tool trace and 390px mobile navigation/overflow.

## Known gaps

No authentication/multi-user authorization, external integration, cloud deployment, LLM/MCP testing, screen-reader certification, load testing, exhaustive browser compatibility or automated contrast audit. Native Chromium dialog keyboard/focus behavior is checked in the main browser scenario; functional unit tests emulate dialog opening because jsdom does not implement `showModal`. Local socket APIs used by Python's Windows event loop must be allowed; this desktop execution sandbox otherwise blocks TestClient’s socketpair.

Actual run results are recorded in [verification](verification.md). Test source presence alone is not a passing result.
