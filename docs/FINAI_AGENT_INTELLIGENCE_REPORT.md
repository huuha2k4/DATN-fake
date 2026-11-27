# FinAI Agent — nâng cấp hội thoại và nghiệp vụ

**Trạng thái: PARTIALLY READY.** Cả 14 WRITE đã qua ma trận PostgreSQL. Chưa nghiệm thu hội thoại live cho mọi WRITE hoặc chạy trên thiết bị thật. Phần nghiệm thu cuối ghi kết quả mới nhất.

## Kết quả đợt nâng cấp ban đầu

- Router cũ nhận “chi nhóm” nhưng bỏ sót “chi tiêu nhóm”, rồi cho phép create_transaction. Route chi nhóm hiện chỉ có create_group_transaction. Spring có thêm chốt từ chối đề xuất cá nhân khi yêu cầu nói rõ nguồn nhóm. Thành viên chia chi phải là dữ liệu READ của nhóm đã chọn. Chi từ quỹ chung không kèm ví cá nhân.
- Từ khóa “50/30/20” từng làm mất dấu hiệu phân tích cá nhân. Phân tích toàn bộ lịch sử hiện sử dụng hồ sơ Analytics của người dùng qua Spring. Kết quả phân biệt chênh lệch thu chi với tiền thực tế đã tiết kiệm và giải thích khi thiếu dữ liệu phân loại. Khi có kỳ cụ thể, dùng thu chi đúng kỳ và nêu giới hạn nếu chưa có phân loại theo kỳ. Câu hỏi kiến thức chung không đọc tài khoản.
- Vòng Agent cũ ép Gemini chọn WRITE sau một số READ và dùng thông báo đề xuất khi text rỗng. Agent mới có tín hiệu request_clarification, từ chối tool sai và phản hồi rỗng. Pending Action chỉ xuất hiện sau khi Spring lưu đề xuất hợp lệ. API giữ MESSAGE, ACTION_REQUIRED và MULTI_ACTION_REQUIRED, bổ sung CLARIFICATION. Lỗi vẫn qua contract HTTP hiện có.
- Thiếu số tiền, ví, nhóm hoặc khoản nợ mơ hồ được hỏi lại. Chuyển ví loại ví đích khỏi lựa chọn nguồn. Trả nợ và thu hồi lọc đúng chiều và khoản còn hiệu lực. Danh mục lấy từ READ hoặc yêu cầu chọn khi chưa xác định được. Đã bỏ ID danh mục hardcode.
- Draft gồm ID, thời hạn 30 phút, lượt đã cung cấp, trường còn thiếu, lựa chọn an toàn và một số slot đã xác định. Draft lưu trong metadata tin nhắn hiện có. Spring kiểm tra ownership, option thuộc draft hiện hành và phiên bản hội thoại. Khóa hội thoại chỉ giữ trong lúc lưu, sau khi Gemini trả về. Web, widget và Mobile gửi draft ID và option ID. Lựa chọn cũ được vô hiệu hóa, lựa chọn còn hạn có thể tải lại qua lịch sử.

## Kiểm kê tool

Hai registry thống nhất **11 READ và 14 WRITE**. Tín hiệu request_clarification là control nội bộ Python, không phải tool tài chính. [Schema Python](../pfm-ai-service/action_agent.py) và [registry Spring](../backend/src/main/java/com/finance/finance/modules/finai/tool/FinAiToolRegistry.java) ghi các kiểu, giới hạn, enum, optional fields và schema gốc.

| READ | Mục đích, đầu vào và phạm vi |
|---|---|
| get_transactions | Lịch sử sở hữu, lọc ngày, ví, danh mục, loại, tiền, từ khóa và trang. Mặc định trang 1, 20 kết quả |
| get_accounts | Ví sở hữu và số dư, tùy chọn loại ví, tập hợp hoặc ví bất hoạt. Mặc định ví hoạt động |
| get_financial_overview | Tổng hợp và so sánh, tùy chọn ngày, ví, section và đơn vị thời gian. Mặc định cashflow |
| get_budgets | Tiến độ và hạn mức theo trạng thái, kỳ, tháng/năm. Dữ liệu user |
| get_goals | Mục tiêu, trạng thái, số đã góp và tiến độ. Dữ liệu user |
| get_debts | Nợ, chiều đi vay/cho vay, trạng thái, lịch trả và tổng hợp. Dữ liệu user |
| get_schedules | Lịch/nhắc, loại, trạng thái, từ khóa, ngày và trang. Dữ liệu user |
| get_groups | Nhóm đã tham gia, hỗ trợ phân trang. Spring kiểm tra membership |
| get_group_finances | Bắt buộc nhóm/section. Tùy chọn kỳ, trạng thái và trang. Section thành viên chỉ trả ID, tên, vai trò |
| get_categories | Bắt buộc INCOME hoặc EXPENSE. Danh mục user/system chưa bị xóa |
| get_spending_profile | Hồ sơ thu chi và 50/30/20, không cần args. User lấy từ HMAC đã xác minh |

| WRITE | Trường và điều kiện chính | READ hỗ trợ và card |
|---|---|---|
| create_transaction | Loại, tiền, ví, VND, ngày. Thu/chi cần danh mục. Chuyển cần ví đích khác nguồn. Phí, giờ, ghi chú tùy chọn | Ví/danh mục, card giao dịch hoặc chuyển |
| create_budget | Tên, kỳ, ngày đầu/cuối, tổng VND và mục danh mục/hạn mức. Hỏi khi thiếu tiền | Ngân sách/danh mục, card ngân sách |
| update_budget | ID, version hiện tại và ít nhất một trường cập nhật | Ngân sách, card trước/sau |
| create_goal | Tên, loại, số tiền đích, VND. Ngày, ưu tiên, ví tùy nghiệp vụ | Mục tiêu/ví khi liên kết, card mục tiêu |
| contribute_to_goal | Mục tiêu và số tiền. Có thể bỏ ví nếu chỉ ghi nhận tiến độ | Mục tiêu/ví, card đóng góp |
| create_debt | Chiều vay/cho vay, đối tác, gốc, VND, ngày bắt đầu. Lãi và lịch theo điều khoản | Card nợ, không tự ghi giao dịch ví |
| record_debt_payment | Khoản nợ, tiền, ngày. Phần gốc/lãi/phương thức/ví tùy nghiệp vụ. Hỏi khi nhiều khoản | Nợ/ví, card trả hoặc thu hồi |
| create_schedule | Loại, tên, quy tắc lặp và ngày bắt đầu. Nhắc hẹn cần nội dung, lịch giao dịch cần tham số giao dịch | Lịch/ví/danh mục, card lịch |
| update_schedule | ID lịch và trường cần sửa | Lịch thuộc user, card cập nhật |
| create_account | Tên, loại, số dư ban đầu do user cung cấp. Thông tin ngân hàng/thẻ tùy loại | Ví, card tài khoản |
| create_group_transaction | Nhóm, nội dung, tiền, nguồn, danh mục chi, ngày, cách chia và phần chia. Chi hộ cần ví nguồn | Nhóm/thành viên/danh mục/ví, card chi nhóm |
| contribute_group_fund | Nhóm, ví nguồn, tiền, ngày góp. Ghi chú tùy chọn | Nhóm/quỹ/ví, card góp quỹ |
| create_child_spend | Ngữ cảnh nhóm/ví trẻ em hợp lệ, tiền, mô tả và danh mục | Nhóm/ví trẻ em/danh mục, card chi |
| deposit_child_wallet | Nhóm/ví trẻ em, tiền, nguồn, ví nguồn theo điều kiện | Nhóm/ví nguồn, card cấp tiền |

Confirm/Cancel, ownership, membership, HMAC, service secret, transaction, audit và idempotency giữ cơ chế hiện có. Preview quỹ nhóm hiện rõ nhóm, nguồn, danh mục, ngày và cách chia. Sau confirm, các màn hình dùng lại invalidation và event sẵn có. Màn nhóm nghe event để tải lại khoản chi hoặc quỹ. Sổ tiết kiệm không có WRITE riêng trong registry.

## Kiểm thử và hiệu năng

| Bộ test | Kết quả |
|---|---:|
| Spring Boot package với PostgreSQL cô lập | 83 PASS |
| Python FinAI, chat guard và contract kết nối | 61 PASS |
| Analytics | 8 PASS |
| Playwright, gồm lựa chọn 390 px và contract Web/Mobile | 5 PASS |
| Gemini thật với dữ liệu tổng hợp | 4 PASS / 4 ca |

Tổng 161 ca. Web build, Mobile typecheck và export Android thành công. Đã xem lựa chọn Web bằng Chromium ở 390 px và 1440 px, gồm biến thể tối 1440 px. PostgreSQL xác nhận draft tải lại được, chặn option giả/cũ và cross-user, không tạo action lúc hỏi lại. Regression confirm lặp chỉ ghi một lần. Không có ma trận PostgreSQL đầy đủ cho cả 14 WRITE.

| Live Gemini, gemini-flash-lite-latest | Vòng | READ | Input / output tokens | Tổng |
|---|---:|---:|---:|---:|
| Kiến thức 50/30/20 | 1 | 0 | 1.604 / 241 | 1,50 s |
| Lịch tài chính hai nguồn | 2 | 2 | 4.048 / 138 | 2,01 s |
| Chuyển đúng ví nguồn và đích | 2 | 1 | 5.106 / 156 | 2,88 s |
| Chi đúng quỹ nhóm | 2 | 3 | 5.342 / 281 | 2,39 s |

Đúng tool và loại phản hồi 4/4 trong bộ live. Không có đề xuất sai hay câu trả lời rỗng trong 4 ca đó. READ dùng fixture hợp lệ và không ghi database. Chưa có tỷ lệ lỗi hỏi lại đại diện. Thiếu tiền được hỏi với 0 Gemini/0 READ. Lựa chọn ví hoặc nhóm có thể trả từ một READ và 0 Gemini. Chưa có benchmark cùng tải trước/sau. Deadline, max rounds, retry và request ID được giữ nguyên. Spring chỉ lấy 20 tin nhắn gần nhất để gửi vào context, draft có giới hạn riêng.

## File và giới hạn

Diff gồm 34 file code/test, thêm 1.326 dòng và bỏ 146 dòng. Báo cáo là file thứ 35.

- Spring — client, DTO chat/conversation/clarification, message/session repository, chat service, tool registry/executor và ba test FinanceApplicationTests, FinAiToolRegistryTest, FinAiToolExecutorTest.
- Python — action_agent.py, action_dialog.py, main.py, behavior_engine.py, test_action_agent.py và test_finai_live_gemini.py opt-in.
- Web/Mobile — API, mã lỗi, màn chat, component lựa chọn, Action Card và màn nhóm. Web có mini widget và Playwright.
- Không thêm migration hoặc dependency, không commit/push/deploy.

**Chưa nghiệm thu** — ma trận mọi WRITE, nhất là lịch phức tạp, ngân sách nhiều danh mục, phạm vi chia tùy biến và ví trẻ em. Một số tool vẫn phụ thuộc Gemini để giải nghĩa lượt tiếp theo. Chưa có UI chọn nhiều người chia chi, chưa chạy thiết bị Android/iOS thật, chưa stress test đồng thời hoặc deploy staging. Expo lint chưa chạy vì repo Mobile thiếu cấu hình ESLint.

Chạy discover toàn thư mục trong container offline gặp lỗi ở các module cần HTTP/DB đang chạy và runner thiếu pytest. Số PASS bên trên là từ các suite chỉ định, với PostgreSQL cô lập cho Spring và runner pytest riêng cho Analytics. Đã dừng PostgreSQL tạm và dọn output kiểm thử tạm.

## Nghiệm thu cuối

Phạm vi PostgreSQL gồm 17 tình huống trên 14 WRITE. Mỗi dòng kiểm tra dữ liệu bắt buộc, tạo Pending Action, giữ nguyên dữ liệu trước Confirm, Cancel rồi Confirm vẫn không ghi, Confirm thành công, Confirm lặp và chặn tài khoản khác Confirm hoặc Cancel. Ma trận gọi dịch vụ Spring thật trên PostgreSQL cô lập. API chat và đường Gemini có các bộ kiểm riêng.

| WRITE | Kết quả PostgreSQL | Hiệu ứng đã đối chiếu |
|---|---|---|
| create_transaction | PASS, 2 ca | Chi và chuyển ví. Kiểm tra số dư nguồn, ví đích và bản ghi chi |
| create_budget | PASS | Hai danh mục, tổng hạn mức 200.000 đ |
| update_budget | PASS | Tên mới, tăng version. Version cũ bị từ chối ở Confirm |
| create_goal | PASS | Một mục tiêu và số tiền đích đúng |
| contribute_to_goal | PASS | Tiến độ tăng và ví nguồn bị trừ đúng |
| create_debt | PASS | Tạo khoản đi vay với gốc đúng |
| record_debt_payment | PASS, 2 ca | Trả nợ trừ ví, thu hồi nợ cộng ví, mỗi ca một dòng thanh toán |
| create_schedule | PASS | Lịch chuyển ví mỗi tháng ngày 5 và 20, giới hạn số lần bằng RRULE |
| update_schedule | PASS | Tên mới và lịch lặp hai ngày trong tuần |
| create_account | PASS | Một ví tiền mặt với số dư ban đầu |
| create_group_transaction | PASS, 2 ca | Chi quỹ chung chia đều và chi hộ cá nhân chia số tiền cụ thể. Kiểm tra sổ quỹ, ví và từng phần chia |
| contribute_group_fund | PASS | Tăng quỹ, trừ ví và tạo một dòng đóng góp |
| create_child_spend | PASS | Trừ ví trẻ, số dư quỹ giữ nguyên |
| deposit_child_wallet | PASS | Tăng ví trẻ và trừ quỹ nhóm |

### Lỗi phát hiện trong đợt nghiệm thu

- PostgreSQL có thể lưu hai tin nhắn cùng timestamp sau khi làm tròn độ chính xác. Lượt đọc sau có thể lấy tin người dùng làm tin cuối và báo lựa chọn vừa hiện đã cũ. Hai tin nhắn được gán timestamp tăng dần trong giao dịch lưu và dùng timestamp cuối làm phiên bản hội thoại.
- Câu đáp chứa số tiền và ví như “50k từ ví Tiền mặt” có thể bị coi là một lượt READ riêng. Bản nháp nay nhận câu bổ sung này, đồng thời kiểm tra việc sửa cả số tiền và ví ở lượt sau.
- Các cấu trúc “lấy từ quỹ phòng trọ”, “dùng tiền quỹ”, “ứng tiền cá nhân” và “cả phòng” có thể rơi ngoài nhánh nhóm. Router và chốt Spring nhận diện thêm ngữ cảnh nguồn/nhóm. Nếu nguồn còn mơ hồ hoặc yêu cầu có hai WRITE riêng, Agent hỏi lại.
- Chia EXACT từng có thể đúng tổng nhưng gán nhầm số tiền giữa hai người. Agent đối chiếu từng người với số tiền ghi rõ và từ chối khi trùng tên. Spring từ chối chia EQUAL có độ lệch vượt mức làm tròn. Khi thiếu người, số tiền hoặc chỉ có tỷ lệ, Agent hỏi cách chia theo số tiền. Luồng vẫn dùng component clarification hiện có.
- FinAI có thể thay UUID danh mục ghi sai của khoản chi ví trẻ bằng danh mục suy luận. UUID hiện được kiểm tra quyền dùng trước khi tạo đề xuất. Các tuỳ chọn ví hoặc nhóm trùng tên nay hiển thị mã phân biệt.

### Multi-turn, security và concurrency

- PASS khi bổ sung số tiền, chọn ví bằng văn bản hoặc nút, nhập và sửa nhiều trường, chọn nhóm, chọn nguồn, hủy draft và chuyển chủ đề. Lựa chọn hết hạn, giả, thuộc cuộc trò chuyện khác hoặc tài khoản khác bị từ chối.
- PASS khi hai lượt chọn có khóa idempotency riêng cùng chạy. Lượt trả về trước lưu một đề xuất. Lượt trả về muộn bị từ chối với AI_DRAFT_STALE. Test kiểm tra Spring đang ở ngoài database transaction khi gọi Agent. Hai Confirm cùng chạy chỉ trừ quỹ một lần. Có regression cho JWT không hợp lệ và quyền Confirm/Cancel.
- Một yêu cầu bị ghi đè có thể đã gọi AI trước khi Spring phát hiện ở bước lưu. Chưa chạy stress test kéo dài hoặc đo phân vị độ trễ dưới tải.

### Build, Web và Mobile

| Hạng mục | Kết quả |
|---|---|
| Spring package, PostgreSQL cô lập | PASS 103 test |
| Python FinAI ngoại tuyến | PASS 68 test |
| Python Analytics | PASS 8 test |
| Playwright Web, mini widget và contract API Mobile | PASS 7 test |
| Web production build | PASS |
| Mobile TypeScript và export Android | PASS |
| Chạy trên thiết bị Android hoặc iOS thật, reload và cache thực tế trên thiết bị | NOT RUN |
| Đo hiệu năng dưới tải VPS hoặc production | NOT RUN |

Web kiểm tra lịch sử sau reload, lựa chọn hết hạn, gửi lựa chọn, trạng thái chậm, hủy chờ, thử lại, phân biệt lỗi mạng với lỗi HTTP và kích thước 390 px. Mini widget kiểm tra dark mode, chọn ví, Confirm/Cancel và phát sự kiện làm mới sau Confirm. Bài browser dùng HTTP fixture. Mobile đã chạy contract và bundle riêng.

### Gemini với fixture READ

PASS 9/9 bài, 15 lượt yêu cầu. 8 lượt dùng Gemini thật, tổng 14 lượt gọi mô hình. 7 lượt tất định đi qua READ hoặc xử lý clarification và dùng 0 lượt Gemini.

| Yêu cầu có gọi Gemini | Lượt Gemini | READ | Tổng thời gian |
|---|---:|---:|---:|
| Chuyển ví đầy đủ | 2 | 1 | 3.789 ms |
| Tư vấn ngân sách | 2 | 1 | 2.041 ms |
| Lịch từ hai nguồn | 2 | 2 | 1.933 ms |
| Kiến thức 50/30/20 | 1 | 0 | 1.684 ms |
| Chi quỹ nhóm | 2 | 3 | 2.365 ms |
| Đổi chủ đề sang kiến thức | 1 | 0 | 1.818 ms |
| Phân tích tháng trước | 2 | 1 | 2.677 ms |
| Tiếp tục chuyển tiền sau khi chọn ví | 2 | 1 | 1.915 ms |

Bảy lượt tất định bao gồm trả nợ/thu hồi khi không có nợ, chọn nhóm rồi hỏi nguồn, phân tích cá nhân 50/30/20 có dữ liệu, trường hợp thiếu dữ liệu và lượt hỏi chọn ví. Gemini dùng model gemini-flash-lite-latest. Không có lần gọi provider lỗi trong bộ này. So với vòng trước, chi nhóm vẫn dùng 2 lượt Gemini và 3 READ trong fixture. Chưa có benchmark cân bằng trước/sau để kết luận thay đổi tốc độ.

### E2E Spring, Python và PostgreSQL

**PASS 2/2 ca** trên dữ liệu tổng hợp. Gọi API công khai qua JWT của môi trường test, dùng service secret và HMAC sẵn có khi qua service nội bộ. Lần dựng đầu nhận HTTP 401 từ Python vì hai container test chưa dùng cùng service secret. Đã đồng bộ biến môi trường ở container test và chạy qua cả hai ca. Lần dựng đầu chưa gọi provider.

| Ca | Tổng HTTP | Spring | Spring sang Python | Agent | Gemini / READ |
|---|---:|---:|---:|---:|---:|
| Chi 50.000 đ từ quỹ nhóm | 4.871 ms | 4.733 ms | 4.412 ms | 4.291 ms | 3 / 3 |
| Đánh giá 50/30/20 cá nhân | 131 ms | 110 ms | 97 ms | 89 ms | 0 / 1 |

- Chi nhóm trả đúng ACTION_REQUIRED. Trước Confirm, quỹ 250.000 đ, ví cá nhân 1.500.000 đ, chưa có chi nhóm. Sau hai lần Confirm, quỹ còn 200.000 đ, ví vẫn 1.500.000 đ, có đúng một chi nhóm. Hai phần chia cộng đúng 50.000 đ và bản ghi chi không gắn ví cá nhân.
- Analytics đọc 10 giao dịch qua PostgreSQL, trả 10.000.000 đ thu nhập, 8.500.000 đ chi tiêu, gợi ý cải thiện 500.000 đ để đạt mốc 20%. Không tạo Pending Action.
- Request ID đối chiếu được giữa Spring và Python. Với ca quỹ nhóm, các lượt Gemini đo 1.312, 1.026 và 1.526 ms. Ba READ tính cả mạng đo 164, 28 và 44 ms. Thời gian lớn nhất trong mẫu là chờ Gemini. Số READ bằng bộ fixture. Gemini thực hiện thêm một lượt khi tách các READ liên tiếp. Timeout, retry, số lượt tối đa và giới hạn tool giữ cấu hình hiện có.


### Phạm vi nghiệm thu còn lại

- **NOT RUN** hội thoại live cho mọi nhánh của 14 WRITE, đặc biệt ví trẻ em, cập nhật lịch/ngân sách và kiểm thử mọi thay đổi tài nguyên giữa proposal và confirm.
- **BLOCKED** chọn nhiều thành viên trực tiếp trên giao diện và nhập tỷ lệ chia qua FinAI. Có đường hỏi lại rồi ghi rõ tên và số tiền của từng người. Với thành viên trùng tên chưa phân biệt được, Agent dừng ở bước hỏi.
- **NOT RUN** thiết bị thật và VPS. Báo cáo phản ánh quá trình kiểm thử trên workspace cục bộ.

### Thống kê và cleanup

- Tổng diff FinAI trong workspace gồm 35 file code/test, thêm 2.047 dòng và xóa 148 dòng. Báo cáo này là file thứ 36. Thống kê lấy so với HEAD và bao gồm thay đổi từ đợt nâng cấp trước.
- Đợt nghiệm thu thay đổi bộ test PostgreSQL và chat Spring, bộ guard Python, bộ live fixture Gemini và Playwright Web. Giữ các test tự động trong repo. Không còn bài FAIL trong các suite kể trên.
- Đã dừng các container Spring/Python/PostgreSQL test, xóa network, output Playwright, bundle Android test và log console tạm. Giữ một .env ở thư mục gốc. Không đổi dependency, migration, hợp đồng lỗi hoặc cấu hình deadline. Không commit, push hoặc deploy.

## Sửa lỗi hội thoại không cần công cụ

**READY FOR DEPLOYMENT TESTING** cho bản sửa hội thoại. Kết quả cho toàn bộ FinAI và phạm vi thiết bị thật nằm ở phần nghiệm thu trên.

Hai câu “Bạn ăn cơm chưa?” và “Bạn có thể giúp gì cho tôi?” đều từng đi vào nhánh READ rộng. Router bỏ dấu, biến “bạn” và “bán” thành cùng một từ rồi dùng từ đó làm tín hiệu tài chính. Khi Gemini trả văn bản mà không gọi READ, Agent kích hoạt điều kiện thiếu READ và FastAPI trả 502. Spring chuyển nguyên hợp đồng lỗi, Web, Mobile và mini widget hiển thị thông báo lỗi cùng request ID. Đã tái hiện trực tiếp route cũ cho cả hai câu. Behavior Engine chỉ tham gia khi lấy hồ sơ chi tiêu, ngoài đường dẫn hội thoại thông thường.

### Thay đổi

- action_agent.py phân biệt từ chỉ người dùng với tín hiệu bán hàng, chọn đường Gemini không gắn tool cho hội thoại, giới thiệu khả năng, kiến thức hoặc tư vấn chung. Chào, cảm ơn và tạm biệt đơn giản có thể trả lời ngay. Prompt dùng danh mục tính năng từ registry và yêu cầu chỉ đề xuất thay đổi để người dùng xác nhận. Các yêu cầu ngoài chuyên môn nhận lời giải thích phù hợp nội dung. Tư vấn chi phí học, mua laptop, du lịch, xe hoặc trả góp vẫn được hỗ trợ. Trích xuất riêng phần text công khai của phản hồi Gemini.
- main.py, FinAiAgentClient.java và FinAiChatService.java hỗ trợ cờ nội bộ giữ draft. Khi người dùng xen câu xã giao, Spring trả MESSAGE và giữ nguyên ID, thời hạn và nội dung draft. Đổi chủ đề rõ ràng hoặc hủy vẫn đi theo quy tắc cũ. Web và Mobile dùng hợp đồng công khai hiện có.
- test_action_agent.py, test_finai_connection.py, test_finai_live_gemini.py, FinanceApplicationTests.java và finai-connection.spec.ts lưu regression. Bộ Python kiểm tra ví dụ tiếng Việt có dấu, không dấu và viết tắt, câu giới thiệu và ngoài phạm vi, tài chính kết hợp, số tiền và lựa chọn theo thứ tự. Spring kiểm tra trạng thái MESSAGE, draft giữ qua lần tải lại, không có Pending Action và lựa chọn vẫn dùng được.

### Kiểm chứng

| Câu hỏi qua API Spring, Gemini thật và PostgreSQL cô lập | Kết quả | Gemini / READ / WRITE | Tổng HTTP |
|---|---|---:|---:|
| Bạn ăn cơm chưa? | HTTP 200, MESSAGE, FinAI giải thích là AI | 1 / 0 / 0 | 1.452 ms |
| Bạn có thể giúp gì cho tôi? | HTTP 200, MESSAGE, nêu khả năng và yêu cầu xác nhận | 1 / 0 / 0 | 1.181 ms |
| Cảm ơn bạn, khi đang có draft | HTTP 200, MESSAGE, giữ đúng draft | 0 / 0 / 0 | 172 ms |

PostgreSQL có 0 Pending Action cho cả ba ca. Dữ liệu dùng duy nhất tài khoản tổng hợp. Gemini fixture còn xác minh từ chối yêu cầu viết code Java như hội thoại bình thường và trả lời kiến thức 50/30/20. Luồng tài chính cá nhân vẫn đọc Analytics. Các regression chọn nhóm, chi quỹ, chọn ví, bổ sung và đổi dữ liệu, hủy draft, chuyển chủ đề, tư vấn rồi yêu cầu lập ngân sách và Confirm/Cancel đã qua. Lỗi Gemini hoặc lỗi READ thật vẫn đi qua status và request ID phù hợp.

| Bộ kiểm thử | Kết quả cuối |
|---|---:|
| Spring Boot package với PostgreSQL, gồm 17 ca WRITE | 103 PASS |
| Python FinAI và hợp đồng HTTP | 73 PASS |
| Analytics | 8 PASS |
| Playwright Web và mini widget, gồm hợp đồng lỗi Mobile | 8 PASS |
| Gemini với fixture, gồm các ca mới | 12 PASS |
| E2E qua API Spring với Gemini thật hoặc fast path | 3 PASS riêng |

**204 test PASS, 0 FAIL còn lại**, cộng 3 ca E2E riêng. Bộ live chạm 429 ở ca chọn ví. Chạy lại riêng ca đó sau khi giới hạn tần suất hạ đã PASS. Analytics có một lần CmdStan thoát giữa bài dự báo trên Windows. Chạy lại đủ 8 bài đã PASS. Web build, Mobile typecheck và Android export đều PASS. Mobile trên thiết bị thật và VPS chưa chạy. Đợt này giữ cấu hình deadline, retry, 11 READ, 14 WRITE và API công khai hiện có.


