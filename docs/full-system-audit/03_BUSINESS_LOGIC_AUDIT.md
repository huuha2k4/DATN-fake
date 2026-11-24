# 03 — Audit nghiệp vụ và invariant tài chính

## Kết luận theo module

| Nghiệp vụ | Kết quả |
|---|---|
| Create transaction | Có `@Transactional`, ownership account/category ở create; balance và ledger cùng transaction |
| Update transaction | FAIL về ownership và invariant số dư (BUS-001) |
| Delete transaction | Có soft delete + revert balance; các sync phụ bắt exception và có thể lệch aggregate liên kết |
| Transfer | Trừ source `amount + fee`, cộng target `toAmount/amount`; chưa có integration/concurrency test core |
| Budget | Spent tính từ transaction query; alert side-effect bị catch để không rollback transaction |
| Goal | contribute/withdraw tạo transaction; delete hoàn tiền; E2E full flow BLOCKED |
| Debt | payment đồng bộ transaction; update/delete sync phụ catch lỗi nên có rủi ro silent inconsistency |
| Schedule | occurrence liên kết transaction; chưa có duplicate/concurrency test |
| Group/child | Các method transactional; có cross-group authorization bug |
| Reports | aggregate có transfer/soft-delete filters ở nhiều query; chưa đối soát mọi UI |
| AI forecast | 3 dataset 8/240/5.000 đã khớp tổng số dư ví trong E2E AI 2–5 |

## Finding BUS-001 — Sửa giao dịch có thể làm ledger và số dư lệch

- **Severity:** CRITICAL
- **Module:** Transaction / Account
- **File và line:** [TransactionService.java:286](../../backend/src/main/java/com/finance/finance/modules/transaction/service/TransactionService.java), [TransactionService.java:420](../../backend/src/main/java/com/finance/finance/modules/transaction/service/TransactionService.java), [TransactionService.java:1143](../../backend/src/main/java/com/finance/finance/modules/transaction/service/TransactionService.java)
- **Bằng chứng:** update cho phép ghi `accountId`/`toAccountId` mới trực tiếp; không gọi `findByIdAndUserId` để validate. `applyAccountBalancesForTransaction` dùng `Optional.ifPresent`, nên nếu account mới không thuộc user thì không cộng/trừ số dư nhưng transaction vẫn save.
- **Tái hiện:** user A sửa transaction của A, gửi `accountId` UUID account của B hoặc UUID không tồn tại.
- **Expected:** 404/403, transaction và mọi balance không đổi.
- **Actual:** balance cũ đã revert; balance mới không apply; transaction trỏ ID ngoài ownership/không tồn tại nếu FK cho phép, gây lệch ledger.
- **Root cause:** update DTO hỗ trợ đổi relation nhưng thiếu validation đối xứng với create; helper nuốt missing account.
- **Recommended fix:** validate account/toAccount/category/merchant trước khi revert; fail-fast; khóa/optimistic retry phù hợp; giữ toàn bộ trong một transaction.
- **Regression test:** foreign user account, missing account, category khác user, transfer source/target, rollback assertion trước/sau, concurrent version conflict.

## Finding BUS-002 — Thành viên nhóm A có thể xử lý yêu cầu ví trẻ em của nhóm B

- **Severity:** CRITICAL
- **Module:** Group / Child wallet
- **File và line:** [ChildManagementService.java:223](../../backend/src/main/java/com/finance/finance/modules/group/service/ChildManagementService.java), [ChildManagementService.java:336](../../backend/src/main/java/com/finance/finance/modules/group/service/ChildManagementService.java), [GroupController.java:692](../../backend/src/main/java/com/finance/finance/modules/group/controller/GroupController.java)
- **Bằng chứng:** service chỉ kiểm user là member của `groupId` URL và request thuộc `walletId`; không kiểm `wallet.groupId == groupId`. Approve có thể trừ quỹ/account rồi cộng ví đích.
- **Tái hiện:** user là member nhóm A; dùng walletId/requestId đang pending của nhóm B trong URL nhóm A.
- **Expected:** 404/403 trước mọi thay đổi tiền.
- **Actual:** request của nhóm B có thể approve/reject; nguồn tiền/quỹ của A và ví B có thể bị thay đổi trong cùng transaction.
- **Root cause:** thiếu ownership chain `group → wallet → request`.
- **Recommended fix:** repository query theo cả groupId/walletId/requestId; authorization centralized; không dựa vào UUID đơn.
- **Regression test:** hai group, hai user, cross-combination cho approve/reject/list/chore; assert balances và status không đổi.

## Finding BUS-003 — Sync entity liên kết có thể thất bại im lặng

- **Severity:** HIGH
- **Module:** Transaction ↔ Goal/Debt/Group/Schedule/OCR
- **File và line:** [TransactionService.java:475](../../backend/src/main/java/com/finance/finance/modules/transaction/service/TransactionService.java), [TransactionService.java:561](../../backend/src/main/java/com/finance/finance/modules/transaction/service/TransactionService.java), [TransactionService.java:605](../../backend/src/main/java/com/finance/finance/modules/transaction/service/TransactionService.java), [TransactionService.java:741](../../backend/src/main/java/com/finance/finance/modules/transaction/service/TransactionService.java)
- **Bằng chứng:** nhiều `catch (Exception)` chỉ log hoặc bỏ qua nằm trong transaction update/delete.
- **Tái hiện:** gây lỗi constraint khi sync contribution/payment/fund sau khi transaction đã save.
- **Expected:** invariant liên module hoặc rollback toàn bộ, hoặc outbox/reconciliation rõ ràng.
- **Actual:** transaction chính có thể commit trong khi aggregate phụ chưa cập nhật.
- **Root cause:** side-effect consistency bị coi như best-effort nhưng các trường như goal currentAmount/debt paidAmount/fund balance là dữ liệu tài chính.
- **Recommended fix:** phân loại notification là best-effort, còn financial sync phải fail transaction hoặc dùng ledger-derived/reconciliation.
- **Regression test:** fault injection ở từng repository và assert rollback/invariant.

## Finding BUS-004 — Money mapping Python dùng Float

- **Severity:** MEDIUM
- **Module:** AI / Database mapping
- **File và line:** [database.py:83](../../pfm-ai-service/database.py), [database.py:104](../../pfm-ai-service/database.py), [V1__init_schema.sql:19](../../backend/src/main/resources/db/migration/V1__init_schema.sql)
- **Bằng chứng:** PostgreSQL dùng NUMERIC domain nhưng SQLAlchemy map balance/amount sang Float.
- **Tái hiện:** amount có 4 decimal hoặc tổng nhiều dòng lớn, so Python round-trip với PostgreSQL exact sum.
- **Expected:** Decimal ở data/aggregation boundary, float chỉ ở model cần số thực.
- **Actual:** có thể mất precision; AI hiện đã dùng Decimal ở nhiều aggregate nhưng entity contract vẫn không chính xác.
- **Root cause:** ORM type lệch schema.
- **Recommended fix:** đổi mapping sang Numeric/Decimal trong pha riêng, kiểm tương thích FinAI Agent trước.
- **Regression test:** exact decimal round-trip và aggregate lớn; snapshot API serialization.

## Financial E2E bắt buộc trước release

Các flow account transfer, budget, goal, debt, group fund, child reward, schedule và FinAI write hiện **BLOCKED** vì không có staging/test credentials và không được phép dùng dữ liệu thật. Không có flow nào trong nhóm này được đánh PASS chỉ từ code review.
