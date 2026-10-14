# Tool contracts

All registry calls validate `ToolInput` (workflow ID, allowed scenario, structured data) and `ToolOutput` (structured dictionary and summary). Task/event results use Pydantic projections; plans/evidence use PlanItem/Evidence validation. Calls outside REGISTRY are rejected. Each contract below is exercised by backend tests directly or through a complete workflow.

| Tool                          | Purpose / input                                            | Structured result                            | Side effect / failure                                                                         |
| ----------------------------- | ---------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| get_today_schedule            | Current date in configured timezone                        | tasks                                        | Read-only; DB failures surface as request errors                                              |
| get_pending_tasks             | Today’s stored completion statuses                         | tasks ordered by priority then schedule      | Read-only                                                                                     |
| inspect_simulated_home_events | Normal, missing, unavailable scenario                      | events, explicit limitations                 | Read-only; unavailable scenario raises a visible tool failure                                 |
| create_prioritized_plan       | Task records and event limitations                         | validated plan items, evidence, dependencies | No routine mutation; missing info yields a human-check-in suggestion                          |
| prepare_family_update         | Pending tasks/events/limitations                           | message, evidence                            | Draft only; no delivery                                                                       |
| create_approval_request       | Nonempty message and valid evidence                        | action_id                                    | Inserts awaiting-approval ProposedAction; transaction owned by orchestrator                   |
| execute_approved_action       | Action ID already claimed as executing                     | delivery_id, verified result summary         | Inserts one FamilyDelivery and reads it back; approval service controls transaction/savepoint |
| write_action_ledger_entry     | Tool name, description, status, result, optional action ID | ledger_id                                    | Inserts ledger row; transaction owned by caller                                               |

Tool errors are caught only for expected validation/runtime failures in orchestration; unexpected infrastructure errors surface as HTTP 500 and are logged, never fake success. The controlled event-source failure is a local scenario, not a live device outage. There is no arbitrary model invocation or optional model/MCP implementation in v1.
