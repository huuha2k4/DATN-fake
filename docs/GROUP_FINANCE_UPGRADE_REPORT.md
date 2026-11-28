# FINORA — Group Finance Upgrade Report

Ngày nghiệm thu cục bộ 28/11/2026 (Asia/Bangkok).

## 1. Kết luận nghiệm thu

**PARTIALLY READY.** Đã tích hợp bốn mục đích tài chính, quản trị kỳ, duyệt khoản nộp bên ngoài, hoàn trả tiền ứng, cấu hình nhóm và quyết toán trên Web và Mobile. Luồng Web có đăng nhập đã chạy với hai vai trò. Bộ kiểm thử PostgreSQL trên mã Backend cuối đạt các dataset A–F, kiểm thử tranh chấp và nâng cấp fixture V71. Android export và typecheck là bằng chứng biên dịch. Native runtime, Gemini thực tế, và một số đối chiếu giao diện báo cáo vẫn cần xác minh. Một ca kiểm thử admin/OCR chạy riêng thất bại.

## 2. Nguyên nhân gốc và các thay đổi

- Trước V72, dữ liệu nộp quỹ và split của khoản chi quỹ có thể đi vào công nợ. Báo cáo công nợ hiện chỉ tính split hợp lệ của `MEMBER_SPLIT` và settlement hoàn tất. Chi quỹ và hoàn quỹ dùng cùng khóa số dư, kể cả đường đi quỹ cấp tiền cho trẻ.
- Nộp bên ngoài có trạng thái riêng. Chỉ `CONFIRMED` làm tăng số dư quỹ và tiến độ. Kỳ khóa trước quỹ khi cần cả hai. Xác nhận lại cùng yêu cầu trả kết quả đã lưu. Từ chối yêu cầu lý do. Client giữ idempotency key theo nội dung gửi trong một lượt nhập.
- Settlement mới chỉ chuyển tiền khi người nhận xác nhận. Các yêu cầu xác nhận cùng nhóm được tuần tự hóa và kiểm tra lại công nợ. Người gửi có thể hủy yêu cầu chờ nếu giao dịch OUT chưa được ghi. Với bản ghi legacy đã ghi OUT, xác nhận tái sử dụng OUT đó.
- Khoản ứng chỉ tạo một chi phí nhóm. Lịch sử payment lưu từng khoản hoàn một phần hoặc toàn bộ. V73 lưu lựa chọn ví nhận do người ứng tự cấp hoặc thu hồi. Backend kiểm tra ownership, tiền tệ, số còn phải hoàn và số dư quỹ.
- Web và Mobile tạo được `FUND_EXPENSE`, `MEMBER_SPLIT`, `FUND_REIMBURSEMENT` và `VOLUNTARY_SPEND`. Form chia tiền hỗ trợ chia đều cho tất cả hoặc thành viên được chọn, số tiền chính xác, phần trăm và số phần. Backend tính lại và bảo toàn tổng VND. Sửa khoản chi từ chi tiết Web/Mobile hiện hỗ trợ mô tả và ghi chú. Việc chuyển mục đích tài chính của khoản đã ghi sổ nằm ngoài hành vi form sửa hiện tại.
- ROOMMATE và TRAVEL mặc định bật chia tiền và bù trừ. FAMILY, COUPLE, PROJECT ưu tiên quỹ và mặc định tắt chia tiền. Tắt chia tiền vẫn cho xem và quyết toán số nợ đã có. Khi tắt tối ưu bù trừ, hệ thống dùng nghĩa vụ trực tiếp nếu các quyết toán trước đó còn đối chiếu được với từng cặp. Công nợ lịch sử đã bù trừ qua đối tác khác tiếp tục dùng số dư ròng để giữ hiệu lực các quyết toán trước.
- Web và Mobile có tạo/xem/preview/kết thúc kỳ, lịch sử, nhắc thủ công và điều chỉnh có lý do. Backend theo dõi confirmed, pending, thiếu và vượt theo từng thành viên. Child được miễn. Đóng ngoài kỳ được chọn riêng và không làm thay nghĩa vụ kỳ hoạt động. Quản trị có thể miễn đóng, thay mức, thêm thành viên và xem lịch sử điều chỉnh. Đóng kỳ lưu khoản thiếu còn lại. Rời nhóm có kiểm tra công nợ, nghĩa vụ hoạt động và khoản ứng còn phải hoàn.
- Giữ một kỳ ACTIVE mỗi nhóm để khoản nộp có một đích rõ ràng khi kỳ mở và lịch lặp có một chuỗi xác định. UI giải thích rằng tiền nhà và sửa đồ, quỹ sinh hoạt và du lịch, hoặc các đợt dự án phải thu tuần tự nếu cần nghĩa vụ riêng. Trong thời gian đó vẫn có thể nhận đóng góp ngoài kỳ.
- Scheduler dùng Asia/Ho_Chi_Minh, giữ ngày gốc của chuỗi WEEKLY/MONTHLY/QUARTERLY và snapshot thành viên cho kỳ tiếp theo. ONCE kết thúc sau kỳ duy nhất. Kỳ có yêu cầu chờ duyệt được giữ mở. Thiếu và dư được giữ trong kỳ cũ. Kết thúc thủ công dừng chuỗi hiện tại. Khóa nhóm và khóa duy nhất của kỳ hoạt động nối tiếp bảo vệ nhiều instance.
- Notification dùng service và bảng hiện có, ghi cùng transaction với nghiệp vụ. Bao phủ kỳ mở, nhắc gần/đúng/quá hạn và thủ công, nộp chờ duyệt và kết quả, settlement chờ/xác nhận/từ chối, hoàn quỹ, thay đổi nghĩa vụ và kết thúc kỳ. Nhắc bỏ qua thành viên đóng đủ, miễn đóng, trẻ em và khoản tự nguyện. Link mang group ID và resource ID. Đã kiểm thử dedup và đối tượng nhận ở Backend. Điều hướng native qua notification còn chờ kiểm chứng trên thiết bị.
- Các màn hình dùng định dạng tiền, màu và component Finora hiện có. Hai client chỉ tải bình luận khi người dùng mở giao dịch. Công nợ và tiến độ lấy dữ liệu theo lô. Các thao tác ghi tiền làm mất hiệu lực cache giao dịch, ví và báo cáo của phiên hiện tại, cùng cache ngân sách khi chi phí thay đổi. Chi tiết nhóm vẫn tải nhiều tài nguyên song song khi mở nhóm và refetch sau một số mutation. Lịch sử kỳ, đóng góp và hoàn trả chưa được nghiệm thu hiệu năng hoặc phân trang trên tập dữ liệu lớn.

## 3. API tích hợp

Các đường dẫn có tiền tố `/groups/{groupId}`.

| Tài nguyên | Web và Mobile |
|---|---|
| `GET/PUT /finance-config` | Đọc và cập nhật capability theo quyền quản trị. |
| `GET/POST /contribution-periods`, `GET /contribution-periods/active`, `GET /contribution-periods/{periodId}` | Kỳ hoạt động, tạo kỳ, lịch sử và chi tiết. |
| `POST /contribution-periods/preview`, `POST /contribution-periods/{periodId}/close`, `POST /contribution-periods/{periodId}/remind`, `PUT /contribution-periods/{periodId}/obligations/{memberId}` | Preview do Backend tính, đóng kỳ, nhắc và điều chỉnh. |
| `GET/POST /fund/contributions`, `POST /fund/contribution-requests`, `POST /fund/contributions/{id}/confirm`, `POST /fund/contributions/{id}/reject` | Nộp từ ví, ngoài hệ thống, lịch sử và duyệt. |
| `GET /fund/reimbursements`, `GET/POST /fund/reimbursements/{id}/payments`, `PUT /fund/reimbursements/{id}/wallet-consent` | Khoản ứng, số dư chưa hoàn, lịch sử, trả bên ngoài hoặc trả vào ví đã được người nhận cho phép. |
| `POST/GET /expenses`, `GET/PUT/DELETE /expenses/{id}`, `GET /balances` | Tạo chi phí, chi tiết, sửa nội dung và cân đối. Server kiểm tra mục đích và quyền. |
| `GET/POST /settlements`, `POST /settlements/{id}/confirm`, `/reject`, `/cancel` | Yêu cầu, xác nhận bằng ví nhận, từ chối, hủy và xem lịch sử. |

## 4. Migration và đối chiếu lịch sử

- **PASS**. PostgreSQL 15 chạy V1 → V74 từ database trống và Spring khởi động với schema mới. Giữ nguyên nội dung V72. V73 thêm khóa ngoại ví nhận. V74 tạo view `core.personal_report_entries` từ giao dịch nguồn và phần chia. Hai migration sau V72 không thêm bảng nghiệp vụ.
- **PASS**. `GroupFinanceLegacyMigrationTest` tạo fixture ở V71 gồm 1 nhóm, 2 thành viên, quỹ 150.000 đ, ví 700.000 đ, hai khoản chi 50.000 đ, khoản nộp 200.000 đ có giao dịch ví, ba trạng thái settlement có OUT 25.000 đ mỗi khoản, và ví trẻ em còn 45.000 đ. Đối chiếu tổng trước/sau V72–V74 giữ nguyên. Backfill gán chi từ quỹ thành `FUND_EXPENSE` và chi ví cá nhân thành `MEMBER_SPLIT`. Split lịch sử của chi quỹ vẫn lưu nhưng bị loại khỏi công nợ và báo cáo chi phí. View nhận đúng phần chia 50.000 đ của thành viên còn lại và loại các giao dịch nộp quỹ/settlement kỹ thuật có liên kết nguồn.
- **PASS**. Split trùng chủ động tạo trong fixture làm V72 dừng tại `uq_group_expense_split_member`, transaction migration rollback. Test bỏ đúng hàng tạo trùng có ID đã biết trong fixture rồi chạy lại.
- **Legacy reconciliation**. Ví fixture giảm từ 1.000.000 đ còn 700.000 đ, trong khi các giao dịch nguồn mô phỏng giải thích 275.000 đ. Chênh lệch 25.000 đ được giữ nguyên. Truy vết OUT bằng `outgoing_transaction_id` ở các settlement PENDING/REJECTED, `personal_transaction_id` ở các khoản nộp và khóa `(expense_id, user_id)` ở split. Với dữ liệu thật, đối chiếu chứng từ và ví đối ứng theo ID trước khi chọn giữ nguyên, xác nhận hoặc lập bút toán điều chỉnh có audit. Không xóa split hoặc thay số dư lịch sử bằng script migration. **NOT VERIFIED** trên snapshot staging/production vì nghiệm thu chỉ dùng fixture cô lập.

## 5. Đối chiếu tài chính và các dataset PostgreSQL

Các test gọi service trong database thật và kiểm tra lại số dư, trạng thái và số bản ghi tại PostgreSQL. Giá trị dưới đây là VND.

| Dataset | Kết quả | Đối chiếu |
|---|---|---|
| A · ROOMMATE | PASS | Đã nhận 1.400.000/3.000.000, thiếu 1.600.000, tiến độ 46,67%. Sau chi 600.000, quỹ 800.000 và tiến độ giữ nguyên. |
| B · FAMILY | PASS | Hai trẻ được miễn. Đã nhận 10.000.000/13.000.000. Ứng 500.000, hoàn vào ví có đồng ý 300.000, còn 200.000, quỹ còn 9.700.000. Ví người ứng còn 800.000, chi phí nhóm 500.000, chi/thu cá nhân ghi nhận đều bằng 0. |
| C · TRAVEL | PASS | Chi 800.000 chia bốn, người ứng giảm ví 800.000, ghi nhận chi phí 200.000, cần nhận 600.000. Sau thêm hai khoản và hoàn tất settlement 150.000, số dư ròng là +350.000, 0, −50.000, −300.000. Người nhận tăng ví 150.000 và thu nhập ghi nhận vẫn bằng 0. |
| D · PROJECT | PASS | Quỹ 6.000.000 trên mục tiêu 20.000.000, tiến độ huy động 30%, tiến độ nghĩa vụ 50%. Khoản PENDING 2.000.000 chặn đóng kỳ, bị từ chối mà quỹ giữ nguyên. |
| E · COUPLE | PASS | Chia tiền tắt. Chi quỹ 500.000, chi tự nguyện từ ví 300.000. Quỹ 4.500.000, ví 700.000, kỳ 100%, công nợ bằng 0. |
| F · Đóng vượt | PASS | Một người nộp 1.500.000 cho nghĩa vụ 1.000.000. Kỳ hoàn thành 50%, vẫn thiếu 1.000.000 của người khác, dư 500.000. Sau nộp ngoài kỳ 100.000, quỹ 1.600.000 và tiến độ kỳ giữ nguyên. |

Chi phí cá nhân theo phần chịu của `MEMBER_SPLIT` tại ngày phát sinh và theo số tiền thực trả của `VOLUNTARY_SPEND`. Tiền nộp, ứng cho quỹ, hoàn quỹ và quyết toán được giữ trong lịch sử ví. Báo cáo chi phí không ghi lại các dòng chuyển tiền này thành thu hoặc chi mới. Endpoint summary trả riêng `walletCashIn`, `walletCashOut`, `walletNetCashFlow`. Test bổ sung của TRAVEL kiểm tra ba thành viên từ chối lần đầu rồi thanh toán toàn bộ 600.000 sau khi tính năng chia tiền bị tắt. Mỗi người ghi nhận đúng 200.000 chi phí, chủ khoản ứng ghi nhận 200.000 chi phí, 800.000 tiền ra, 600.000 tiền vào, 0 thu nhập và công nợ về 0. Dashboard Web và Mobile đọc summary cho số thu chi ghi nhận. Lịch sử và các phép tính dòng tiền ví tiếp tục dùng giao dịch thực. Ngân sách và FinAI đọc số liệu từ projection chi phí. Phân tích, dự báo, báo cáo định kỳ và các trạng thái legacy vẫn còn nhánh giao diện chưa chạy toàn vòng đời.

### Tranh chấp đồng thời

| Tình huống | Kết quả PostgreSQL |
|---|---|
| Hai lần nộp trực tiếp và hai lần duyệt cùng yêu cầu | PASS. Số dư quỹ 100.000, ví 925.000, ba bản ghi góp quỹ hợp lệ. |
| Hai lần chi quỹ, hai retry cùng khoản hoàn, chi đồng thời với hoàn | PASS. Hai khoản chi 60.000 trên quỹ 100.000 chỉ ghi một. Retry hoàn chỉ có một payment. Tranh chấp chi/hoàn bảo toàn quỹ và giới hạn hoàn. |
| Hai yêu cầu settle cùng công nợ được xác nhận đồng thời | PASS. Một settlement hoàn tất. Ví gửi còn 400.000, ví nhận 1.600.000, không trả vượt. |
| Đóng kỳ đồng thời với nộp quỹ | PASS. Không ghi vào kỳ đã đóng. Tổng ví cộng quỹ vẫn 1.000.000. |
| Hai confirm FinAI và FinAI đồng thời với chi trực tiếp | PASS. Mỗi proposal chỉ debit một lần. Chi trực tiếp và FinAI tranh cùng 100.000 chỉ có một khoản chi 60.000 được ghi. |
| Hai worker sinh kỳ và gửi nhắc | PASS. Ngày 31 tháng 1 → 29 tháng 2 năm nhuận → 31 tháng 3. Có đúng ba kỳ. Test nhắc riêng xác nhận dedup, miễn đóng và trạng thái đã xác nhận. Giờ cron production chưa quan sát qua nhiều ngày. |

## 6. Web, Mobile, FinAI

- **Web PASS**. Playwright đăng nhập hai browser context OWNER và MEMBER. Luồng tạo kỳ, nộp ví 100.000, khai báo tiền mặt 50.000, duyệt, chi quỹ 40.000, ứng 90.000, hoàn 30.000, chia 120.000, yêu cầu và xác nhận settlement, xem lịch sử. Sau quyết toán công nợ về 0. PostgreSQL đối chiếu 150.000 đã nhận − 40.000 chi quỹ − 30.000 hoàn ứng = 80.000. Quỹ còn phải hoàn 60.000, settlement xác nhận 60.000. API cá nhân ghi nhận mỗi người 60.000 chi phí. Ví trưởng nhóm thực trả 120.000 và nhận 60.000, ví thành viên giảm 250.000 qua ba lần ghi tiền. Kiểm tra bố cục ngang và chụp ảnh sau khi dữ liệu tải xong. [Desktop 1440×900 light](../.impeccable/finance-acceptance/owner-desktop-light.png) · [Tablet 880×900 dark](../.impeccable/finance-acceptance/member-tablet-dark.png) · [Điện thoại 390×844 dark](../.impeccable/finance-acceptance/member-phone-dark.png).
- **Web PASS** cho kiểm tra bổ sung trên `/dashboard` và `/reports` cùng tài khoản đã đăng nhập. Hai trang hiển thị 300.000 chi phí tháng, khớp tổng từ API trên bộ dữ liệu chạy nhiều vòng, với dòng tiền ra cao hơn chi phí ghi nhận.
- **Mobile PASS** cho TypeScript và Expo export Android. **NOT VERIFIED** cho Android/iOS runtime, thao tác modal, navigation, cập nhật cache theo từng luồng, trạng thái loading/error/empty và mở notification trên thiết bị. Không có emulator hoặc thiết bị truy cập được trong phiên. Expo lint **FAIL** vì workspace thiếu dependency ESLint, giữ nguyên cấu hình lint có sẵn.
- **FinAI PASS** cho mock routing của chín câu tiếng Việt yêu cầu, gồm đọc nghĩa vụ gia đình, thành viên chưa đóng phòng trọ, nộp quỹ gia đình, chi quỹ cặp đôi, chi tự nguyện, ứng cần hoàn, chia đều nhóm du lịch, công nợ du lịch và khoản quỹ phải hoàn. Các WRITE tạo proposal, kiểm tra group/purpose/nguồn ví/kỳ và quyền, xác nhận qua service dùng chung thao tác trực tiếp. Hỏi bổ sung khi thiếu hoặc có nhiều lựa chọn. Gemini thật **NOT VERIFIED**, phiên không có API key cấu hình. Báo cáo này không suy ra độ chính xác Gemini production từ mock.

## 7. Kết quả bộ kiểm thử và các trường hợp SKIP

| Lệnh / kiểm tra | Kết quả |
|---|---|
| Maven test với PostgreSQL mới và fixture V71 riêng | PASS. 142 được phát hiện, 124 đạt, 18 skip, 0 failure và 0 error. |
| 18 ca admin chạy lại với điều kiện DB tương ứng | 17 PASS, 1 FAIL. OCR health assertion mong 8 service, kết quả môi trường là 7. Admin/OCR nằm ngoài nghiệp vụ tài chính nhóm. |
| Web production build và Playwright có đăng nhập | PASS. Vite vẫn báo một số chunk lớn hơn 500 kB. |
| Mobile TypeScript và Expo Android export | PASS. |
| Python toàn bộ pytest discovery | PASS. 83 passed, 14 skipped, 59 subtests đạt, 2 cảnh báo FastAPI deprecation. |

Mười tám ca mặc định SKIP trong backend được mở bằng database có tên `finora_phase1`. Riêng ca migration admin dùng `FINORA_PHASE3_MIGRATION_DB=finora_phase3_migration`. Toàn bộ là test admin/audit/telemetry, không phải test nghiệp vụ quỹ.

| Nhóm | Tên test và kết quả chạy lại |
|---|---|
| AdminPhaseOne | PASS `suspensionRevokesEverySessionAndUnlockRequiresAuthentication`, `refreshWaitsForConcurrentSuspension`, `protectsSoleAdminAndAuditsRejectedMutations`, `categoryOwnershipAndMetricContracts`, `auditSuccessRollsBackWithMutationAndDoesNotStoreUserInput`, `inactiveDisabledAndDeletedAccountsCannotResumeSessions`. |
| AdminPhaseTwo | PASS `paginatesAndFiltersAtThreeDatasetSizes`, `appliesMaintenanceToPasswordGoogleRefreshAndJwtButLetsAdminTurnItOff`, `legacyJwtWorksUntilSuspensionAndUserUpdateRejectsUnknownFields`, `feedbackTransitionIsVisibleToUserAndRetryCreatesOneNotification`, `campaignIdentityAndBatchReplayAndReadOnlyTemplate`, `dashboardUsesVietnameseMidnightAndExcludesSoftDeletes`. |
| AdminMonitoring | PASS `aiStatisticsAndPermissionChecksUseRealPostgres`, `actionRollupCountsCommittedActionsAndDeduplicatesLifecycleEvents`, `invalidImageThroughAuthenticatedEndpointIsObservedAfterResponse`, `benchmarksPagedReadsAndRequestWrites`. FAIL `ocrClassifiesCandidatesAndKeepsHistoryAndPrivateFieldsOutOfRequestTelemetry`. |
| OperationMetricsMigration | PASS `upgradesV70WithHistoricalReceiptWithoutBackfill`. |

Python giữ hai script thành integration test có điều kiện. `test_all_ai.py::test_seeded_analytics` yêu cầu analytics database có dữ liệu và `FINORA_ANALYTICS_FIXTURE_USER`. `test_http_chat.py::test_live_legacy_chat` yêu cầu thêm `FINORA_LEGACY_CHAT_URL` trỏ đến service sống. Mười hai ca `test_finai_live_gemini.py` đều SKIP vì cần `FINAI_LIVE_TEST=1` và Gemini key/quota. Tên test đầy đủ nằm trong file. Không xóa ca kiểm thử.

## 8. File thay đổi

- Backend group gồm `GroupController`, `GroupService`, `GroupExpenseService`, `GroupFundService`, `GroupSettlementService`, `GroupFinanceConfigService`, `ContributionPeriodService`, `ContributionPeriodScheduler`, `FundReimbursementService`, `GroupFinanceNotifications`, `ChildManagementService`, `ChildWalletService`, `WeeklyAllowanceScheduler`, các DTO/entity/repository tương ứng, enum tài chính, audit và notification repository.
- Backend báo cáo và FinAI gồm `TransactionRepository`, `TransactionService`, `TransactionSummaryResponse`, `FinAiToolExecutor`, `FinAiToolRegistry`, V73 và V74.
- Web gồm `GroupManagementScreen.tsx`, `groupApi.ts`, các component quản trị quỹ trong `src/modules/group/components/`, `DashboardScreen.tsx`, `reportApi.ts`, `e2e/group-finance.cjs` và `e2e/group-finance-fixture.sql`.
- Mobile gồm `App.tsx`, `GroupScreen.tsx`, `groupApi.ts`, `DepositFundModal.tsx`, `ContributionPeriods.tsx`, `FundOperations.tsx`, `FinanceSettings.tsx`, `SettlementOperations.tsx`, `NotificationsScreen.tsx` và `dashboardApi.ts`.
- Kiểm thử gồm `FinAiWriteAcceptance`, `FinAiToolExecutorTest`, `GroupFinanceLegacyMigrationTest`, `ContributionPeriodServiceTest`, `GroupExpenseServiceSyncTest`, `TransactionServiceOwnershipTest`. Python gồm `action_agent.py`, `test_action_agent.py`, `test_all_ai.py`, `test_http_chat.py` và `pytest.ini`.

## 9. Build và triển khai sau nghiệm thu

1. Backend từ `backend/`, chạy `mvnw.cmd test` với DB test PostgreSQL riêng. Để chạy fixture legacy, tạo DB rỗng có tên khớp `finance_v71_fixture(_[0-9]+)?` và đặt `FINORA_GROUP_MIGRATION_DB` tương ứng. Test dùng local PostgreSQL và biến `DB_PORT`, `DB_PASSWORD`.
2. Web từ `frontend-web/`, chạy `npm run build`. Cho E2E, chạy Web và API cục bộ, seed `e2e/group-finance-fixture.sql` chỉ trên DB chấp nhận fixture, đặt các biến `FINORA_E2E_*` theo đầu script rồi chạy `node e2e/group-finance.cjs`.
3. Mobile từ `frontend-app/`, chạy `npm run tsc` và `npx expo export --platform android`. FinAI từ `pfm-ai-service/`, dùng Python trong venv chạy `python -m pytest -q -rs`.
4. Trước khi nâng cấp môi trường thật, kiểm kê split trùng theo `expense_id,user_id`, đối chiếu settlement và nộp quỹ qua ID giao dịch nguồn, sau đó chạy Flyway trên bản sao staging. Đối chiếu số dư quỹ đầu kỳ + nộp đã xác nhận − chi từ quỹ − hoàn ứng với số dư đang lưu, cộng các luồng nguồn hợp lệ khác như ví trẻ em theo giao dịch gốc. Kiểm tra tổng phần chia bằng khoản chi, tổng số dư ròng bằng 0, đã hoàn bằng tổng payment được ghi, và pending đứng ngoài tiến độ.
5. Chỉ chuyển trạng thái nghiệm thu sau khi các khoảng trống tại mục 1, 4, 5 và 6 có bằng chứng hoặc được chấp nhận rõ ràng. Phiên này chỉ kiểm thử cục bộ. Không commit, push hoặc deploy.
