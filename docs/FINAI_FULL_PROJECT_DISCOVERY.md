# FinAI full project discovery

Discovery date: 2026-11-19. The executable Spring services, repositories, entities and migrations are the source of truth. UI names alone are not treated as implemented business capability.

## Inventory and status

The backend has **18 top-level business modules**. The web has 25 feature folders and the mobile app has 22; these are client projections of the backend modules rather than additional authoritative data domains.

| Module | Implemented business capability and data | FinAI decision |
|---|---|---|
| account | User-owned cash/bank/e-wallet/card/investment accounts, balance, balance history and totals | READ: accounts and assets; ownership is `userId` from trusted context |
| transaction | Income, expense, transfer, category/account filters, summaries and report export | READ: bounded list and backend aggregation; TRANSFER is never expense |
| budget | Period budgets, category items, actual spent, remaining, status, projection | READ: list/summary; reuse `BudgetService` recalculation |
| goal | Goals, milestones, contribution/withdrawal history, deadline and progress | READ: list/summary |
| debt | Borrowing/lending, payments, schedule, active/paid/overdue status | READ: list/summary |
| schedule | Recurring transaction templates, occurrences, pause/skip/execute and reminders | READ: bounded schedules; occurrence expansion remains available through existing API |
| group | Groups, roles, invitations, shared expenses/splits, balances, fund/contributions, settlements, messages, child wallets, spend requests and chores | READ: membership-checked finance sections; chat/message text intentionally excluded |
| category | System and user transaction categories, suggestion/search | Indirectly exposed in transaction/budget output; no standalone tool needed yet |
| merchant | User merchant records used by transaction/OCR flows | Not independently useful enough for LLM exposure |
| notification | User notifications, settings and devices | Financial schedule questions use schedule data; notification content/device tokens excluded |
| ocr | Receipt extraction and create-transaction handoff | No READ tool: transient extraction is initiated by explicit upload UI |
| finai | Durable conversations, trusted context token, tool registry, pending actions/audit | Infrastructure; conversation API retained, internal audit not exposed |
| auth | Login, OAuth, refresh/reset/verification tokens | Never exposed to FinAI |
| user | Profile/password/avatar | No financial READ need; sensitive profile fields excluded |
| admin | Users, roles, system settings, categories, audit, broadcast, health, AI/OCR metrics | Never exposed: administrative trust domain |
| feedback | User feedback and admin replies | Excluded: unrelated and may contain sensitive free text |
| system | Banks and public pricing configuration | Static/public lookup, not personal finance data |
| tag | User tags for organization | Implemented CRUD, but transaction DTO/tool does not yet provide a stable tag-filter contract |

## Other runtimes

- `frontend-web`: all major personal-finance flows are wired to API clients; admin pages are real but outside FinAI authorization. Financial forecast/spending analysis contain presentation logic backed partly by report/AI endpoints.
- `frontend-app`: accounts, transactions, budgets, goals, debts, reminders, groups, child wallets, reports, OCR and FinAI are active client features. No native code change is required for READ answers.
- `pfm-ai-service`: the Phase 1 Action Agent is the active trusted orchestration path. Legacy SQLite forecast/recommender/anomaly components exist, but are not authoritative for current PostgreSQL user finance and are not used by new READ tools.
- `ai/ocr-service`: independent receipt OCR pipeline; it does not become a financial database.
- PostgreSQL/Flyway: entities and migrations cover core finance, group/child sharing, notification and FinAI pending-action persistence. Python is not given database access.

## Typical questions and coverage

Wallet balances/assets, period income/expense, top categories, budget remaining/exceeded categories, goal progress/deadlines, payable/receivable debt and overdue state, recurring payments, accessible groups, group expenses/balances/fund/settlements, and child-wallet balances are covered. Contribution history for goals and debt payment schedules are present in backend detail APIs but are not yet separate bounded tool sections; see limitations.

## UI-only, partial, or intentionally unavailable

- Budget trend calculation contains a TODO/stable placeholder in `BudgetService`; it must not be described as an actual forecast.
- Forecast/anomaly/recommender data in the Python SQLite service is a separate legacy dataset and is not merged with PostgreSQL facts.
- Group messages/comments and transaction notes are untrusted user content; tools return only business DTO content needed by the selected section.
- Admin analytics, audit logs, system health, authentication tokens, device registrations and other users' data are excluded.
- A standalone tag query, goal-contribution pagination, debt-payment pagination, and cross-schedule due-date aggregation need stable backend service contracts before new tools should expose them.

