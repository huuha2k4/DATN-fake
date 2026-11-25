# BÁO CÁO TIẾN ĐỘ & NGHIỆM THU — FINORA FULL FRONTEND REMEDIATION

**Chuẩn tham chiếu:** Impeccable v4.10.0 + `FRONTEND_AUDIT_REPORT.md`  
**Cập nhật gần nhất:** 25/11/2026

---

## PHASE 0 — VERIFY AUDIT & TEST ENVIRONMENT (HOÀN TẤT)

### 1. Git Working Tree & Bảo vệ thay đổi hiện có
- Đã kiểm tra `git status --short`: người dùng đang có sẵn các thay đổi chưa commit tại `GroupController.java`, `ChildWalletService.java`, `GroupManagementScreen.tsx`, `MiniAIChatWidget.css`, `AuthModal.css`, `CashFlowManagementScreen.css`, `DebtManagementScreen.css`, `AddTransactionScreen.tsx`, `FinancialReportsDashboardScreen.tsx`, `InvoiceOcrScreen.tsx`, `nginx.conf`, v.v. Tất cả được giữ nguyên, không revert hoặc ghi đè ngoài phạm vi.

### 2. Baseline Build / Lint / TypeScript
| Kiểm tra | Kết quả Baseline | Chi tiết |
|---|---|---|
| `npm --prefix frontend-web run build` (`tsc -b && vite build`) | **PASS** (1.77s) | 3,419 modules; main JS bundle = **3,190.48 kB** (`819.23 kB` gzip); CSS = **457.68 kB** (`70.40 kB` gzip). |
| `npm --prefix frontend-web run lint` (`eslint .`) | **FAIL** (Pre-existing) | **349 problems** (310 errors, 39 warnings — chủ yếu `@typescript-eslint/no-explicit-any` và `react-hooks/set-state-in-effect`). |
| `npm --prefix frontend-app run tsc` (`tsc --noEmit`) | **PASS** (0 errors) | Clean TypeScript baseline. |

### 3. Môi trường kiểm thử thực tế
- **Web Browser:** `PLAYWRIGHT=False`, `CHROME=False`, `EDGE=True` (`msedge.exe`), `chrome_devtools` MCP không kết nối được (`DevToolsActivePort` missing), `impeccable.cmd` bị chặn tải binary cache trong sandbox. Sẽ dùng **Microsoft Edge headless / CLI** hoặc kiểm tra build + DOM/CSS tĩnh để xác minh Web ở Phase 3 & 6.
- **Android:** `ADB=False`, không có Android Emulator/thiết bị kết nối → kiểm tra hành vi runtime Android ở trạng thái `NOT_VERIFIED` (chỉ kiểm tra tĩnh mã nguồn & `tsc`).
- **iOS:** Môi trường Windows không có Xcode/iOS Simulator → toàn bộ kiểm thử runtime iOS ở trạng thái `NOT_VERIFIED`.

### 4. Xác minh Finding với Backend Contract (Loại bỏ False Positive)
- **Rule mật khẩu (`CompleteProfileModal`, `ChangePasswordModal`):** Backend `ChangePasswordRequest.java:20` & `UpdateProfileRequest.java:23` chỉ yêu cầu `@Size(min = 6)`. Do đó việc Frontend kiểm tra `>= 6` ký tự ở 2 màn hình này khớp hợp đồng Backend → đánh dấu **FALSE_POSITIVE** (không tự ý đổi thành `>= 8`). `RegisterRequest` và `ResetPasswordRequest` vẫn giữ `>= 8` đúng theo Backend.
- **Feedback Category Enum:** Backend `SendFeedbackRequest` dùng `BUG, FEATURE, QUESTION, OTHER` trong khi `AdminFeedbackItem` ghi chú `BUG, FEATURE_REQUEST, GENERAL, PAYMENT`. Xác nhận **VERIFIED** — Frontend Admin cần hỗ trợ cả 2 bộ giá trị trong bộ lọc và nhãn hiển thị.
- **`AdminUpdateUserRequest`:** Backend DTO **có** hỗ trợ `private String fullName;` (`AdminUpdateUserRequest.java:10`). Xác nhận lỗi `AdminUserManagementScreen` bỏ quên `fullName` là **VERIFIED**.

---

## PHASE 1 — FUNCTIONAL CORRECTNESS & FINANCIAL DATA INTEGRITY (HOÀN TẤT)

### Finding đã xác minh & khắc phục (`FIXED`)
1. **Dữ liệu dự báo giả hardcode (`BalanceForecastScreen.tsx`):** Đã xóa chuỗi hardcode `'Dự báo số dư đến ngày 25/11/2026: 17.150.048 VND...'`, thay bằng thông báo trung thực `'Chưa có đủ dữ liệu giao dịch để lập dự báo chi tiết.'`.
2. **Nuốt lỗi API hiện `0 đ` (`HomeScreen.tsx`, `FinancialForecastScreen.tsx`, `SpendingAnalysisScreen.tsx`):**
   - `HomeScreen.tsx` (App): Bổ sung `isInitialLoading` & `loadError`, xử lý `Promise.allSettled` cho ví trẻ em và `catch` cho tài khoản chính, hiển thị banner lỗi kèm nút **Thử lại** thay vì im lặng hiện `0 đ`.
   - `FinancialForecastScreen.tsx` & `SpendingAnalysisScreen.tsx` (Web): Kiểm tra `allRejected` từ `Promise.allSettled`; nếu toàn bộ API lỗi thì hiển thị banner cảnh báo + nút **Thử lại** và không báo toast thành công giả.
3. **Null-pointer crash tại Admin (`AdminOcrManagementScreen.tsx`, `AdminFeedbacksScreen.tsx`, `AdminAuditLogsScreen.tsx`):** Bọc `(field ?? '').toLowerCase()` cho toàn bộ bộ lọc tìm kiếm. Loại bỏ fallback giả `0.88` (88%) ở `AdminOcrManagementScreen.tsx:119` khi `averageConfidence` bằng `0`.
4. **Hardcode trạng thái AI (`AdminAIManagementScreen.tsx:150`):** Thay `'HOẠT ĐỘNG'` cứng bằng trạng thái thực từ `loading / error / data?.status`.
5. **Lệch Enum Feedback (`AdminFeedbacksScreen.tsx`):** Hỗ trợ cả 2 bộ enum từ Backend (`BUG`, `FEATURE`/`FEATURE_REQUEST`, `QUESTION`/`GENERAL`, `PAYMENT`, `OTHER`) trong bộ lọc và nhãn hiển thị. *(Lưu ý: Backend vẫn lưu 2 quy ước đặt tên giữa `SendFeedbackRequest` và `AdminFeedbackItem` — ghi nhận để đồng bộ Backend ở đợt riêng nếu cần).*
6. **Sửa `fullName` Admin không lưu (`AdminUserManagementScreen.tsx`):** Chuyển `fullName` từ `defaultValue` sang controlled state `editFullName` và gửi kèm trong `adminApi.updateUser(...)` (khớp `AdminUpdateUserRequest.java`).
7. **Trang trắng khi sai route (`AppScreen.tsx:321`):** Bổ sung `<Route path="*" element={<Navigate to="/dashboard" replace />} />` cho user thường.
8. **Treo loading vô hạn (`ChildCashFlowScreen.tsx:13`):** Gọi `setLoading(false)` và hiển thị thông báo rõ ràng khi thiếu `childWalletGroupId` / `childWalletId`, đồng thời null-safe `(item.description || '')`.
9. **Picker không đồng bộ props (`AppDateTimePicker.tsx`, `DateRangePicker.tsx` App):** Bổ sung `useEffect` đồng bộ `value` / `startDate` / `endDate` khi prop thay đổi.
10. **Nút rỗng vô tác dụng (`FloatingChatIcons.tsx:1508`):** Loại bỏ nút `emojiBtn` có `onPress={() => {}}` chưa cài đặt.

### Kiểm thử Phase 1
- `npm --prefix frontend-web run build`: **PASS**
- `npm --prefix frontend-app run tsc`: **PASS** (0 lỗi)

---

## PHASE 2 — NATIVE MOBILE STABILITY (HOÀN TẤT — KIỂM THỬ TĨNH & TSC PASS)

### Finding đã xác minh & khắc phục (`FIXED`)
1. **6 Nested `<Modal>` trong `ChildWalletDetailModal.tsx`:** Đã chuyển toàn bộ 6 modal con (`approvingReq`, `rejectingReq`, `isCreateChoreOpen`, `isCreateSpendOpen`, `showAccountPickerModal`, `isResetPassModalOpen`) thành overlay `View` (`StyleSheet.absoluteFill`, `zIndex: 9999`) ngang hàng bên trong Modal cha, và cập nhật `handleParentRequestClose` để đóng lớp con trước khi đóng modal cha.
2. **Kiểm kê lại `<Modal>` thiếu `onRequestClose`:**
   - **FALSE_POSITIVE (15 trường hợp):** `GroupScreen` (5 modal), `AccountsScreen` (2 modal), `AddTransactionScreen`, `TransactionsScreen`, `PeriodicReportsScreen`, `ScanInvoiceScreen`, `FloatingChatIcons` (2 modal) thực tế đã có `onRequestClose` (nhưng nằm cách thẻ mở >3 dòng).
   - **VERIFIED & FIXED (5 trường hợp):** Đã bổ sung `onRequestClose` cho `FloatingChatIcons.tsx:1882` (Lightbox), `ChildMoneyRequestsScreen.tsx:477`, `SystemSettingsScreen.tsx:291`, `GroupScreen.tsx:3719` (`expenseModalVisible`), `AccountsScreen.tsx:793` (`isEditModalOpen`).
3. **Android Back Button & `app.json`:**
   - `app.json`: Đổi `"userInterfaceStyle": "automatic"`, `"softwareKeyboardLayoutMode": "resize"`, `"predictiveBackGestureEnabled": true` (giữ nguyên `"orientation": "portrait"` theo nguyên tắc).
   - `App.tsx`: Thêm `BackHandler.addEventListener('hardwareBackPress', ...)` điều hướng quay lại màn hình/tab trước thay vì thoát thẳng app khi đang ở màn hình con hoặc tab khác `home`.
4. **`KeyboardAvoidingView` trên Android:** Đổi `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` sang `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` tại `AiAssistantScreen.tsx`, `AddTransactionScreen.tsx`, `GroupScreen.tsx`, `AccountsScreen.tsx`, `BudgetScreen.tsx`, `SecurityScreen.tsx`, `ForgotPasswordModal.tsx`, và bọc `KeyboardAvoidingView` cho modal xin tiền trong `ChildMoneyRequestsScreen.tsx`.
5. **Animation Leak & Reduce Motion (`ScanInvoiceScreen.tsx:136`):** Kiểm tra `AccessibilityInfo.isReduceMotionEnabled()` trước khi chạy `Animated.loop` và gọi `anim?.stop()` khi unmount.
6. **Card cố định chiều cao & ImagePicker deprecated:** Đổi `height: BANNER_HEIGHT` sang `minHeight: BANNER_HEIGHT` ở `BudgetCard.tsx` để tránh cắt chữ khi phóng to font; thay `ImagePicker.MediaTypeOptions.Images` sang `['images']` ở `CompleteProfileModal.tsx`.

### Kiểm thử & Trạng thái chưa kiểm chứng Phase 2
- `npm --prefix frontend-app run tsc`: **PASS** (0 lỗi).
- Runtime trên thiết bị thật / Emulator Android & iOS Simulator: **`NOT_VERIFIED`** (do môi trường không có ADB/Emulator/Xcode Simulator).

---

## PHASE 3 — RESPONSIVE & DESIGN SYSTEM (HOÀN TẤT — BUILD & TSC PASS)

### Finding đã xác minh & khắc phục (`FIXED`)
1. **Landing Page Mobile (`LandingScreen.css`):**
   - Sửa lỗi CSS không hợp lệ `shrink: 0;` → `flex-shrink: 0;` (3 vị trí).
   - Bổ sung `white-space: nowrap; flex-shrink: 0;` cho `.btn-nav-login` và `.btn-nav-cta` chống rớt dòng thành 2 hàng trên header mobile.
   - Ở `@media (max-width: 768px)`: giảm padding container xuống `0 16px`, chuyển `.highlight-card-head` về `grid-template-columns: 1fr` (ảnh trên, nội dung dưới), thu gọn `.highlight-illus-box` (`160×140`), stack `.why-finora-grid` về `1fr` và `.faq-title-row` về cột dọc.
2. **Tràn ngang Mobile Web (`375px`):**
   - `DateRangePicker.tsx` (Web): Dùng `numberOfMonths={1}` dưới `640px` và `fixed left-3 right-3` chống tràn 2 tháng.
   - `NotificationDropdown.css`: Thêm `@media (max-width: 640px)` đặt `position: fixed; left: 12px; right: 12px; top: 64px; width: auto;`.
   - `DashboardHeaderSection.tsx` & `AdminLayout.tsx`: Thêm `min-w-0 flex-1` cho phần tiêu đề bên trái.
   - `GroupManagementScreen.tsx:3390`: Thêm `min-w-[820px]` cho bảng `table-fixed` 6 cột.
   - `AdminAnalyticsScreen.tsx:189`: Bọc biểu đồ 14 ngày trong `overflow-x-auto` với `min-w-[520px]`.
   - `NotificationScreen.tsx:241` & `ChildCashFlowScreen.tsx:52`: Đổi `grid-cols-1 sm:grid-cols-3` và thêm `min-w-0 flex-1 truncate` + `shrink-0 tabular-nums`.
3. **Token Tailwind không hợp lệ & Dark Mode (Web + App):**
   - Thay toàn bộ `dark:bg-slate-850` → `dark:bg-slate-900` và `dark:border-slate-750` → `dark:border-slate-700` trên 9 file (`GoalsManagementScreen`, `GroupManagementScreen`, `NotificationScreen`, và 6 màn Admin).
   - Bổ sung Dark Mode cho dropdown lọc (`BudgetManagementScreen.tsx:661`, `CashFlowManagementScreen.tsx:996,1093,1177`), `ChildCashFlowScreen.tsx`, `DashboardHeaderSection.tsx`, `NotificationScreen.tsx:209`, và scrollbar chính trong `index.css`.
   - App: Chuyển `StatCard.tsx`, `AppDatePicker.tsx`, `AppDateTimePicker.tsx`, `DateRangePicker.tsx`, và empty state chat `GroupScreen.tsx:1579` sang dùng `useAppTheme()` làm mặc định.

### Kiểm thử Phase 3
- `npm --prefix frontend-web run build`: **PASS**
- `npm --prefix frontend-app run tsc`: **PASS** (0 lỗi)

---

## PHASE 4 — PERFORMANCE & CODE ARCHITECTURE (HOÀN TẤT — ĐO ĐẠC THỰC TẾ)

### Finding đã xác minh & khắc phục (`FIXED`)
1. **Route-level Code Splitting (`AppScreen.tsx`):** Chuyển toàn bộ 34 màn hình User, Child Wallet, Pricing, Legal và 13 màn hình Admin sang `React.lazy()` + `<Suspense fallback={<RouteSuspenseFallback />}>`. Giữ `LandingScreen` eager để First Paint trang chủ tức thì.
   - **So sánh hiệu năng Bundle (Baseline vs Sau Phase 4):**
     - Main initial JS (`index-*.js`): **3,190.48 kB** (`819.23 kB` gzip) → **438.85 kB** (`125.33 kB` gzip) (**giảm 86.2%** dung lượng JS tải ban đầu).
     - Main initial CSS (`index-*.css`): **457.68 kB** (`70.40 kB` gzip) → **324.37 kB** (`49.67 kB` gzip) (**giảm 29.1%**).
     - Build time: `1.77s` → `1.21s`.
2. **Tối ưu Polling nền & Chống bỏ sót lỗi (Web + App):**
   - `NotificationDropdown.tsx` (Web): Tạm dừng polling 10s khi `document.hidden === true`, tự fetch lại khi `visibilitychange` quay về visible, và bọc `try/catch` cho `markAsRead` / `markAllAsRead`.
   - `HomeHeader.tsx` (App): Tạm dừng polling 15s đếm thông báo chưa đọc khi `AppState.currentState !== 'active'`, tự đồng bộ lại khi app active.
   - `FloatingChatIcons.tsx` (App): Chỉ poll 4s khi popup chat nhóm đang mở (`activePopup === 'GROUPS' || activePopup === 'ACTIVE_GROUP_CHAT'`) và app active; khi đóng giãn nhịp xuống 15s (giữ nguyên badge tin nhắn chưa đọc mà giảm mạnh request dư thừa).

### Hạng mục kiến trúc ghi nhận `DEFERRED` (Chờ kế hoạch refactor chuyên sâu)
- Tách module cho các file nguyên khối lớn (`GroupManagementScreen.tsx` 7,245 dòng, `GroupScreen.tsx` 6,294 dòng, `DebtScreen.tsx` 4,375 dòng, `RemindersScreen.tsx` 3,706 dòng, `TransactionsScreen.tsx` 3,426 dòng) và chuyển danh sách chat/giao dịch App sang `FlatList`/`SectionList`: được ghi nhận **DEFERRED** để tránh rủi ro hồi quy khi chưa có E2E/device test tự động.

### Kiểm thử Phase 4
- `npm --prefix frontend-web run build`: **PASS** (1.21s, chunk tách sạch).
- `npm --prefix frontend-app run tsc`: **PASS** (0 lỗi).

---

## PHASE 5 — ACCESSIBILITY & UX POLISH (HOÀN TẤT — BUILD & TSC PASS)

### Finding đã xác minh & khắc phục (`FIXED`)
1. **Markdown thô trong FinAI (`AIAssistantScreen.tsx:426`):** Thay `**trực tiếp chuẩn bị giao dịch, ngân sách**` bằng thẻ `<strong>`.
2. **Thay `window.confirm()` bằng `ConfirmDeleteModal` (`InvoiceOcrScreen.tsx:310`):** Chuẩn hóa hộp thoại xóa hóa đơn qua component `ConfirmDeleteModal` dùng chung, hỗ trợ Dark Mode và phím `Escape`.
3. **Icon lỗi ở Admin Settings (`AdminSettingsScreen.tsx:209`):** Sửa `<FinanceIcon name="alert" />` (không tồn tại trong map) thành `<FinanceIcon name="alert-circle" />`.
4. **SPA Router thay cho `window.location.href` (`UserAvatar.tsx:124,209`):** Dùng `useNavigate()` của `react-router-dom` cho nút nâng cấp gói `/pricing` và `/feedback` để không reload toàn trang.
5. **Accessibility & Touch Target (`ConfirmDeleteModal.tsx`, `LandingScreen.tsx`, `DashboardScreen.tsx`, `InvoiceOcrScreen.tsx`):**
   - `ConfirmDeleteModal.tsx`: Thêm `role="dialog"`, `aria-modal="true"`, `aria-label`, và đóng bằng phím `Escape`.
   - `LandingScreen.tsx`: Thêm `aria-label` cho nút theme toggle và `role="button"`, `tabIndex={0}`, `aria-expanded`, `onKeyDown` (`Enter`/`Space`) cho danh sách FAQ.
   - `DashboardScreen.tsx:398`: Mở rộng vùng chạm nút ẩn/hiện số dư (`min-h-[36px] min-w-[36px]`) + thêm `aria-label`.
   - `InvoiceOcrScreen.tsx:1070`: Nâng nút đóng lightbox lên `size-11` (`44×44px`) + `aria-label`.

---

## PHASE 6 — FULL REGRESSION, ACCEPTANCE TEST & BÁO CÁO NGHIỆM THU (HOÀN TẤT)

### 1. Kết quả Build & TypeScript sau toàn bộ chỉnh sửa
| Hạng mục | Baseline (Phase 0) | Sau Remediation (Phase 6) | Trạng thái |
|---|---|---|---|
| `npm --prefix frontend-web run build` (`tsc -b && vite build`) | PASS (1.77s) · `index.js` = **3,190.48 kB** (`819.23 kB` gzip) | **PASS (1.16s)** · `index.js` = **439.03 kB** (`125.39 kB` gzip) | **PASS (-86.2% initial JS)** |
| `npm --prefix frontend-app run tsc` (`tsc --noEmit`) | PASS (0 errors) | **PASS (0 errors)** | **PASS** |
| `npm --prefix frontend-web run lint` | FAIL (349 pre-existing issues) | Chưa chạy lại toàn repo (`tsc -b` pass 0 lỗi) | `NOT_VERIFIED` (Pre-existing lint) |

### 2. Tổng hợp trạng thái Finding
- **Tổng số finding ban đầu (từ `FRONTEND_AUDIT_REPORT.md`):** 29 nhóm finding chính (7 P0, 8 P1, 11 P2/P3 + 3 hạng mục kiến trúc).
- **Đã xác minh (`VERIFIED`):** 27 nhóm finding.
- **False Positive (`FALSE_POSITIVE`):** 2 nhóm (15 modal trên App thực tế đã có `onRequestClose`; rule mật khẩu `>= 6` ký tự ở `CompleteProfileModal`/`ChangePasswordModal` khớp đúng DTO Backend).
- **Đã khắc phục (`FIXED`):** **22 nhóm finding** trọng yếu (toàn bộ P0 chức năng/crash/nested modal/Landing mobile/invalid Tailwind tokens, tối ưu lazy loading, polling nền, Dark Mode chính, KeyboardAvoidingView Android, BackHandler App, A11y modal/FAQ/icon/Markdown/SPA router).
- **Hoãn có chủ đích (`DEFERRED`):** Tách file nguyên khối (`GroupManagementScreen.tsx`, `GroupScreen.tsx`, `DebtScreen.tsx`, `RemindersScreen.tsx`, `TransactionsScreen.tsx`) & chuyển toàn bộ `ScrollView` chat/lịch sử sang `FlatList`/`SectionList`, cùng dọn code legacy (`OnboardingWizardModal`, `UserDropdown`, `PrivacyPolicyModal`, `src/theme.ts`), để tránh rủi ro hồi quy khi chưa có E2E/device test tự động.
- **Lỗi phát sinh mới:** 0 lỗi TypeScript / Build (đã phát hiện và vá ngay 2 lỗi JSX/import trong quá trình triển khai tại `HomeScreen.tsx`, `ChildMoneyRequestsScreen.tsx`, `AppScreen.tsx`).

### 3. Ma trận kiểm thử Web, Android & iOS
| Nền tảng | Kiểm thử tĩnh (`tsc` / `vite build` / Code Review) | Kiểm thử runtime thực tế | Ghi chú / Nguyên nhân |
|---|---|---|---|
| **Web (`frontend-web`)** | **PASS** (`tsc -b && vite build` 0 lỗi, chunk tách sạch) | **`NOT_VERIFIED`** | `chrome_devtools` MCP thiếu `DevToolsActivePort`; `impeccable.cmd` bị chặn tải engine; headless Edge không xuất được ảnh trong sandbox. |
| **Android (`frontend-app`)** | **PASS** (`tsc --noEmit` 0 lỗi) | **`NOT_VERIFIED`** | `ADB=False`, không có Android Emulator hoặc thiết bị thật kết nối. |
| **iOS (`frontend-app`)** | **PASS** (`tsc --noEmit` 0 lỗi) | **`NOT_VERIFIED`** | Môi trường Windows không có macOS / Xcode / iOS Simulator. |

### 4. Danh sách file đã sửa trong đợt Remediation
- **Web (`frontend-web`):** `src/index.css`, `src/modules/app/screen/AppScreen.tsx`, `src/modules/auth/screen/LandingScreen.css`, `src/modules/auth/screen/LandingScreen.tsx`, `src/modules/core/components/ConfirmDeleteModal.tsx`, `src/modules/core/components/DashboardHeaderSection.tsx`, `src/modules/core/components/DateRangePicker.tsx`, `src/modules/dashboard/screen/DashboardScreen.tsx`, `src/modules/budget-management/screen/BudgetManagementScreen.tsx`, `src/modules/budget-goals/screen/GoalsManagementScreen.tsx`, `src/modules/cash-flow-management/screen/CashFlowManagementScreen.tsx`, `src/modules/financial-forecast/screen/FinancialForecastScreen.tsx`, `src/modules/spending-analysis/screen/SpendingAnalysisScreen.tsx`, `src/modules/ai-assistant/screen/AIAssistantScreen.tsx`, `src/modules/invoice-ocr/screen/InvoiceOcrScreen.tsx`, `src/modules/group/screen/GroupManagementScreen.tsx`, `src/modules/child-wallet/screen/ChildCashFlowScreen.tsx`, `src/modules/notification/components/NotificationDropdown.tsx`, `src/modules/notification/components/NotificationDropdown.css`, `src/modules/notification/screen/NotificationScreen.tsx`, `src/modules/profile/components/UserAvatar.tsx`, `src/modules/admin/components/AdminLayout.tsx`, `src/modules/admin/screen/AdminAIManagementScreen.tsx`, `src/modules/admin/screen/AdminAnalyticsScreen.tsx`, `src/modules/admin/screen/AdminAuditLogsScreen.tsx`, `src/modules/admin/screen/AdminBroadcastScreen.tsx`, `src/modules/admin/screen/AdminCategoriesScreen.tsx`, `src/modules/admin/screen/AdminFeedbacksScreen.tsx`, `src/modules/admin/screen/AdminOcrManagementScreen.tsx`, `src/modules/admin/screen/AdminSettingsScreen.tsx`, `src/modules/admin/screen/AdminUserManagementScreen.tsx`.
- **App (`frontend-app`):** `app.json`, `App.tsx`, `src/components/StatCard.tsx`, `src/components/FloatingChatIcons.tsx`, `src/modules/core/components/AppDatePicker.tsx`, `src/modules/core/components/AppDateTimePicker.tsx`, `src/modules/core/components/DateRangePicker.tsx`, `src/modules/dashboard/screen/HomeScreen.tsx`, `src/modules/dashboard/components/HomeHeader.tsx`, `src/modules/dashboard/components/BudgetCard.tsx`, `src/modules/auth/components/ForgotPasswordModal.tsx`, `src/modules/onboarding/components/CompleteProfileModal.tsx`, `src/modules/add-transaction/screen/AddTransactionScreen.tsx`, `src/modules/accounts/screen/AccountsScreen.tsx`, `src/modules/budget/screen/BudgetScreen.tsx`, `src/modules/balance-forecast/screen/BalanceForecastScreen.tsx`, `src/modules/ai-assistant/screen/AiAssistantScreen.tsx`, `src/modules/scan-invoice/screen/ScanInvoiceScreen.tsx`, `src/modules/group/screen/GroupScreen.tsx`, `src/modules/group/components/kid-wallet/ChildWalletDetailModal.tsx`, `src/modules/child-wallet/screen/ChildMoneyRequestsScreen.tsx`, `src/modules/profile/screen/SecurityScreen.tsx`, `src/modules/profile/screen/SystemSettingsScreen.tsx`.

### 5. Rủi ro còn lại
1. **Chưa kiểm thử trên trình duyệt thực tế & thiết bị thật (Web/Android/iOS):** Cần mở `http://localhost:1116` trên Chrome/Edge DevTools (`375px` & `1440px`, Light/Dark) và chạy Expo Go / Dev Client trên Android + iOS thật để xác nhận trực quan và tương tác bàn phím/cử chỉ Back.
2. **Backend Feedback Enum:** `SendFeedbackRequest` vẫn dùng `FEATURE`/`QUESTION`/`OTHER` trong khi `AdminFeedbackItem` ghi `FEATURE_REQUEST`/`GENERAL`/`PAYMENT` — hiện Frontend Admin đã hỗ trợ cả 2 bộ nhưng nên chuẩn hóa ở Backend trong đợt nâng cấp API riêng.
3. **Các file nguyên khối (`DEFERRED`):** `GroupManagementScreen.tsx` (7,245 dòng) và `GroupScreen.tsx` (6,294 dòng) vẫn cần tách component + `FlatList` ở một đợt refactor có test E2E đi kèm.

