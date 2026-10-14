# Repeatable scenarios

Use Settings → Reset demo data → confirm before a clean demonstration. Reset is destructive to local demo records; CLI alternative: `node scripts/run.mjs seed --reset`. It creates six tasks (two completed, four pending) and four visibly simulated events dated today in Asia/Kolkata. The attention metric changes with real time and task state.

## 1. Evening routine + approved local update

Overview → Prepare the evening routine. Normal records. Send:

> Prepare my father's evening routine, review today's simulated front-door events, identify pending tasks, and prepare a family update.

Expect schedule/event tools, pending-task retrieval, priority-first plan (Evening check-in first), event limitations, evidence links, prepared draft and awaiting approval. The sample sensor is unavailable; a closed-door sample does not prove security. Before approval there is no inbox delivery/result. Open Action Center, read the draft and effect, Review & approve, confirm. Expect verified local inbox record and completed outcome. History records approved, executing, completed independently. Reload preserves the result. Repeat approval using the API: outcome remains the same and no second inbox record is created.

## 2. Missing / unavailable information

AI Assistant → choose Missing records → enter the same request. Expect “No event records available for this period” and explicit absence-of-safety-proof language. This scenario overrides retrieval for this workflow only; it does not delete database event fixtures.

Repeat with Unavailable source. Expect a failed inspect_simulated_home_events step, explicit source limitation and a corresponding failed tool ledger entry. Remaining safe planning can still produce a qualified draft. It does not hide the failed step or claim security.

## 3. Reject a proposed update

Create an update via the assistant. Action Center → Reject. Expect rejected status and “No execution or delivery occurred.” Reload preserves rejection. There is no approve control for that action. API attempts to approve a rejected action return 409. Repeated rejection is idempotent. Browser and backend tests exercise this behavior.

## 4. Execution failure (automated demonstration)

Backend tests inject a local write error and a partial-write/verification error. The action becomes failed, approval remains distinct, and no inbox delivery remains. There is no user-facing fake outage toggle for delivery; use the test run as evidence rather than claiming an error occurred in a recorded normal demo.
