# FinAI Phase 2 READ audit and live E2E report

Date: 2026-11-19  
Environment: local Docker stack, PostgreSQL test database, configured Gemini, timezone `Asia/Ho_Chi_Minh`  
Scope: nine Phase 2 READ tools; Phase 1 WRITE registration/lifecycle retained

Only dedicated `@example.test` users and an `E2E Family Phase2` group were used. No existing user finance records were read or mutated for the live scenarios; the local fixtures were retained for reproducibility.

## Executive result

All nine READ tools passed live end-to-end through the public chat boundary. Gemini tool selection passed 10/10 representative cases. A four-turn financial conversation preserved context and produced values matching the isolated fixture. Java and Python focused suites both passed 19/19. Cross-user group data remained isolated.

The server-side READ path is functionally ready for a staging/device gate. It is not an unconditional production sign-off: public chat latency was 12.1-19.3 seconds in this environment, Gemini ignores two declaration-schema keywords, mobile has a long-history rendering risk, and both frontend repositories have unrelated baseline TypeScript failures.

## What was actually tested

| Level | Meaning in this report | Result |
|---|---|---|
| Static audit | Registry/schema/service/repository/UI-path inspection | Pass with noted risks |
| Unit/component | Mocked Java and Python behavior, no live model/database | Java 19/19; Python 19/19 |
| Integration | Real Spring services, PostgreSQL fixture, signed context boundary | Pass |
| Live E2E | Public `/api/v1/finai/chat`, real Gemini, internal READ calls, real local DB | 9/9 tools pass |
| Device E2E | Physical Android/iOS rendering and interaction | Not executed |

## Tool-by-tool evidence

| Tool | Live prompt/result | Backend log evidence | Status |
|---|---|---|---|
| `get_financial_overview` | Month spend returned 1,500,000 VND; comparison returned October 800,000 VND | Internal POST recorded | Pass |
| `get_transactions` | Returned the six seeded transactions in descending date order | Internal POST recorded | Pass |
| `get_accounts` | Returned 16,200,000 + 1,500,000 VND; total 17,700,000 VND | Internal POST recorded | Pass |
| `get_budgets` | Returned a successful empty-budget result | Internal POST recorded | Pass |
| `get_goals` | Returned a successful empty-goal result | Internal POST recorded | Pass |
| `get_debts` | Returned a successful empty-debt result | Internal POST recorded | Pass |
| `get_schedules` | Correctly interpreted next week as 2026-11-23 through 2026-11-29; empty result | Internal POST recorded | Pass |
| `get_groups` | Returned accessible groups only | Internal POST recorded | Pass |
| `get_group_finances` | Resolved `E2E Family Phase2` through `get_groups`, then returned overview for its real ID | Both internal POSTs recorded in order | Pass |

An empty collection above is a successful, authoritative empty result. It was not inferred from a failure or timeout.

## Isolated financial fixture and accuracy

The test user owned two accounts with initial balances of 10,000,000 and 1,000,000 VND. Seeded data included November income 5,000,000, November expenses 1,200,000 (food) and 300,000 (transport), an internal transfer of 500,000, October income 4,000,000, and October food expense 800,000.

Observed invariants:

- November expense = 1,500,000 VND. The transfer was not counted as spending.
- Top category = food, 1,200,000 VND, or 80% of November spending.
- October expense = 800,000 VND; November increase = 700,000 VND or 87.5%.
- Total assets = 17,700,000 VND. The transfer preserved total assets.
- Raw history contained all six transactions, including the transfer as a transaction but not an expense.

## Multi-turn and selection behavior

The sequence below used one durable `conversationId` throughout:

1. `Tháng này tui tiêu bao nhiêu?`
2. `Danh mục nào nhiều nhất?`
3. `So với tháng trước thì sao?`
4. `Tư vấn giúp tui giảm khoản chi đó.`

All four calls returned HTTP 200, `MESSAGE`, zero pending actions, correct amounts, and coherent references to the prior category/period. The comparison invoked two explicit ranges. The advice turn retained context and did not propose or execute a write.

History recovery was also verified through the public API: the conversation appeared in the user's conversation list, and fetching it by ID restored all eight persisted user/assistant messages with zero actions.

The standalone live selection harness covered expense summary, raw transaction list, accounts, budgets, goals, debts, next-week schedules, groups, named-group resolution, and generic 50/30/20 advice. Result: 10/10 expected selections; generic advice correctly used no financial tool. Model-selection latency was 4.0-9.4 seconds, with roughly 2,485-2,493 input tokens per case. Full public-chat latency was 12.1-13.3 seconds for normal reads and 19.3 seconds for the two-tool group chain.

## Temporal, failure and security tests

- Authoritative periods cover yesterday, current week, next week, current/previous month, three calendar months including current, current quarter and current year.
- Schedule due-date ranges are user-scoped and capped to 366 days.
- Gemini 429 responses use a bounded retry; timeout stops after two attempts; non-retryable and invalid-request errors are not retried.
- A financial question without a successful READ fails closed instead of answering with a fabricated zero.
- Pydantic and Java reject `userId`, URLs, arbitrary fields, invalid UUID/enums, excessive page sizes and invalid date ranges.
- User B could not retrieve user A's group and FinAI did not resolve it as accessible. Direct access now returns 403 `ACCESS_DENIED` with a generic message and no group-name leak.
- Group detail now validates membership before inspecting type, capacity or invitation count.
- Phase 1 write tools remain registered, and READ-only conversations returned no confirmation cards/actions.

## Defects found and fixed during live testing

1. Relative-period context was incomplete. Added authoritative boundaries across Java and Python.
2. Month comparison could reuse one period. Added explicit comparison ranges and separate `comparisonCashflow`.
3. Generic savings advice was incorrectly forced through a personal read. Corrected classification.
4. Schedule questions lacked due-date range enforcement. Added scoped repository/service support.
5. Budget native queries referenced `budgets` instead of `core.budgets`. Corrected both queries.
6. Empty budget aggregates returned a nested/null native shape and caused an index error. Added safe unwrapping/null handling.
7. Overview fetched all service sections even when only cashflow was requested. Added explicit `sections`, defaulting to cashflow.
8. Legacy authorization failures surfaced as HTTP 500. Added safe 403 mapping and moved group membership validation ahead of group-state inspection.

## Web and mobile audit

- Both clients use the durable public chat contract and recover conversation history.
- READ responses render as messages; action cards render only when `actions.length > 0`, preserving the Phase 1 confirmation boundary.
- Web production build: failed on repository-wide pre-existing TypeScript errors; no clean build is claimed.
- Mobile `tsc --noEmit`: failed on repository-wide pre-existing errors across `App.tsx`, group, theme, transaction and other modules; no clean build is claimed.
- Mobile renders the conversation in a single `ScrollView`, which can degrade with long histories. A virtualized list is recommended before high-volume rollout.
- No physical-device or browser-driven UI E2E was executed in this audit.

## Residual risks and release gate

- Run browser automation and Android/iOS device tests after restoring clean frontend builds.
- Set and measure a product latency SLO; current local full-chat p95 is above a typical 10-second target.
- Follow-up optimization on 2026-11-20 resolved `$ref` before removing `$defs` and eliminated the Gemini schema warnings while retaining Pydantic/Spring enforcement. See `FINAI_TOOL_ROUTING_OPTIMIZATION.md`; SDK support should still be rechecked on upgrades.
- Fully enumerate output schemas if downstream consumers begin depending on field-level stability.
- Budget trend fields inherited from the existing service include placeholder logic and must not be presented as measured trends without authoritative values.

## Reproduction commands

```text
python -m unittest -v test_action_agent.py
docker compose exec -T backend mvn -q '-Dtest=FinAiToolRegistryTest,FinAiToolExecutorTest,FinAiTemporalContextTest,FinAiActionServiceTest,GlobalExceptionHandlerTest' test
python live_read_tool_selection.py
```

Live chat reproduction additionally requires the local Docker stack, configured Gemini credentials, and an isolated test user/fixture. No credentials or context tokens are stored in this report.
