# Product feedback — tools actually used

Date: 13 October 2026. Environment: Windows, PowerShell, bundled Node 24.19.0 and Python 3.12.14.

## Vite / React / TypeScript

Used for the frontend application and strict production builds. A Vite development proxy keeps browser API calls relative and avoids hardcoded backend URLs throughout the UI. Strict TypeScript caught mismatched shapes early. Initial production build succeeded. Onboarding needed manual runtime discovery because npm was absent from PATH; direct Node CLI entry points provided a working path. Would use again: yes, because the local development/build boundary is clear.

## pnpm

Used to install free frontend dependencies and retain exact resolved versions. The workspace-local store and hoisted modules work with this Windows workspace. The default store/project symlink failed under the sandbox; pnpm 11 also refused esbuild’s build script until explicitly allowed. Suggested improvement: offer an installation mode that avoids project-registration symlinks in restricted Windows environments, with a direct diagnostic. Would use again: yes, with documented store and build policy configuration.

## FastAPI / Pydantic / SQLAlchemy / SQLite

Used for validated routes, typed projections, transactional state transitions and durable local records. FastAPI’s TestClient and dependency overrides made isolated API tests practical; SQLAlchemy savepoints allowed meaningful verification-failure tests. SQLite’s immediate transactions and uniqueness constraints passed the concurrent-approval test. The bundled Windows Python needs loopback socket support even for in-process TestClient because of its asyncio event loop. Starlette emits a deprecation warning for its httpx-based TestClient, although the tests pass; future upgrades should revisit that supported client path. Would use again: yes for a small local monolith, with an explicit migration plan before schema evolution.

## Vitest / Testing Library / Playwright

Used for frontend behavior and browser scenarios. Vitest catches error/empty-state and submitted-payload behavior without running a backend. jsdom does not implement native modal opening; the unit test must emulate the open attribute, while a real browser checks the dialog. Playwright requires a separate browser installation and Windows subprocess lifecycle handling in this environment. Would use again: yes, because the tests cover different failure surfaces.

## Codex development environment

Used to create files, run checks, inspect failures, and open a local preview. The bundled runtime made it possible to develop without globally installed Python/npm. Discovering bundled executables required an environment-dependency lookup. Restricted local sockets blocked Python's event loop until tests were run with the necessary permission. Suggested improvement: document bundled runtime entry points and distinguish local socketpair restrictions from external-network restrictions in errors.

## Amazon tools

No Amazon SDK, live API, hardware, AWS, or Alexa+ preview developer tool was used. The project demonstrates the alternate simulated Alexa+ experience path. No claims about Amazon tool performance, onboarding, or bugs are made. Rule review is documented in the submission checklist.
