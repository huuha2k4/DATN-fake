# FinAI Action Agent API contract

Contract version: 1.1 (2026-11-20). Base path: `/api/v1/finai`.

## Phase 2 READ tools

The public `/chat` contract is unchanged. The agent may internally call `get_transactions`, `get_financial_overview`, `get_accounts`, `get_budgets`, `get_goals`, `get_debts`, `get_schedules`, `get_groups`, and `get_group_finances`. These calls are not public client endpoints.

Internal request path: `POST /api/internal/v1/finai/tools/{toolName}` with `{ "contextToken": "opaque", "arguments": { ... } }`. Only the Spring backend creates the signed token. Arguments never include `userId`; unknown fields are rejected. Group finance calls require an accessible `groupId` and one of `overview`, `members`, `expenses`, `balances`, `fund`, `settlements`, or `child_wallets`. Pagination is one-based and `pageSize <= 50`.

`get_financial_overview` accepts `fromDate`/`toDate`, optional `comparisonFromDate`/`comparisonToDate`, and optional `sections`. Supported sections are `cashflow`, `accounts`, `budgets`, `goals`, and `debts`; the default is cashflow only. A comparison request returns `comparisonCashflow` separately. `get_schedules` accepts `fromDate`/`toDate` as due-date bounds, with a maximum range of 366 days.

Spring supplies the model with authoritative timezone-aware values for current date/time, yesterday, current and next week boundaries, current and previous month boundaries, trailing-three-month start, current-quarter start, and current-year start. Clients do not supply these values.

Tool failure/timeout is semantically distinct from an empty result. The agent must report inability to retrieve data and must not infer zero. All returned user-authored text is untrusted data.

All public endpoints require `Authorization: Bearer <access_token>` and JSON unless noted. The backend always derives the user from JWT; clients must not send `userId`. Date values use ISO `YYYY-MM-DD`; timestamps use ISO-8601 UTC. Amounts are JSON numbers and the current supported currency is `VND`.

## Message and action states

Response `type` values:

- `MESSAGE`: answer contains no proposed write.
- `ACTION_REQUIRED`: exactly one write proposal is waiting for confirmation.
- `MULTI_ACTION_REQUIRED`: two or more independently confirmable actions; actions sharing a `planId` belong to the same plan.

Action status lifecycle:

- `PENDING`: preview can be confirmed or cancelled before `expiresAt`.
- `CONFIRMED`: confirmation was accepted; normally transient.
- `EXECUTING`: backend owns the execution claim; poll status and do not confirm again.
- `COMPLETED`: business service committed; `result` is authoritative.
- `CANCELLED`: user cancelled; terminal.
- `EXPIRED`: confirmation window elapsed; terminal. Send a new chat request for a fresh preview.
- `FAILED`: backend execution/revalidation failed; terminal. Show `error`; do not assume rollback beyond what the underlying business transaction guarantees.

The AI message is never proof of execution. Only `status: COMPLETED` and its backend `result` prove success.

## POST `/chat`

Send a message. A missing `conversationId` creates a durable conversation; otherwise it must be owned by the authenticated user.

Request:

```json
{
  "conversationId": "b7c79b86-4136-44ea-bb01-614ebf637fe2",
  "message": "Tạo ngân sách ăn uống 2 triệu cho tháng 12"
}
```

`conversationId` may be omitted for the first message. `message` is required, non-blank, maximum 4,000 characters.

Response without a write:

```json
{
  "type": "MESSAGE",
  "conversationId": "b7c79b86-4136-44ea-bb01-614ebf637fe2",
  "message": "Các giao dịch gần đây của bạn...",
  "actions": []
}
```

Response requiring confirmation:

```json
{
  "type": "ACTION_REQUIRED",
  "conversationId": "b7c79b86-4136-44ea-bb01-614ebf637fe2",
  "message": "Mình đã chuẩn bị ngân sách. Vui lòng kiểm tra trước khi xác nhận.",
  "actions": [
    {
      "actionId": "10ac8608-a27b-4b78-b4c6-73f9a682d9dd",
      "planId": null,
      "toolName": "create_budget",
      "title": "Tạo ngân sách Ăn uống tháng 12",
      "description": "2026-12-01 – 2026-12-31",
      "preview": {
        "name": "Ăn uống tháng 12",
        "periodType": "MONTHLY",
        "startDate": "2026-12-01",
        "endDate": "2026-12-31",
        "totalAmount": 2000000,
        "currency": "VND",
        "items": [
          {"categoryId": "ae224d8b-6f1c-4ef7-a824-aa194bcf1231", "category": "Ăn uống", "amount": 2000000}
        ]
      },
      "status": "PENDING",
      "expiresAt": "2026-11-19T02:15:00Z",
      "confirmedAt": null,
      "executedAt": null,
      "result": null,
      "error": null
    }
  ]
}
```

Frontend behavior: render backend preview fields, never reconstruct financial parameters from the prose message. Disable confirm after the first click and use the returned status.

## POST `/actions/{actionId}/confirm`

Atomically claims and executes an owned, unexpired `PENDING` action. Empty request body.

Successful response:

```json
{
  "actionId": "10ac8608-a27b-4b78-b4c6-73f9a682d9dd",
  "toolName": "create_budget",
  "status": "COMPLETED",
  "executedAt": "2026-11-19T02:02:41Z",
  "result": {"id": "fc8f76a5-10af-48ec-a911-559e4f149ad7", "name": "Ăn uống tháng 12"},
  "error": null
}
```

Confirmation is idempotent by action state: repeated requests return the existing terminal/executing state and never repeat the business write. If revalidation fails, HTTP can still be `200` with `status: FAILED` and a safe `error`; the action status is authoritative.

## POST `/actions/{actionId}/cancel`

Cancels an owned `PENDING` action. Empty request body. Repeating cancellation returns `CANCELLED`. Confirmed, executing or terminal actions cannot be cancelled and return `409`.

## GET `/actions/{actionId}`

Returns the current owned action. A pending action whose deadline has elapsed is durably changed to `EXPIRED`. Use this endpoint after network loss or an ambiguous confirmation response.

## GET `/conversations/{conversationId}`

Restores conversation messages and all associated action states after app restart/re-login.

```json
{
  "conversationId": "b7c79b86-4136-44ea-bb01-614ebf637fe2",
  "title": "Tạo ngân sách ăn uống...",
  "createdAt": "2026-11-19T01:59:00Z",
  "updatedAt": "2026-11-19T02:02:41Z",
  "messages": [
    {"id": "...", "author": "user", "text": "...", "kind": "normal", "createdAt": "..."},
    {"id": "...", "author": "assistant", "text": "...", "kind": "action_required", "createdAt": "..."}
  ],
  "actions": []
}
```

On reopen, fetch this endpoint, display messages, then render each action from its current status. Poll actions in `EXECUTING` every 1–2 seconds with a reasonable UI cap (for example 30 seconds); stopping UI polling does not cancel backend execution.

## GET `/conversations`

Lists the authenticated user's durable conversations in most-recently-updated order so the frontend can recover after logout, reinstall, or loss of local state. Each item contains `conversationId`, `title`, `createdAt`, and `updatedAt`. Select an item and call `GET /conversations/{conversationId}` to restore its messages and actions.

## Multi-action plans

`MULTI_ACTION_REQUIRED` returns up to five actions. Actions in one model plan share `planId`, but version 1 confirmation is deliberately per-action. Preserve listed order when presenting/executing sequentially. After each response, continue only according to the user's explicit choices. A failure does not imply that earlier completed actions were rolled back; show each action status and a partial-success summary.

Changing any preview parameter requires a new chat/proposal and new confirmation. The client cannot edit action arguments.

## Initial tools

### `get_transactions` (READ)

Optional arguments: `fromDate`, `toDate`, `accountId`, `categoryId`, `transactionType`, `minAmount`, `maxAmount`, `search`, `page` (default 1), `pageSize` (default 20, max 50). It executes immediately through the authenticated internal backend tool endpoint.

### `create_transaction` (WRITE)

Required: `transactionType`, `accountId`, `amount`, `currencyCode`, `transactionDate`. `categoryId` is required for `INCOME`/`EXPENSE`; a distinct `toAccountId` is required for `TRANSFER`. It always produces a pending action.

### `create_budget` (WRITE)

Required: `name`, `periodType`, `startDate`, `endDate`, `totalAmount`, `currencyCode`, and non-empty `items`. Item amounts must sum to `totalAmount`; categories must be accessible to the user; overlapping budgets fail validation. It always produces a pending action.

### Phase 3 WRITE catalog

Every tool below always produces a `PENDING` action and is executed only by Spring after explicit confirmation:

- Wave 1: `create_goal`, `contribute_to_goal`, `create_debt`, `record_debt_payment`, `update_budget`.
- Wave 2: `create_schedule`, `update_schedule`, `create_account`.
- Wave 3: `create_group_transaction`, `contribute_group_fund`.

Goal/debt creation does not alter wallet balances. Goal contributions and debt payments alter a wallet only when an owned account ID is present. Account creation adds its initial balance to total assets without creating a transaction. Auto-executing transaction schedules may create future transactions. Group writes require accessible group/member IDs; personal/group-fund sources and split totals are revalidated at confirmation.

## Errors

Errors use the existing backend shape:

```json
{
  "timestamp": "2026-11-19T02:00:00Z",
  "status": 409,
  "error": "Conflict",
  "message": "Only a pending action can be cancelled",
  "errorCode": "FINAI_ACTION_STATE_INVALID"
}
```

| HTTP | `errorCode` | Client handling |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `FINAI_SCHEMA_INVALID`, `FINAI_TOOL_NOT_ALLOWED`, `FINAI_TOOL_LIMIT` | Correct input or start a new proposal. |
| 401 | `AUTHENTICATION_FAILED` | Refresh/login and retry only the safe read/chat request. |
| 403 | `FINAI_RESOURCE_FORBIDDEN`, `ACCESS_DENIED` | Do not reveal whether another user's resource exists. |
| 404 | `FINAI_ACTION_NOT_FOUND`, `FINAI_CONVERSATION_NOT_FOUND` | Remove stale local reference. |
| 409 | `FINAI_ACTION_STATE_INVALID`, `FINAI_STALE_PROPOSAL` | Fetch current status or request a fresh proposal. |
| 429 | `FINAI_SERVICE_ERROR` | Show quota/rate-limit state; retry chat later. Never auto-confirm. |
| 502 | `FINAI_SERVICE_ERROR`, `FINAI_SERVICE_UNAVAILABLE` | Preserve draft and offer manual retry. |
| 500 | `INTERNAL_ERROR` | Show generic failure and allow status refresh. |

For a client timeout on chat, retrying can create another proposal; first restore the conversation if its id is known. For a timeout on confirm, never create a replacement transaction/budget: call `GET /actions/{actionId}` until a terminal state is known.

## Streaming

Action Agent v1 does not expose SSE. The authenticated Spring `/api/chat` adapter remains temporarily available for older chat clients. Direct Python chat/forecast/anomaly/behavior/recommendation APIs are internal-only and require service credentials; browsers must not call them. Streaming can be added later without changing action confirmation semantics.

## Internal API (not for frontend)

Spring calls Python with `X-FinAI-Service-Secret`; Python calls `POST /api/internal/v1/finai/tools/{toolName}` with a two-minute HMAC-signed opaque `contextToken`. Only READ tools are executable. Neither internal endpoint is exposed by the public reverse proxy, and no token or secret may be logged or sent to Gemini.

