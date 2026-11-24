# 04 — Chất lượng source và technical debt

## Số liệu thực tế

- Web: 270 ESLint errors, 38 warnings; 50 TypeScript errors.
- Mobile: 195 TypeScript errors; Expo Doctor 20/21, Expo patch `57.0.25` thay vì `~57.0.33`.
- File lớn nhất: Web Group 7.126 dòng; Mobile Group 6.313; Mobile Debt 6.105; Mobile Reminder 3.903; TransactionService 1.386; Python `action_agent.py` 1.443.
- Backend chỉ có 6 test class; phần lớn tập trung FinAI Agent, không có service integration test cho ledger core.

## Finding CODE-001 — Cả hai frontend không qua quality gate

- **Severity:** HIGH
- **Module:** Web/Mobile build
- **File và line:** ví dụ [AddTransactionScreen.tsx:32](../../frontend-web/src/modules/add-transaction/screen/AddTransactionScreen.tsx), [App.tsx:191](../../frontend-app/App.tsx), [groupApi.ts:753](../../frontend-app/src/modules/group/api/groupApi.ts)
- **Bằng chứng:** `npm run build` FAIL 50 TS errors; Mobile `npx tsc --noEmit` FAIL 195 errors; Web lint FAIL 270 errors.
- **Tái hiện:** chạy các lệnh trên từ từng frontend.
- **Expected:** typecheck/lint/build xanh trước release.
- **Actual:** missing fields, duplicate identifiers/keys, wrong API methods/types, unused variables và hook issues.
- **Root cause:** contract/type drift và không có CI gate bắt buộc.
- **Recommended fix:** sửa theo cụm contract trước, sau đó runtime/UI; không dùng `any` để che lỗi.
- **Regression test:** CI chạy Web build/lint, Mobile tsc/Expo Doctor trên mọi PR.

## Finding CODE-002 — God components/services làm tăng lỗi trùng và drift

- **Severity:** MEDIUM
- **Module:** Web/Mobile/Backend/Python
- **File và line:** [GroupManagementScreen.tsx](../../frontend-web/src/modules/group/screen/GroupManagementScreen.tsx), [GroupScreen.tsx](../../frontend-app/src/modules/group/screen/GroupScreen.tsx), [DebtScreen.tsx](../../frontend-app/src/modules/debts/screen/DebtScreen.tsx), [TransactionService.java](../../backend/src/main/java/com/finance/finance/modules/transaction/service/TransactionService.java), [action_agent.py](../../pfm-ai-service/action_agent.py)
- **Bằng chứng:** lần lượt 7.126/6.313/6.105/1.386/1.443 dòng; compiler đã phát hiện duplicate key/identifier và biến dùng trước khai báo.
- **Tái hiện:** line-count scan và TypeScript output.
- **Expected:** module có ranh giới rõ, logic test độc lập.
- **Actual:** view, orchestration, API mapping và state nằm chung file.
- **Root cause:** phát triển theo màn hình lớn không có refactor budget/gate.
- **Recommended fix:** sau khi sửa correctness, tách hooks, API adapters, feature components; giữ behavior bằng characterization test.
- **Regression test:** component/API contract tests trước từng extraction.

## Finding CODE-003 — Exception handling che lỗi dữ liệu

- **Severity:** HIGH
- **Module:** Backend financial services
- **File và line:** [TransactionService.java:475](../../backend/src/main/java/com/finance/finance/modules/transaction/service/TransactionService.java), [GroupExpenseService.java:233](../../backend/src/main/java/com/finance/finance/modules/group/service/GroupExpenseService.java), [DebtService.java:346](../../backend/src/main/java/com/finance/finance/modules/debt/service/DebtService.java)
- **Bằng chứng:** hàng chục broad `catch (Exception)`; một số bỏ qua hoàn toàn.
- **Tái hiện:** fault injection repository/notification.
- **Expected:** lỗi tài chính rollback; lỗi phụ có metric/retry.
- **Actual:** cùng pattern dùng cho cả sync tài chính và notification.
- **Root cause:** không phân loại consistency-critical side effect.
- **Recommended fix:** policy exception theo lớp, typed exception và outbox/retry nếu phù hợp.
- **Regression test:** rollback test và log/metric assertion.

## Finding CODE-004 — N+1 ở transaction summary

- **Severity:** MEDIUM
- **Module:** Reports
- **File và line:** [TransactionService.java:973](../../backend/src/main/java/com/finance/finance/modules/transaction/service/TransactionService.java), [TransactionService.java:1008](../../backend/src/main/java/com/finance/finance/modules/transaction/service/TransactionService.java)
- **Bằng chứng:** mỗi category aggregate gọi `categoryRepository.findById` trong vòng lặp.
- **Tái hiện:** summary có nhiều category và bật Hibernate statistics.
- **Expected:** một batch query/join.
- **Actual:** 1 + N query.
- **Root cause:** enrich DTO theo từng row.
- **Recommended fix:** batch `findAllById` hoặc projection join.
- **Regression test:** assert query count không tăng theo số category.
