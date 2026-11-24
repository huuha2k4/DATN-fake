# FinAI READ tool implementation

## Architecture

`Client JWT -> Spring FinAiController -> signed opaque context token -> Python function calling -> internal Spring tool endpoint -> existing business service -> PostgreSQL`.

The internal controller verifies the HMAC context token and supplies its user UUID to `FinAiToolExecutor`. The model never sees or selects identity. Python has no PostgreSQL dependency and cannot generate SQL. Phase 1 write proposals, preview, confirm/cancel, idempotency and recovery are unchanged.

## Implementation map

- Java registry declares 9 READ tools and the existing 2 WRITE tools, allowed/required fields, JSON schemas and timeouts.
- Java executor validates values, date order/range, UUIDs, enums and pagination, then calls established services.
- Python mirrors every input schema with Pydantic `extra="forbid"`, advertises function declarations, caps calls/rounds/output, and marks results as `UNTRUSTED_FINANCIAL_DATA`.
- Relative periods come from Spring's authoritative temporal context: today/yesterday, current and next week, current/previous month, trailing three calendar months, current quarter and current year. The current-month default is used only for relevant questions.
- `get_transactions` uses the existing summary query, whose expense aggregation excludes TRANSFER. `get_financial_overview` returns summaries, supports an explicit comparison range, defaults to cashflow-only, and avoids shipping transaction history or querying unrelated sections.
- `get_schedules` applies authoritative due-date bounds through a user-scoped repository query.
- Membership checks remain inside group business services; account/transaction/budget/goal/debt/schedule services scope by user.

## Error and empty-data behavior

Internal non-2xx and timeouts raise tool errors. Financial questions cannot complete without a successful READ (`ToolRequiredError`), preventing fabricated zeroes. Successful empty DTOs retain their normal shape. No READ path mutates finance data.

## Phase 2 verification performed

- Focused Java tests: 19 passed across registry, executor, temporal context, Phase 1 action lifecycle and security exception mapping.
- Python unittest: 19 passed covering schemas, unknown identity fields, authoritative periods, comparisons, TRANSFER prompt rule, retry/timeout, fail-closed behavior and Phase 1 registrations.
- Live Gemini selection: 10/10 representative prompts selected the expected tool (including no tool for generic advice).
- Live E2E: all 9 READ tools returned successfully through Nginx -> Spring -> Python/Gemini -> signed internal tool endpoint -> PostgreSQL. The multi-turn finance scenario and cross-user group isolation were also exercised.
- Detailed evidence, timings, defects and UI limitations are in `FINAI_PHASE2_READ_E2E_REPORT.md`.

## Remaining risks

- Existing service DTOs are not all designed as minimal AI projections; response byte caps and tool-call limits remain the final guard.
- Budget trend fields contain existing placeholder logic; FinAI must describe them only when backed by actual values.
- Output schemas are currently generic objects at the Java registry boundary; concrete Pydantic input schemas and typed Spring DTO serialization are enforced, but fully enumerated JSON output schemas are future hardening.
- Gemini declarations are normalized by resolving `$ref`/`$defs` and removing adapter-unsupported declaration keywords. Pydantic `extra="forbid"` and the Java allowlist remain the authoritative enforcement layers. See `FINAI_TOOL_ROUTING_OPTIMIZATION.md`.
- Physical-device mobile E2E is still required; the repository-wide web/mobile static builds currently fail on pre-existing TypeScript errors.

