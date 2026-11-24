# FinAI Phase 3 write implementation

Implemented: 2026-11-20. Scope: Spring backend, Python orchestration, Web/Mobile action cards, automated tests, and local live E2E.

## Result

FinAI now exposes ten additional write tools in three waves:

| Wave | Tool | Business service | Balance/transaction effect |
|---|---|---|---|
| 1 | `create_goal` | `GoalService.createGoal` | No immediate wallet effect |
| 1 | `contribute_to_goal` | `GoalService.contribute` | Expense only when `sourceAccountId` is supplied |
| 1 | `create_debt` | `DebtService.createDebt` | Records debt only |
| 1 | `record_debt_payment` | `DebtService.recordPayment` | Wallet transaction only when `accountId` is supplied |
| 1 | `update_budget` | `BudgetService.updateBudget` | No wallet transaction; optimistic version required |
| 2 | `create_schedule` | `ScheduleService.createSchedule` | No immediate effect; auto-execution may create future transactions |
| 2 | `update_schedule` | `ScheduleService.updateSchedule` | Safe general settings only |
| 2 | `create_account` | `AccountService.createAccount` | Initial balance changes total assets; no history transaction |
| 3 | `create_group_transaction` | `GroupExpenseService.createExpense` | Deducts group fund or creates an expense from an owned account |
| 3 | `contribute_group_fund` | `GroupFundService.contribute` | Atomically deducts owned account and credits group fund |

No new database migration was required for Phase 3.

## Discovery and authoritative contracts

All writes delegate to existing domain services. Python never connects to the database and never executes a write. Identity comes only from the authenticated JWT/context token; `userId` is not a tool argument.

Schedule creation uses the existing iCalendar recurrence contract. Transaction schedules require owned account IDs and an accessible category; transfers require distinct source/destination accounts. Reminder schedules require a message and cannot auto-execute. Schedule updates intentionally expose only name, recurrence, end date, reminder, auto-execution, and notification settings; changing schedule type or transaction template remains unsupported because that transition is too ambiguous for natural-language confirmation.

Group expense splitting is limited to explicit `EQUAL`/`EXACT` member amounts. FinAI verifies that every split user is a current member, member IDs are unique, and split amounts equal the expense total. The read catalog gained `get_group_finances(section=members)` so the model can copy authorized member IDs instead of inventing them.

## Confirmation and transaction lifecycle

The lifecycle remains proposal-first:

1. Python validates tool arguments and returns a proposal; it does not execute the write.
2. Spring creates a durable `PENDING` action with sanitized preview and expiry.
3. Web/Mobile renders the backend preview and requires explicit confirmation.
4. Confirmation atomically claims the action, re-runs ownership/state/schema validation, and invokes the real domain service inside the existing transaction boundary.
5. Success commits the business change with action status `COMPLETED`. A business failure rolls back and records `FAILED` separately. Repeated confirmation cannot repeat the write.

Revalidation covers owned goals, debts, budgets, schedules and accounts; goal/debt terminal state; debt remaining principal; budget optimistic version; recurrence/date rules; group membership/fund availability; account currency; category access; and group split integrity.

## UI

The reusable Web and Expo action cards now recognize all Phase 3 tools. Generic previews show entity, type, amount, account/fund source, date, before/after values, notes, and material balance warnings. Confirm/cancel behavior and completed-action sync events are unchanged.

## Verification

- Python unit/orchestration suite: 38 tests passing.
- Focused Spring FinAI registry/executor/action/temporal suites passing; Wave-specific tests cover delegation, no-balance semantics, stale versions, terminal state checks, schedule rules, and account initial-balance preview.
- Web edited action card: ESLint passing.
- Mobile edited action card: targeted TypeScript check passing.
- Wave 1 live E2E on the configured test account: `create_goal` and `create_debt` each returned `ACTION_REQUIRED` with a `PENDING` action, `balanceImpact=false`, then were cancelled successfully. No goal or debt business row was created.
- Wave 2 live E2E: `create_schedule` and `create_account` each returned `ACTION_REQUIRED/PENDING` and were cancelled successfully; no schedule/account business row was created.
- Wave 3 live selection reached the guarded group routes but the configured super-admin test identity has no usable group fixture (its public group endpoint is forbidden), so no proposal could be formed and the fail-closed orchestrator returned 502. Wave 3 is covered by registry, Pydantic, routing, and Spring prepare/revalidation tests; no group data was mutated.

Full Web and Mobile repository builds still report unrelated pre-existing errors outside the FinAI action-card files; the targeted checks for the edited files pass.

## Deliberate limits

- No direct edit of action arguments in clients; changed parameters require a new proposal.
- No schedule type/template transition through `update_schedule`.
- No arbitrary percentage/share math for group expenses until the domain service owns and validates that calculation.
- No role escalation or group administration tools.
- Notifications are downstream side effects of the existing domain services and do not weaken transactional business writes.
