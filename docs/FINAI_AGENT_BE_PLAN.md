# FinAI Action Agent - Backend implementation plan

## 1. Current architecture

### Spring Boot backend

- Java 21 / Spring Boot 4.1.1, Spring MVC, Spring Security, Spring Data JPA and PostgreSQL.
- JWT is parsed by `JwtAuthenticationFilter`; controllers receive the verified `User` with `@AuthenticationPrincipal`. Business services consistently accept `UUID userId` and repositories use ownership-scoped queries such as `findByIdAndUserId`.
- Financial domains already exist for accounts, transactions, categories, budgets, goals, debts, schedules and groups. `TransactionService` owns balance invariants and `BudgetService` owns overlap/category validation and budget calculations.
- Write endpoints already have an idempotency facility (`@Idempotent`, `IdempotencyService`, `core.idempotency_keys`).
- Transactions and budgets use `@Transactional`; validation is split between Bean Validation DTO constraints and service-level business checks. `GlobalExceptionHandler` maps validation, business, authentication and authorization failures.
- Flyway migrations are in `backend/src/main/resources/db/migration`; current latest migration is V60. Hibernate DDL is disabled.
- There is no Spring controller or client for the PFM AI service. Nginx/frontends currently call the Python service directly. Migration V45 created `core.ai_chat_sessions` and `core.ai_chat_messages`, but there are no Java entities/repositories/services for them.
- Existing `core.audit_logs` is admin-oriented (`admin_id`, `admin_username`) and is not an appropriate durable Action Agent audit record.

### Python AI service

- FastAPI service in `pfm-ai-service`; `/api/chat` persists history via SQLAlchemy and invokes `run_chat`.
- `agent.py` uses `ChatGoogleGenerativeAI` with `gemini-flash-lite-latest` and LangGraph `create_react_agent`. It supports a local Ollama fallback.
- Conversation context is the most recent persisted messages from PostgreSQL. A deterministic finance-scope guard runs before the model.
- Existing LangChain tools in `tools.py` read PostgreSQL directly through SQLAlchemy. They accept/default a `user_id`, resolve it in Python and return prose strings. They include balances, spending, budget, transaction search/comparison, forecasts, anomaly, behavior and recommendations.
- The Python service has no trusted service-to-service authentication, structured tool registry, JSON-schema validation, bounded manual function-call loop, pending writes or safe write execution.
- Model errors are currently collapsed into a text response. There is no typed handling for 429/quota, timeout or retry policy.

## 2. Components to reuse

- JWT authentication and verified `User` principal.
- `TransactionService.createTransaction/listTransactions` and all existing balance/resource ownership checks.
- `BudgetService.createBudget` and its overlap/category validation.
- Account/category repositories for ownership pre-validation and user-friendly action previews.
- Existing V45 durable conversation tables and Flyway infrastructure.
- Existing idempotency concepts; pending actions add a separate unique execution key because confirmation is a state transition, not a normal request replay.
- Python finance scope guard and Gemini/LangChain SDK already used by the project.

## 3. Components to add

- Spring `finai` module: controller, DTOs, entities, repositories, services, tool registry/executor, AI service client and security filter for internal endpoints.
- Durable PostgreSQL pending actions and action-specific audit logs; optional plan identifier for multiple proposed actions.
- Atomic `PENDING -> EXECUTING` claim, expiry, ownership enforcement, result/error persistence and duplicate-confirm handling.
- Backend-owned tool validation and execution for the initial real tools: `get_transactions`, `create_transaction`, `create_budget`.
- Authenticated internal tool API. Python receives an opaque short-lived request context from Spring, never the browser JWT and never a model-controlled user id.
- Python structured schemas, bounded manual function loop, typed responses and controlled retry for read/model calls only.
- Public Spring chat/action/history endpoints and a frontend contract.

## 4. Tool inventory

### Phase 1 (implemented first)

| Tool | Mode | Existing business implementation | Permission |
|---|---|---|---|
| `get_transactions` | READ | `TransactionService.listTransactions` | authenticated owner |
| `create_transaction` | WRITE | `TransactionService.createTransaction` | authenticated owner; account/category ownership |
| `create_budget` | WRITE | `BudgetService.createBudget` | authenticated owner; category ownership |

### Eligible later tools

- READ: `get_transaction_detail`, `get_wallets`, `get_wallet_balance`, `get_budgets`, `get_budget_usage`, `get_financial_goals`, `get_debts`, `get_income_summary`, `get_expense_summary`, `get_category_spending`.
- WRITE: `update_transaction`, `update_budget`, `create_financial_goal`, `update_financial_goal`, `transfer_between_wallets`.
- A tool is added only when its executor delegates to a real business service and ownership checks are testable. Existing Python-only analytical tools remain backward-compatible but are not Action Agent write tools.

## 5. READ and WRITE flows

### READ

1. Browser calls Spring with JWT; Spring derives the user from the security context.
2. Spring forwards message, conversation id and an opaque signed internal context to Python.
3. Gemini selects a registered READ function. Python validates the JSON arguments and calls the allow-listed Spring internal tool endpoint.
4. Spring resolves the verified user context, validates the tool and executes the existing business service with that user id.
5. Structured tool output is returned to Python, then supplied back to Gemini. Tool calls and model rounds are bounded.
6. Spring persists user/assistant messages and returns a typed response.

### WRITE

1. Gemini may propose a registered WRITE tool but Python never executes it.
2. Spring validates schema, resource ownership and business preconditions, then stores immutable validated arguments as a `PENDING` action with expiry and unique idempotency key.
3. API returns `ACTION_REQUIRED` plus a safe preview.
4. Confirmation authenticates the user again, checks ownership/status/expiry and atomically claims `PENDING -> EXECUTING`.
5. The executor revalidates resource ownership and business rules, calls the real service in a transaction, stores the result and audit record, then marks `COMPLETED`; errors become `FAILED`.
6. Repeated confirmation returns the existing terminal state and never repeats the business write.

## 6. Security risks and controls

- **Model-supplied identity:** reject/ignore all `userId` tool arguments; identity comes only from JWT/internal signed context.
- **Cross-user IDs:** every resource is loaded with user-scoped repositories before execution and again on confirmation.
- **Prompt injection in financial text:** tool output is marked as untrusted data; tool names and arguments must match registry/schema; no URLs, SQL or secrets are executable.
- **JWT/secret disclosure:** browser JWT is terminated at Spring. Internal secret is an HTTP header and is never included in prompts or logs.
- **Replay/duplicate confirmation:** unique execution key, pessimistic/atomic state claim and terminal-state idempotent response.
- **Stale approval:** immutable arguments, expiry and full revalidation at execution. Any argument change creates a new action.
- **Blind retries:** WRITE tools are never retried by Python. Model/READ retries use small exponential backoff only for timeout/429.
- **False success:** only persisted backend action status/result proves success; model prose is never evidence.
- **Resource exhaustion:** message length, page/limit, maximum model rounds/tool calls, HTTP timeouts and action TTL are bounded.
- **Sensitive logs:** log ids/tool/status, not JWT, secret, prompts or raw financial payloads.

## 7. Expected file changes

- `backend/src/main/java/com/finance/finance/modules/finai/**`
- `backend/src/main/java/com/finance/finance/common/config/SecurityConfig.java`
- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/db/migration/V61__create_finai_action_agent_tables.sql`
- `backend/src/test/java/com/finance/finance/modules/finai/**`
- `pfm-ai-service/agent.py`, `main.py`, `requirements.txt`
- new Python modules/tests for schemas, registry, backend client and orchestration
- `docker-compose.yml`, `.env.example`
- `docs/FINAI_AGENT_API_CONTRACT.md` and this plan

No frontend file will be changed.

## 8. Phased implementation

1. **Survey/design (this document):** map actual code, define trust boundaries and contracts.
2. **Backend action foundation:** migration, durable entities, registry, three initial tools, confirmation/cancel/status/history APIs, audit and internal authentication.
3. **AI orchestration:** native structured Gemini tool declarations/manual execution, bounded multi-step loop, backend-only tool calls, typed error handling and legacy `/api/chat` compatibility.
4. **Verification:** unit tests for registry/schema and state machine; integration-oriented controller/service tests; Python tests for selection, limits, prompt injection and 429/timeout.
5. **Documentation/handoff:** exact API payloads, environment, migration, Docker/local run instructions and known limitations.
6. **Later expansion:** add eligible tools one at a time after the three-tool end-to-end path passes; add durable multi-action plans/ordered partial-failure policies before exposing plan-level confirmation.

