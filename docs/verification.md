# Verification record

Date: 13 October 2026. Windows / PowerShell / Node 24.19.0 / Python 3.12.14.

| Check                          | Observed result                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Pytest                         | 25 tests passed, including database/count regression checks                                                              |
| Vitest / React Testing Library | 6 tests passed                                                                                                           |
| Playwright / Chromium          | All 3 critical scenarios passed; approval/reload/evidence/history, missing-data/rejection, unavailable-tool/mobile       |
| TypeScript strict build        | Passed                                                                                                                   |
| ESLint                         | Passed after excluding downloaded third-party browser assets and fixing browser-context globals in the screenshot helper |
| Ruff lint / formatting         | Passed                                                                                                                   |
| Prettier                       | Passed                                                                                                                   |
| Vite production build          | Passed; non-fatal Zod dependency annotation warnings                                                                     |
| Running frontend/backend       | Frontend 127.0.0.1:5173, backend 127.0.0.1:8010, frontend proxy health returned connected                                |
| Browser screenshot QA          | Desktop overview/assistant and 390px mobile captured from real app; no page errors and no horizontal mobile overflow     |

The test run uses a separate database from the demonstration. Screenshots under `docs/screenshots/` are real application captures. The screenshot helper creates a genuine awaiting-approval workflow in the demonstration; it does not approve the action.

Non-fatal warning: installed Starlette deprecates its httpx-based TestClient path; API tests still pass. No hosted deployment, Amazon device/API integration, video upload, GitHub publication, or Devpost submission has been verified or performed.
