# FinAI tool routing, schema and timeout optimization

Date: 2026-11-20  
Environment: local Docker stack, configured Gemini, isolated `@example.test` fixture  
Scope: Python Action Agent orchestration. No production deployment and no real-user finance mutation.

## Executive result

FinAI no longer sends all 11 tool schemas for every request. Tool declarations are routed by intent and conversation context, Pydantic schemas are converted to Gemini-compatible declarations, duplicate READ calls are cached within the request, request budgets are deadline-aware, and structured traces now distinguish declared, selected, executed and proposed tools.

Observed after the final change:

- Live Gemini selection: 10/10 expected cases.
- Python regression: 32/32 passed.
- Focused Java regression: 19/19 passed.
- Four concurrent live READ requests: 4/4 HTTP 200, 1.154–3.256 seconds, zero 504 responses.
- Schema warnings in the benchmark window: zero.
- Phase 1 WRITE: two READ calls, one proposal, two model rounds; proposal moved from `PENDING` to `CANCELLED` and was never executed.

## Evidence captured before optimization

The first traced request was `Tháng này tui tiêu bao nhiêu?`:

- 11 tools were declared to Gemini.
- The SDK emitted 22 schema warnings (`additionalProperties` plus nested `$defs`).
- Gemini selected only `get_financial_overview`.
- Spring executed only `get_financial_overview`.
- The request returned HTTP 200 in 2.903 seconds.

This proves the schema-warning count was not the tool-execution count.

A real combined request then exposed the functional and latency problem:

`Tổng hợp cho tui tháng này: thu chi, tổng số dư các ví, ngân sách, mục tiêu, công nợ và các lịch thanh toán tuần sau.`

- Declared: all 11 tools.
- Selected/executed: `get_financial_overview`, `get_schedules`.
- Latency: 11.670 seconds.
- Incorrect result: the overview reported zero income/expense because `tuần sau` was applied to both the schedule and the month overview. Backend logs confirmed the overview range was incorrectly changed to 2026-11-23 through 2026-11-29.

The Phase 1 WRITE trace also reproduced a real loop:

- Selected sequence: `get_accounts` → `create_transaction` → repeated `get_transactions` calls.
- The initial run reached the model-round limit after 14.240 seconds and returned 502.
- Root cause: `create_transaction` requires `categoryId`, but the 11-tool catalog has no category READ tool. The metadata lookup also inherited `hôm nay`, returning no historical category data.
- No WRITE was executed in any failed trace.

## Root causes

### Schema warnings

Pydantic emits `additionalProperties: false` for `extra="forbid"`. Nested `BudgetItemArgs` also produces `$defs` and `$ref`. The installed Gemini/LangChain adapter ignores `additionalProperties` and `$defs`, logging each occurrence whenever tools are bound.

The old code passed raw `model_json_schema()` for every tool on every request. The warnings were declaration-conversion warnings, not evidence of tool execution.

### Excessive declaration and model cost

`_model()` always bound all nine READ and two WRITE tools. Even casual chat and one-module questions paid the schema/token cost. Every successful READ normally required a second Gemini round to verbalize the structured result.

### Overcalling loop

The old global limits were six model rounds and eight tool calls regardless of request type. There was no request-local result cache. Gemini could repeat the same call or vary filters while searching for an identifier.

For WRITE requests, a category lookup was incorrectly treated like the new transaction query, so relative dates and search terms could filter all historical categories out.

### Temporal cross-contamination

One `_relative_period()` result was applied to each selected tool. In a multi-intent prompt, the next-week schedule phrase took precedence over the current-month cashflow phrase.

### Financial-calendar source parity

The web and mobile calendar render a union of `scheduleApi.getSchedules()` and `debtApi.getDebts()`, but FinAI previously routed calendar/due-date questions only to `get_schedules`. Calendar intents now require both `get_schedules` and `get_debts` with the same bounded range. Debt READ results include expanded `calendarOccurrences` for one-time, weekly, biweekly, monthly, quarterly, and yearly payment/collection events. “This month” uses the full calendar month; an unspecified “upcoming/near due” query uses the next 30 days. The agent cannot finalize a calendar answer until both sources have succeeded.

### 504 path

The Python endpoint maps `GeminiTimeoutError` and `ToolTimeoutError` to HTTP 504. The active limits were:

- Gemini per-attempt timeout: 10 seconds.
- Python request budget: 25 seconds.
- Spring read timeout to Python: 30 seconds.
- Nginx API read timeout: 60 seconds.

The retry helper could start another full model attempt without first checking whether it fit inside the remaining 25-second budget. Two normal model rounds plus a timeout/retry could therefore exhaust the Python budget and return 504 before Spring or Nginx timed out.

The user-reported pre-restart 504 log was not retained after the containers restarted, and the four-request baseline run itself produced 0/4 timeouts. This report therefore does not invent a pre-change timeout rate. The 504 cause is supported by the exception path, configured deadlines and observed per-round Gemini latency; the post-change rate below is directly measured.

## Implemented changes

### Gemini-compatible, cached schemas

- Resolve local `$ref` against `$defs` recursively before removing `$defs`.
- Fail closed on missing, external or recursive references.
- Remove only declaration keywords unsupported by the current Gemini adapter: `$defs`, `$ref` after resolution, and `additionalProperties`.
- Preserve Pydantic `extra="forbid"`, field constraints, model validators and Spring allowlists.
- Cache normalized declarations by tool name and routed tool tuple.

### Contextual tool routing

- Normalize Vietnamese accents, including the non-decomposing `đ`, and support unaccented text.
- Combine intent signals, request type, recent user turns and ambiguous-reference detection.
- Casual/general advice exposes no financial tools.
- Single-module requests expose only the corresponding tool.
- Multi-module requests expose the union of required tools.
- Group requests expose group resolution and finance tools.
- Uncertain personal-finance requests widen to READ tools only.
- Transaction/budget creation explicitly retains its WRITE tool and required READ helpers.

This is not a hard keyword denylist: ambiguous turns such as `cái đó`, `thì sao`, and `nhóm kia` inherit the recent user intent; uncertain personal-finance requests use a safe READ-only fallback instead of prematurely excluding tools.

### Loop controls

- Per-request-type limits:
  - casual: one model round, zero tool calls;
  - simple READ: two rounds, one call;
  - multi/group READ: up to three rounds with a bounded module-sized call limit;
  - WRITE: up to five rounds/six selections only while identifiers are unresolved.
- Cache identical READ name/argument results within the request.
- Stop after a deterministic structured fast path or valid WRITE proposal.
- Fail closed when a financial READ is required but none succeeded.
- Fail closed when a WRITE request ends without a valid proposal.

### WRITE-stage routing

- Resolve account and transaction metadata in the first round.
- Historical category lookup does not inherit the new transaction's date/search filter.
- Once required READs complete, keep all historical declarations valid but force Gemini's next `tool_choice` to the WRITE function.
- For EXPENSE/INCOME, accept only a category found in authorized READ results. A small bilingual semantic alias map may select it only when the best match is unique.
- Spring still revalidates account/category ownership and creates only a `PENDING` proposal. Execution still requires the existing explicit confirmation endpoint.

### Deadline-aware retries and fast paths

- A retry is not started unless the remaining request budget can fit one model timeout, backoff and response margin.
- Quota, timeout, network and invalid-request failures remain distinct.
- Deterministic fast paths are deliberately narrow:
  - simple expense overview with the expected authoritative summary shape;
  - successful empty collections with a module-specific empty message.
- Unknown shapes and nontrivial answers still use the second Gemini round.

### Structured tracing

Each request now emits JSON metadata events containing:

- `requestId`, `modelRound`, `requestType`, `availableTools`;
- `selectedTools`, `executedTools`, `proposedTools`;
- per-tool and per-round latency;
- input/output tokens, total latency and `stopReason`;
- cache hits, route narrowing and validation field/type codes.

Prompts, arguments, results, user IDs, JWTs, context tokens, API keys and financial values are never logged.

## Before/after benchmark

| Scenario | Before | After |
|---|---:|---:|
| Tool declarations, simple expense | 11 | 1 |
| SDK schema warnings/request | 22 observed | 0 |
| Live selection accuracy | 10/10 | 10/10 |
| Live selection input tokens | about 2,485–2,493 | about 1,090–1,391 |
| Simple expense model rounds | 2 | 1 structured fast path |
| Simple expense tools executed | 1 | 1 |
| Full combined latency | 11.670 s, incorrect period | 3.600 s, correct amounts/periods |
| Four concurrent READ latency | 7.413–12.784 s | 1.154–3.256 s |
| Four concurrent timeout rate | 0/4 | 0/4 |
| WRITE transaction | 3–5 rounds, repeated reads, intermittent 502 | 2 rounds, 2 READs, 1 PENDING proposal, 3.006 s |

Gemini latency remains externally variable. One pre-fast-path budget conversation recorded 5.010 and 4.635 seconds for its two rounds while backend work took 12 ms. This distinction is now visible in the trace.

## Regression coverage

Python tests cover:

- schema ref resolution and unsupported-key removal;
- strict runtime validation after schema normalization;
- casual, unaccented, module, uncertain and contextual routing;
- WRITE-tool preservation and fail-closed behavior;
- multi-intent temporal isolation;
- duplicate-call cache;
- deterministic fast paths;
- authorized category resolution;
- 429, timeout, invalid request and deadline-aware retry behavior.

Live coverage includes casual chat, all primary READ modules, group routing, multi-module questions, multi-turn ambiguous context, concurrent requests, Gemini selection, and transaction proposal/cancel. Java tests retain registry, executor, temporal, security and confirm/cancel coverage.

## Files changed for this optimization

- `pfm-ai-service/action_agent.py`
- `pfm-ai-service/test_action_agent.py`
- `pfm-ai-service/live_read_tool_selection.py`
- `docs/FINAI_TOOL_ROUTING_OPTIMIZATION.md`

## Remaining issues and recommendations

- Gemini latency is still provider-dependent; tracing should feed a metrics backend before production SLO enforcement.
- The tool catalog still lacks an explicit category READ tool. The authorized-history resolver is bounded and safe, but a dedicated `get_categories` tool would be clearer for users with no historical transaction in a requested category.
- The current router is contextual and conservative but not a learned semantic classifier. Add a labeled Vietnamese routing evaluation set before expanding domains.
- Structured traces are logs, not durable request metrics. Add aggregation/retention with redaction controls if operational dashboards are required.
- No production deployment was performed.
