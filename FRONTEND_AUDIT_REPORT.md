# BÁO CÁO FULL FRONTEND AUDIT — HỆ THỐNG FINORA

**Chuẩn đánh giá:** Impeccable v4.10.0 (`SKILL.md`, `audit.md` cho Web, `audit.native.md` + `ios.md` + `android.md` cho Native)  
**Phạm vi:** `frontend-web` (React 19 + Vite 8 + Tailwind CSS v4) & `frontend-app` (React Native 0.88 + Expo SDK 58)  
**Chế độ thực hiện:** Read-Only Audit (chưa chỉnh sửa bất kỳ dòng source code nào)  
**Ngày lập báo cáo:** 25/11/2026

---

## 1. TỔNG QUAN PHẠM VI & THỐNG KÊ KIỂM TRA

### 1.1. Tổng số file, màn hình và component đã kiểm tra mã nguồn (100% Coverage)

| Nền tảng | Tổng số file mã nguồn (`.ts`, `.tsx`, `.css`) | Số lượng màn hình (`*/screen/*.tsx`) | Số lượng component (`*/components/*.tsx`) | Trạng thái kiểm tra code |
|---|---:|---:|---:|---|
| **`frontend-web`** | 127 files | **41** màn hình | **30** component | Đã kiểm tra 100% |
| **`frontend-app`** | 147 files | **36** màn hình | **37** component | Đã kiểm tra 100% |
| **Tổng cộng** | **274 files** | **77 màn hình** | **67 component** | **144 UI units đã kiểm tra** |

*(Ghi chú: Trong `frontend-app/src/modules/goals/screen/` có 6 modal đặt trong thư mục `screen/` cũng đã được kiểm tra đầy đủ; trong `frontend-web`, `AdminPlaceholderScreen.tsx`, `OnboardingWizardModal.tsx`, `UserDropdown.tsx`, `PrivacyPolicyModal.tsx` là các file legacy/placeholder chưa gắn route hoặc không còn được sử dụng).*

### 1.2. Danh sách màn hình & môi trường CHƯA THỂ kiểm tra giao diện render thực tế và nguyên nhân

| Hạng mục / Màn hình | Môi trường chưa kiểm tra | Nguyên nhân cụ thể | Bằng chứng thay thế đã dùng |
|---|---|---|---|
| **Toàn bộ 41 màn hình `frontend-web`** (trừ ảnh mobile Landing Page) | Chrome DevTools (`1440×900`, `768×1024`, `375×812`, Dark/Light live DOM & Contrast) | `chrome_devtools` MCP không kết nối được do thiếu `DevToolsActivePort` tại `C:\Users\ADMIN\AppData\Local\Google\Chrome\User Data\DevToolsActivePort` (`ENOENT`). Ngoài ra `impeccable.cmd` không tải được engine `0.1.27` do giới hạn quyền ghi cache `C:\Users\ADMIN\.impeccable\bin\0.1.27`. | Kiểm tra tĩnh 100% mã nguồn `.tsx`/`.css`, CSS tokens + 3 ảnh chụp thực tế trên điện thoại do người dùng cung cấp (`LandingScreen`). |
| **Toàn bộ 36 màn hình `frontend-app`** | iOS Simulator (`xcrun simctl`) & Android Emulator (`adb screencap`, `font_scale 1.3`, `uimode night yes`, Gesture/Keyboard thực tế) | Môi trường Windows sandbox hiện tại không có iOS Simulator (yêu cầu macOS) và không có Android Emulator đang chạy kết nối qua ADB. | Kiểm tra tĩnh 100% mã nguồn React Native, `app.json`, `ThemeContext.tsx`, `StyleSheet`, `Modal`, `KeyboardAvoidingView`, `SafeArea`. |

> **Nguyên tắc trung thực:** Các màn hình chưa chạy render live trên thiết bị thật/Chrome DevTools **không được tuyên bố PASS** về pixel contrast, font scaling `1.3x` thực tế hay animation 60/120fps. Các lỗi dưới đây đều có bằng chứng xác thực trực tiếp từ mã nguồn và ảnh chụp màn hình thực tế.

---

## 2. ĐÁNH GIÁ CHẤT LƯỢNG TỔNG QUAN & TỪNG MODULE

### 2.1. Điểm tổng hợp theo Impeccable Rubric (Thang 20 điểm)

| Nền tảng | Accessibility | Performance | Theming / Appearance | Responsive / Conformance | Implementation Integrity / Adaptivity | **Tổng điểm** | **Xếp hạng** |
|---|---:|---:|---:|---:|---:|---:|---|
| **`frontend-web`** | 1.5 / 4 | 2.0 / 4 | 2.0 / 4 | 2.0 / 4 | 2.0 / 4 | **9.5 / 20** | **Poor (Cần đại tu trọng điểm)** |
| **`frontend-app`** | 1.0 / 4 | 1.0 / 4 | 2.0 / 4 | 2.0 / 4 | 1.0 / 4 | **7.0 / 20** | **Poor (Cần đại tu trọng điểm)** |

**Kết luận Platform Conformance (`frontend-app`):** **FAIL.** Ứng dụng hiện hoạt động giống một SPA chuyển trạng thái bằng `if/return` trong `App.tsx` hơn là ứng dụng native iOS/Android: không có stack navigation gốc (0 `BackHandler`, không có edge-swipe back trên iOS), `app.json` khóa `"userInterfaceStyle": "light"`, khóa `"orientation": "portrait"` dù bật `"supportsTablet": true`, và tắt `"predictiveBackGestureEnabled": false`.

### 2.2. Điểm chất lượng chi tiết theo từng Module

| Module | `frontend-web` (/20) | `frontend-app` (/20) | Điểm nghẽn chính |
|---|---:|---:|---|
| **Core, Theme & Navigation** | 12/20 | 8/20 | Web: `index.css` khai báo `:root` 2 lần, `DateRangePicker`/`NotificationDropdown` tràn ngang 375px. App: Không có `BackHandler`/Stack Nav, `theme.ts` thừa gây phân mảnh. |
| **Auth, Landing & Legal** | 9/20 | 10/20 | Web: `LandingScreen.css` vỡ nặng trên mobile 375px; FAQ/Modal thiếu ARIA & Escape. App: `ForgotPasswordModal`, `ForgotPasswordScreen`, `LegalTermsModal` vỡ/thiếu Dark Mode; `RegisterScreen` input cao 36pt. |
| **Onboarding & Walkthrough** | 10/20 | 9/20 | Web: `FinoraOnboardingWalkthrough` Step 7 hardcode màu sáng; còn file legacy `OnboardingWizardModal`. App: `CompleteProfileModal` & `FinoraOnboardingWalkthrough` không có Dark Mode; `SplashScreen` chặn `maxFontSizeMultiplier` < 1.3. |
| **Dashboard / Home** | 12/20 | 11/20 | Web: Chart tooltip chỉ hiện khi `hover`, thiếu skeleton. App: `HomeScreen` nuốt lỗi API (`catch {}`) hiện `0 đ`; `BudgetCard` cố định `height: 108` dễ cắt chữ khi phóng to font. |
| **Accounts, Add Tx & Cash Flow** | 11/20 | 9/20 | Web: Dropdown lọc nền trắng trong Dark Mode; bảng/row `onClick` thiếu keyboard. App: 9 `<Modal>` thiếu `onRequestClose`; `TransactionsScreen` (3,426 dòng) dùng `ScrollView + .map()`. |
| **Budget, Goals & Debts** | 8/20 | 9/20 | Web: `GoalsManagementScreen` dùng `dark:bg-slate-850` không tồn tại → nền trắng chữ trắng; `BudgetAndGoalsScreen` không có Dark Mode. App: `DebtScreen` (4,375 dòng) dùng `ScrollView + .map()`; `KeyboardAvoidingView` tắt trên Android. |
| **Reminders, Reports, Forecast & Analysis** | 10/20 | 8/20 | Web: `FinancialReportScreen` không có Dark Mode; `FinancialForecastScreen` & `SpendingAnalysisScreen` nuốt lỗi khi `Promise.allSettled` fail. App: `BalanceForecastScreen` có text dự báo giả hardcode (`17.150.048 VND`); `PeriodicReportsScreen` thiếu `onRequestClose`. |
| **AI Assistant & Invoice OCR** | 12/20 | 9/20 | Web: `AIAssistantScreen` hiện raw `**...**` ở câu chào; `InvoiceOcrScreen` dùng `window.confirm()`. App: `AiAssistantScreen` & `FloatingChatIcons` dùng `ScrollView + .map()`, polling 4s toàn bộ nhóm; `ScanInvoiceScreen` có `Animated.loop` không cleanup & thiếu `onRequestClose`. |
| **Group & Child Wallet** | 7/20 | 6/20 | Web: `GroupManagementScreen.tsx` (7,245 dòng, 163 state), `dark:bg-slate-850`, bảng `table-fixed` bị bóp nát trên 375px; `ChildCashFlowScreen` treo loading vĩnh viễn khi thiếu ID. App: `GroupScreen.tsx` (6,294 dòng), 6 nested `<Modal>` trong `ChildWalletDetailModal` (rủi ro treo iOS), 6 `<Modal>` thiếu `onRequestClose`. |
| **Profile, Settings, Feedback & Notifications** | 11/20 | 10/20 | Web: `UserAvatar` dùng `window.location.href` gây reload trang; `ChangePasswordModal` chỉ check pass >= 6 ký tự; `NotificationScreen` bóp 3 cột trên mobile. App: `SystemSettingsScreen` thiếu `onRequestClose`; `NotificationsScreen` render `.map()` trong `FlatList`; `StatusBar` dùng lẫn lộn RN & Expo. |
| **Admin Portal (13 màn hình)** | 9/20 | *N/A* | Lỗi crash `.toLowerCase()` khi field `null`; lệch enum `category` với User Feedback; `dark:bg-slate-850` ở 6 bảng; dùng `window.alert()`; sửa `fullName` user không được gửi lên API. |

---

## 3. DANH SÁCH LỖI CHI TIẾT THEO MỨC ĐỘ NGHIÊM TRỌNG

### A. CRITICAL (P0 — Chặn luồng / Crash / Vỡ nghiêm trọng)

#### [P0-01] `LandingScreen` vỡ layout nặng trên trình duyệt Mobile (`375px`–`390px`)
- **Vị trí:** [`LandingScreen.css`](file:///d:/DATN/frontend-web/src/modules/auth/screen/LandingScreen.css#L1015-L1021), [`LandingScreen.css`](file:///d:/DATN/frontend-web/src/modules/auth/screen/LandingScreen.css#L1432-L1440), [`LandingScreen.css`](file:///d:/DATN/frontend-web/src/modules/auth/screen/LandingScreen.css#L1824-L1868)
- **Bằng chứng:**
  - Ảnh chụp thực tế người dùng cung cấp (`media_1795533732521_c0fa6058.jpg`, `media_1795533744312_0627f439.jpg`):
    1. Thẻ **Tài chính nhóm** & **Ví trẻ em**: Chữ bị ép thành từng cột dọc 1 chữ/dòng (`"Tài / chính / nhóm"`, `"Phòng / trọ"`), thẻ **Ví trẻ em** bị cắt cụt tràn ra khỏi mép phải (`"Giúp trẻ hình thà..."`, `"Nhiệm vụ nhậ..."`).
    2. Header Mobile: Hai nút `"Đăng nhập"` và `"Đăng ký"` bị rớt thành 2 dòng trong nút vuông.
  - Code CSS (`.highlight-card-head` dòng 1017): `grid-template-columns: 190px 1fr; gap: 22px;` không hề có rule chuyển về `1fr` trong `@media (max-width: 768px)`. Cộng thêm `.landing-content-container` giữ `padding: 0 40px` trên mobile khiến chiều rộng cột chữ chỉ còn ~35–75px. `.faq-title-row` đặt cạnh `.faq-icon-3d-box` (`175px`) và `.why-finora-grid` giữ 2 cột dưới 768px cũng gây chật/tràn.
- **Nguyên nhân & Ảnh hưởng:** Thiếu breakpoint `@media (max-width: 768px)` / `@media (max-width: 640px)`. Người dùng mở web trên điện thoại thấy giao diện hỏng ngay tại trang chủ (Persuade mode).
- **Phương án khắc phục:** Ở `@media (max-width: 768px)`: giảm padding container xuống `0 16px`; chuyển `.highlight-card-head` sang `grid-template-columns: 1fr` (ảnh trên, nội dung dưới, căn giữa); thêm `white-space: nowrap` + padding gọn cho `.nav-cta-btn`; xếp dọc `.faq-title-row` và `.why-finora-grid { grid-template-columns: 1fr }`.

#### [P0-02] 6 `<Modal>` lồng nhau bên trong `<Modal>` cha ở `ChildWalletDetailModal` (Rủi ro treo UI trên iOS)
- **Vị trí:** [`ChildWalletDetailModal.tsx`](file:///d:/DATN/frontend-app/src/modules/group/components/kid-wallet/ChildWalletDetailModal.tsx#L492), các dòng [`1554`](file:///d:/DATN/frontend-app/src/modules/group/components/kid-wallet/ChildWalletDetailModal.tsx#L1554), [`1649`](file:///d:/DATN/frontend-app/src/modules/group/components/kid-wallet/ChildWalletDetailModal.tsx#L1649), [`1702`](file:///d:/DATN/frontend-app/src/modules/group/components/kid-wallet/ChildWalletDetailModal.tsx#L1702), [`1858`](file:///d:/DATN/frontend-app/src/modules/group/components/kid-wallet/ChildWalletDetailModal.tsx#L1858), [`1939`](file:///d:/DATN/frontend-app/src/modules/group/components/kid-wallet/ChildWalletDetailModal.tsx#L1939), [`2014`](file:///d:/DATN/frontend-app/src/modules/group/components/kid-wallet/ChildWalletDetailModal.tsx#L2014)
- **Bằng chứng:** Bên trong `<Modal visible={visible}>` (L492) có 6 `<Modal visible={true}>` con (`approvingReq`, `rejectingReq`, `isCreateChoreOpen`, `isCreateSpendOpen`, `showAccountPickerModal`, `isResetPassModalOpen`).
- **Nguyên nhân & Ảnh hưởng:** UIKit trên iOS (`RCTModalHostViewController`) xung đột khi present một Native Modal mới đè lên Modal đang mở, có thể làm modal con không hiện hoặc đóng băng toàn bộ cảm ứng màn hình.
- **Phương án khắc phục:** Thay 6 Modal con bằng overlay `View` (`StyleSheet.absoluteFillObject`) render bên trong Modal cha, hoặc đưa lên tầng `GroupScreen`.

#### [P0-03] Không xử lý nút Back phần cứng Android (`BackHandler` = 0) & 20+ `<Modal>` thiếu `onRequestClose`
- **Vị trí:**
  - Root App & Setting: [`App.tsx`](file:///d:/DATN/frontend-app/App.tsx#L126-L460), [`app.json`](file:///d:/DATN/frontend-app/app.json#L23) (`"predictiveBackGestureEnabled": false`)
  - 20 `<Modal>` thiếu `onRequestClose` hoặc để trống `() => {}`: [`FloatingChatIcons.tsx`](file:///d:/DATN/frontend-app/src/components/FloatingChatIcons.tsx#L1886), [`ChildMoneyRequestsScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/child-wallet/screen/ChildMoneyRequestsScreen.tsx#L477), [`SystemSettingsScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/profile/screen/SystemSettingsScreen.tsx#L291), [`OnboardingWizardModal.tsx`](file:///d:/DATN/frontend-app/src/modules/onboarding/components/OnboardingWizardModal.tsx#L163), [`GroupScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/group/screen/GroupScreen.tsx#L3719) (+5 modal khác: 4186, 4248, 4311, 5455, 5576), [`AccountsScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/accounts/screen/AccountsScreen.tsx#L622) (622, 793, 908), [`AddTransactionScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/add-transaction/screen/AddTransactionScreen.tsx#L898) (898, 956, 1021), [`TransactionsScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/transactions/screen/TransactionsScreen.tsx#L1217) (1217, 1283, 1423), [`PeriodicReportsScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/periodic-reports/screen/PeriodicReportsScreen.tsx#L446) (446, 554, 592), [`ScanInvoiceScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/scan-invoice/screen/ScanInvoiceScreen.tsx#L1248) (1248, 1301, 1350).
- **Nguyên nhân & Ảnh hưởng:** `App.tsx` điều hướng màn hình bằng `if (showX) return ...` không dùng Navigation Stack; ấn nút Back trên Android sẽ thoát thẳng app thay vì quay lại màn trước, hoặc bị kẹt trong Modal không đóng được.
- **Phương án khắc phục:** Bổ sung `onRequestClose` cho toàn bộ `<Modal>`; cài đặt `BackHandler` stack tập trung trong `App.tsx` (hoặc chuyển sang React Navigation Native Stack) và bật `predictiveBackGestureEnabled: true` trong `app.json`.

#### [P0-04] Crash ứng dụng Admin khi tìm kiếm bản ghi có trường `null`
- **Vị trí:** [`AdminOcrManagementScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/admin/screen/AdminOcrManagementScreen.tsx#L62-L64), [`AdminFeedbacksScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/admin/screen/AdminFeedbacksScreen.tsx#L91-L94), [`AdminAuditLogsScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/admin/screen/AdminAuditLogsScreen.tsx#L50-L54)
- **Bằng chứng:** Gọi trực tiếp `r.merchantName.toLowerCase()`, `r.userFullName.toLowerCase()`, `fb.title.toLowerCase()`, `l.description.toLowerCase()` không có null-check.
- **Ảnh hưởng:** Gõ vào ô tìm kiếm sẽ văng lỗi `TypeError: Cannot read properties of null (reading 'toLowerCase')` làm trắng màn hình Admin.
- **Phương án khắc phục:** Dùng `(field ?? '').toLowerCase().includes(q)`.

#### [P0-05] Class Tailwind không tồn tại `dark:bg-slate-850` / `dark:border-slate-750` làm chữ trắng trên nền trắng ở Dark Mode
- **Vị trí:**
  - [`GoalsManagementScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/budget-goals/screen/GoalsManagementScreen.tsx#L754) (và L646, 671, 688, 730, 829)
  - [`GroupManagementScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/group/screen/GroupManagementScreen.tsx#L2207) (và L2312, 2379, 2706, 2832, 2865, 3013, 3900, 4547, 5617, 6734, 7025)
  - Các bảng Admin: [`AdminUserManagementScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/admin/screen/AdminUserManagementScreen.tsx#L219), [`AdminCategoriesScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/admin/screen/AdminCategoriesScreen.tsx#L198), [`AdminOcrManagementScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/admin/screen/AdminOcrManagementScreen.tsx#L217), [`AdminFeedbacksScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/admin/screen/AdminFeedbacksScreen.tsx#L253), [`AdminBroadcastScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/admin/screen/AdminBroadcastScreen.tsx#L381), [`AdminAuditLogsScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/admin/screen/AdminAuditLogsScreen.tsx#L126)
- **Nguyên nhân & Ảnh hưởng:** `@theme` trong [`index.css`](file:///d:/DATN/frontend-web/src/index.css#L39-L41) không định nghĩa `slate-850`/`slate-750`, nên Tailwind không sinh CSS. Trong Dark Mode, card vẫn giữ `bg-white` nhưng chữ đổi sang `dark:text-white`, gây mất hoàn toàn khả năng đọc.
- **Phương án khắc phục:** Thay toàn bộ `dark:bg-slate-850` bằng `dark:bg-[#111827]` hoặc `dark:bg-slate-900`, và `dark:border-slate-750` bằng `dark:border-slate-700`.

#### [P0-06] Lệch Enum danh mục giữa User Feedback và Admin Feedbacks
- **Vị trí:** [`UserFeedbackScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/feedback/screen/UserFeedbackScreen.tsx#L52) vs [`AdminFeedbacksScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/admin/screen/AdminFeedbacksScreen.tsx#L225-L228)
- **Bằng chứng:** User gửi `'QUESTION' | 'BUG' | 'FEATURE' | 'OTHER'`, trong khi Admin lọc theo `'BUG' | 'FEATURE_REQUEST' | 'PAYMENT' | 'GENERAL'`.
- **Ảnh hưởng:** Bộ lọc của Admin không bao giờ tìm thấy góp ý `FEATURE` hoặc `QUESTION` từ người dùng và hiển thị sai nhãn thành `'Khác'`.
- **Phương án khắc phục:** Đồng bộ constant `FeedbackCategory` dùng chung giữa `feedbackApi.ts`, `UserFeedbackScreen.tsx`, và `AdminFeedbacksScreen.tsx`.

#### [P0-07] Lỗi nghiệp vụ/UI: Màn hình trắng khi sai route, treo loading ví bé, và dữ liệu dự báo giả hardcode
- **Màn hình trắng trên Web:** [`AppScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/app/screen/AppScreen.tsx#L293-L321) thiếu `<Route path="*" element={<Navigate to="/dashboard" replace />} />` cho user thường (vào `/admin` hoặc sai URL bị trang trắng).
- **Treo loading vĩnh viễn:** [`ChildCashFlowScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/child-wallet/screen/ChildCashFlowScreen.tsx#L11-L17) `return` sớm khi thiếu `childWalletGroupId`/`childWalletId` mà không gọi `setLoading(false)`.
- **Dữ liệu giả trên App:** [`BalanceForecastScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/balance-forecast/screen/BalanceForecastScreen.tsx#L270) hardcode chuỗi `'Dự báo số dư đến ngày 25/11/2026: 17.150.048 VND...'` làm fallback khi AI summary rỗng.
- **Phương án khắc phục:** Thêm fallback route `/dashboard`; set `setLoading(false)` trước khi return; thay chuỗi dự báo giả bằng empty state trung thực.

---

### B. HIGH (P1 — Ảnh hưởng lớn đến trải nghiệm, Dark Mode, Mobile hoặc Hiệu năng)

#### [P1-01] `app.json` khóa Light Mode & Orientation dù bật `supportsTablet`
- **Vị trí:** [`app.json`](file:///d:/DATN/frontend-app/app.json#L7-L11) (`"userInterfaceStyle": "light"`, `"orientation": "portrait"`, `"softwareKeyboardLayoutMode": "pan"`).
- **Ảnh hưởng:** Các dialog/picker hệ thống (`DateTimePicker`, `Alert`, bàn phím) luôn ở Light Mode ngay cả khi app bật Dark Mode; tablet/iPad bị khóa xoay dọc.
- **Phương án khắc phục:** Đổi `"userInterfaceStyle": "automatic"`, cân nhắc `"softwareKeyboardLayoutMode": "resize"` và hỗ trợ xoay/adaptive layout.

#### [P1-02] Nhiều màn hình/Modal hoàn toàn thiếu hoặc vỡ Dark Mode (Web & App)
- **Web (0 class `dark:`):** [`BudgetAndGoalsScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/budget-goals/screen/BudgetAndGoalsScreen.tsx#L51), [`FinancialReportScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/financial-reports/screen/FinancialReportScreen.tsx#L53), [`ChildCashFlowScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/child-wallet/screen/ChildCashFlowScreen.tsx#L22), dropdown lọc nền trắng tại [`BudgetManagementScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/budget-management/screen/BudgetManagementScreen.tsx#L661) & [`CashFlowManagementScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/cash-flow-management/screen/CashFlowManagementScreen.tsx#L996), plus [`DashboardHeaderSection.tsx`](file:///d:/DATN/frontend-web/src/modules/core/components/DashboardHeaderSection.tsx#L87), [`FinoraOnboardingWalkthrough.tsx`](file:///d:/DATN/frontend-web/src/modules/onboarding/components/FinoraOnboardingWalkthrough.tsx#L367), [`LegalTermsModal.tsx`](file:///d:/DATN/frontend-web/src/modules/legal/components/LegalTermsModal.tsx#L50), [`index.css`](file:///d:/DATN/frontend-web/src/index.css#L143-L156) (scrollbar).
- **App (thiếu/sai `useAppTheme()`):** [`ForgotPasswordModal.tsx`](file:///d:/DATN/frontend-app/src/modules/auth/components/ForgotPasswordModal.tsx#L258), `ForgotPasswordScreen.tsx`, `CompleteProfileModal.tsx`, `FinoraOnboardingWalkthrough.tsx`, `LegalTermsModal.tsx`, [`StatCard.tsx`](file:///d:/DATN/frontend-app/src/components/StatCard.tsx#L17), [`App.tsx`](file:///d:/DATN/frontend-app/App.tsx#L219), [`AppDatePicker.tsx`](file:///d:/DATN/frontend-app/src/modules/core/components/AppDatePicker.tsx#L42), [`AccountBadge.tsx`](file:///d:/DATN/frontend-app/src/modules/accounts/components/AccountBadge.tsx#L10), [`GroupScreen.styles.ts`](file:///d:/DATN/frontend-app/src/modules/group/screen/GroupScreen.styles.ts#L3133-L3143) (`detailEmptyTitle` `#1E293B` chữ tối trên nền tối).
- **Phương án khắc phục:** Dùng CSS variables / `dark:` (Web) và `useAppTheme()` (App) đồng nhất trên toàn bộ màn hình và modal.

#### [P1-03] Tràn ngang & vỡ layout trên Mobile `375px` (Web)
- **Vị trí:**
  - [`DateRangePicker.tsx`](file:///d:/DATN/frontend-web/src/modules/core/components/DateRangePicker.tsx#L108-L115): Render `numberOfMonths={2}` (~500px) tràn khỏi màn 375px.
  - [`NotificationDropdown.css`](file:///d:/DATN/frontend-web/src/modules/notification/components/NotificationDropdown.css#L73-L78): Panel `width: 390px` gắn `right: 0` vào nút chuông ở giữa header, bị tràn quá mép trái màn hình ~41px.
  - [`DashboardHeaderSection.tsx`](file:///d:/DATN/frontend-web/src/modules/core/components/DashboardHeaderSection.tsx#L55) & [`AdminLayout.tsx`](file:///d:/DATN/frontend-web/src/modules/admin/components/AdminLayout.tsx#L206): Flex container bên trái thiếu `min-w-0` đẩy nút actions ra ngoài.
  - [`GroupManagementScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/group/screen/GroupManagementScreen.tsx#L3389-L3402): Bảng giao dịch nhóm dùng `table-fixed` 6 cột không có `min-w-[820px]`, bóp méo chữ trên mobile.
  - [`AdminAnalyticsScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/admin/screen/AdminAnalyticsScreen.tsx#L189-L222): Biểu đồ 14 ngày `whitespace-nowrap` không có `overflow-x-auto`.
  - [`NotificationScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/notification/screen/NotificationScreen.tsx#L241): `grid-cols-3` trên 375px làm thẻ KPI quá hẹp.
- **Phương án khắc phục:** Thêm `numberOfMonths={isMobile ? 1 : 2}`, fixed full-width dropdown trên mobile, `min-w-0 flex-1`, `min-w-[820px]` cho bảng, và `grid-cols-1 sm:grid-cols-3`.

#### [P1-04] Kiến trúc màn hình nguyên khối (Monolithic) & Danh sách dài không ảo hóa (Web + App)
- **Web:** [`GroupManagementScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/group/screen/GroupManagementScreen.tsx) (**7,245 dòng, 163 `useState`, 0 `useCallback`**); [`FinancialReportsDashboardScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/financial-reports/screen/FinancialReportsDashboardScreen.tsx) (2,224 dòng); [`CashFlowManagementScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/cash-flow-management/screen/CashFlowManagementScreen.tsx) (2,175 dòng); [`AppScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/app/screen/AppScreen.tsx#L3-L49) import tĩnh toàn bộ 35+ màn hình (không có `React.lazy`).
- **App:** [`GroupScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/group/screen/GroupScreen.tsx) (**6,294 dòng**, Chat render `<ScrollView>` + `.map()`); [`DebtScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/debts/screen/DebtScreen.tsx) (4,375 dòng); [`RemindersScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/reminders/screen/RemindersScreen.tsx) (3,706 dòng); [`TransactionsScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/transactions/screen/TransactionsScreen.tsx) (3,426 dòng); [`AiAssistantScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/ai-assistant/screen/AiAssistantScreen.tsx#L524-L585), [`FloatingChatIcons.tsx`](file:///d:/DATN/frontend-app/src/components/FloatingChatIcons.tsx#L375-L428) (vừa `ScrollView + .map()`, vừa poll N+1 tất cả các nhóm mỗi 4 giây).
- **Ảnh hưởng:** Tải bundle Web ban đầu nặng; trên App gây giật khung hình, tốn RAM và lag khi gõ phím hoặc cuộn danh sách dài.
- **Phương án khắc phục:** Tách module con + `React.lazy()` trên Web; chuyển toàn bộ danh sách chat/giao dịch/nợ/nhắc nhở trên App sang `FlatList` / `SectionList`; bỏ polling N+1 khi popup chat đang đóng.

#### [P1-05] `KeyboardAvoidingView` vô hiệu hóa trên Android (`behavior={undefined}`)
- **Vị trí:** [`GroupScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/group/screen/GroupScreen.tsx#L1557), [`AiAssistantScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/ai-assistant/screen/AiAssistantScreen.tsx#L409), [`AddTransactionScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/add-transaction/screen/AddTransactionScreen.tsx#L438), [`ForgotPasswordModal.tsx`](file:///d:/DATN/frontend-app/src/modules/auth/components/ForgotPasswordModal.tsx#L197), [`ChildMoneyRequestsScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/child-wallet/screen/ChildMoneyRequestsScreen.tsx#L477) (thiếu hoàn toàn), `AccountsScreen.tsx`, `BudgetScreen.tsx`, `SecurityScreen.tsx`.
- **Ảnh hưởng:** Bàn phím ảo Android che khuất ô nhập liệu / thanh chat trong modal.
- **Phương án khắc phục:** Dùng `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` kết hợp `ScrollView keyboardShouldPersistTaps="handled"`.

#### [P1-06] Thiếu Accessibility diện rộng (Web WCAG AA & Native VoiceOver/TalkBack)
- **Web:** Hàng chục thẻ/dòng `<div onClick>` / `<tr onClick>` (riêng `GroupManagementScreen.tsx` có 52 thẻ div clickable), toàn bộ Modal thiếu `role="dialog" aria-modal="true"` và phím `Escape`, nhiều nút icon thiếu `aria-label`, `AdminSettingsScreen.tsx:288` tắt `focus:outline-none`.
- **App:** Tỷ lệ dùng `accessibilityLabel` / `accessibilityRole` gần như bằng `0` ở các màn hình chính (`GroupScreen`, `DebtScreen`, `TransactionsScreen`, `AccountsScreen`, `AiAssistantScreen`, `FloatingChatIcons`, `ChildWalletScreen`).
- **Phương án khắc phục:** Chuẩn hóa `<button>`/`role="button"`/`aria-label`/Modal Escape trên Web và `accessibilityRole` + `accessibilityLabel` trên App.

#### [P1-07] Vùng chạm (Touch Target) dưới chuẩn 44pt (iOS) / 48dp (Android) & 44px (Web)
- **App:** [`FloatingChatIcons.tsx`](file:///d:/DATN/frontend-app/src/components/FloatingChatIcons.tsx#L2046-L2434) (các nút `28x28`, `30x30`), [`RegisterScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/auth/screen/RegisterScreen.tsx#L127) (`inputHeight >= 36`), [`ForgotPasswordModal.tsx`](file:///d:/DATN/frontend-app/src/modules/auth/components/ForgotPasswordModal.tsx#L562) (`closeBtn 28x28`), [`NotificationSettingsScreen.tsx`](file:///d:/DATN/frontend-app/src/modules/profile/screen/NotificationSettingsScreen.tsx#L426) (`38x38`), `AiAssistantScreen.tsx` (`36x36`, `38x38`).
- **Web:** [`DashboardScreen.tsx`](file:///d:/DATN/frontend-web/src/modules/dashboard/screen/DashboardScreen.tsx#L396-L403) (~16x16px), `GoalsManagementScreen.tsx:769` (~24x24px), `MiniAIChatWidget.css:77` (`28x28px`).
- **Phương án khắc phục:** Tăng kích thước tối thiểu `44×44` hoặc bổ sung `hitSlop` đủ đạt chuẩn.

#### [P1-08] Nuốt lỗi mạng/API & Nút bấm/Picker lỗi
- **Nuốt lỗi API:** App `HomeScreen.tsx:209` (`catch {}` hiện `0 đ`); Web `FinancialForecastScreen.tsx:44` & `SpendingAnalysisScreen.tsx:94` dùng `Promise.allSettled` không báo lỗi khi tất cả API reject.
- **Native `window.confirm()`:** `InvoiceOcrScreen.tsx:310` dùng `confirm(...)` thay cho `ConfirmDeleteModal`.
- **Picker/Form lỗi trên App:** `AppDateTimePicker.tsx:41` & `DateRangePicker.tsx:39` không đồng bộ `useState` khi prop thay đổi; `FloatingChatIcons.tsx:1508` có nút emoji `onPress={() => {}}`; `CompleteProfileModal.tsx:95` vẫn dùng `ImagePicker.MediaTypeOptions.Images` (deprecated).

---

### C. MEDIUM (P2 — Bất cập giao diện, Safe Area, Token, Nhất quán)

1. **[P2-01] Safe Area Bottom Inset hardcode trên App:** `CompleteProfileModal.tsx:517`, `LegalTermsModal.tsx:208`, `AppDatePicker.tsx:240`, `AppDateTimePicker.tsx:247`, `DateRangePicker.tsx:188`, `ChildChoresScreen.tsx:762` hardcode `paddingBottom: 20–40` thay vì `useSafeAreaInsets().bottom`; `SplashScreen.tsx:184` bỏ qua `'bottom'`.
2. **[P2-02] Dùng `Dimensions.get('window')` tĩnh & chiều cao cố định trên App:** `BudgetCard.tsx:19` (`height: 108` cắt chữ khi scale font), `QuickActionsGrid.tsx:216` (kéo dãn trên tablet), `AboutFinoraScreen.tsx:22`, `BudgetScreen.tsx`, `GroupScreen.tsx`, `RemindersScreen.tsx` không tự cập nhật khi xoay màn hình / Split View.
3. **[P2-03] Lỗi font-scale & Reduce Motion bị bỏ qua (App):** `SplashScreen.tsx` khóa `maxFontSizeMultiplier={1.15}`; `SplashScreen.tsx` & `ScanInvoiceScreen.tsx:136` chạy `Animated.loop` không kiểm tra `AccessibilityInfo.isReduceMotionEnabled()` và không `.stop()` khi unmount.
4. **[P2-04] Không nhất quán đơn vị tiền tệ (`₫` vs `đ` vs `VNĐ`):** `DashboardScreen`, `ChildCashFlowScreen`, `ScanInvoiceScreen` dùng `₫`; `BudgetManagementScreen`, `HomeScreen`, `ChildWalletScreen` dùng `đ`; `FinancialReportsDashboardScreen` dùng `VNĐ`.
5. **[P2-05] Rò rỉ timer, thiếu `.catch()`, và bypass SPA router (Web):** `RegisterModal.tsx:35` & `ForgotPasswordModal.tsx:96` thiếu cleanup timer; `AppScreen.tsx:368` thiếu `.catch()`; `UserAvatar.tsx:124,209` dùng `window.location.href` làm reload trang; `NotificationDropdown.tsx:164` poll kể cả khi tab ẩn (`document.hidden`).
6. **[P2-06] Lỗi dữ liệu & form ở Admin / Profile (Web):** `AdminUserManagementScreen.tsx:439` sửa `fullName` bằng `defaultValue` nhưng không gửi lên API; `AdminCategoriesScreen.tsx:34` thiếu UI chọn màu `formColor`; `AdminOcrManagementScreen.tsx:119` fallback `0.88` khi confidence = `0`; `AdminAIManagementScreen.tsx:150` hardcode `"HOẠT ĐỘNG"`; `AdminSettingsScreen.tsx:209` dùng `name="alert"` không tồn tại trong `FinanceIcon` (render ra icon lưới `LayoutGrid`); `CompleteProfileModal` & `ChangePasswordModal` chỉ check mật khẩu `>= 6` ký tự trong khi Register yêu cầu `>= 8` ký tự mạnh.
7. **[P2-07] Dùng `window.alert()` / `RN Alert` lẫn lộn:** Admin Web (`AdminUserManagementScreen`, `AdminCategoriesScreen`, `AdminBroadcastScreen`) dùng `alert()`; App (`FloatingChatIcons`, `CompleteProfileModal`) dùng `RN Alert` thay cho `AppAlert` (`DialogContext`).
8. **[P2-08] Trùng lặp Token & CSS (`index.css` & `theme.ts`):** Web `index.css` khai báo `:root` 2 lần, `@import 'tailwindcss'` đặt sau CSS rules, `LandingScreen.css` có thuộc tính lỗi `shrink: 0;` (L454, 555, 576). App `src/theme.ts` cũ còn tồn tại song song với `ThemeContext.tsx`.

---

### D. LOW (P3 — Tinh chỉnh nội dung, copy & dọn dẹp)

1. **[P3-01] Copy tiếng Việt & hiển thị thô:** `AIAssistantScreen.tsx:426` (Web) hiển thị nguyên dấu `**...**`; `PricingScreen.tsx:93` ghi `"Tiết kiệm 15%"` dù giảm 2 tháng (~16.7%); `LegalTermsModal.tsx:41` & `PrivacyPolicyScreen.tsx:286` hiển thị `"Nhóm 3 con gián"`; `ChildWalletScreen.tsx:87` (App) ghi `"Ví của em"` trong khi các chỗ khác là `"Ví của bé"`; `LandingScreen.tsx:267` nút `"Xem video giới thiệu"` chỉ cuộn xuống `#solutions`.
2. **[P3-02] Trộn Emoji thay cho `FinanceIcon`:** `LoginModal`, `RegisterModal`, `ForgotPasswordModal`, `ChangePasswordModal`, `ProfileScreen` (Web) vẫn dùng emoji `👁️`, `🙈`, `📷`.
3. **[P3-03] Plain text loading & code thừa:** `DashboardScreen.tsx` & `ChildCashFlowScreen.tsx` dùng `"..."` / `"Đang tải..."` thay vì skeleton; 4 file legacy/unused trên Web (`AdminPlaceholderScreen`, `OnboardingWizardModal`, `UserDropdown`, `PrivacyPolicyModal`) nên dọn bỏ.

---

## 4. ĐIỂM TÍCH CỰC ĐÁNG DUY TRÌ

- **Bộ icon thống nhất (`FinanceIcon`):** Cả Web và App đều gom Lucide icons qua `FinanceIcon.tsx`, giữ đúng nhận diện thương hiệu Finora.
- **Native Pickers & Safe Area header trên App:** Các màn hình tài chính chính (`HomeScreen`, `AddTransactionScreen`, `DebtScreen`, `RemindersScreen`, `AiAssistantScreen`) áp dụng tốt `useSafeAreaInsets()` cho phần đầu màn hình, dùng `DateTimePicker` native thay vì tự vẽ lịch kiểu web.
- **Dialog System trên App:** `DialogContext.tsx` (`AppAlert`) hỗ trợ Dark Mode, loading state và giao diện thống nhất.
- **Dynamic Font Scaling ở số dư chính (`AssetSummaryCard.tsx:93-94`):** Sử dụng `adjustsFontSizeToFit` giúp số tiền lớn hàng trăm triệu/tỷ không bị cắt chữ.
- **Các modal/tab mới tách của Nhóm (`InviteMemberModal`, `DepositFundModal`, `GroupMembersTab`):** Đã chuẩn hóa `onRequestClose` và `FlatList`.

---

## 5. KẾ HOẠCH KHẮC PHỤC ĐỀ XUẤT THEO TỪNG GIAI ĐOẠN

> **Lưu ý:** Toàn bộ kế hoạch giữ nguyên nhận diện thương hiệu, bộ icon, hình ảnh và nghiệp vụ hiện tại của Finora. **Chờ phê duyệt của bạn trước khi thực thi.**

### Giai đoạn 1: Khắc phục khẩn cấp & Responsive Mobile Web (P0 — Ưu tiên cao nhất)
1. Sửa responsive `LandingScreen.css` cho mobile `375px`–`430px` (stack `.highlight-card-head`, chỉnh padding container, chống rớt dòng nút header, sửa `.why-finora-grid` và `.faq-title-row`).
2. Vá lỗi crash null-pointer tại 3 màn hình Admin (`AdminOcrManagementScreen`, `AdminFeedbacksScreen`, `AdminAuditLogsScreen`) + đồng bộ enum Feedback User/Admin + thêm fallback route `*` trong `AppScreen.tsx` + sửa treo loading `ChildCashFlowScreen.tsx`.
3. Xử lý `ChildWalletDetailModal.tsx` (bỏ 6 nested `<Modal>` trên App), bổ sung `onRequestClose` cho 20 `<Modal>` còn thiếu, và loại bỏ chuỗi dự báo giả hardcode ở `BalanceForecastScreen.tsx`.
4. Thay toàn bộ `dark:bg-slate-850` / `dark:border-slate-750` trên Web bằng token hợp lệ (`dark:bg-[#111827]`, `dark:border-slate-700`).

### Giai đoạn 2: Chuẩn hóa Dark Mode, Mobile Overflow & Keyboard/Back Native (P1)
1. **App Native Navigation & Keyboard:** Bật `userInterfaceStyle: "automatic"` và `predictiveBackGestureEnabled: true` trong `app.json`; thêm `BackHandler` stack vào `App.tsx`; sửa `KeyboardAvoidingView` Android (`behavior="height"` hoặc `softwareKeyboardLayoutMode: "resize"`).
2. **Dark Mode đồng bộ 100%:** Phủ Dark Mode cho các màn hình/dropdown bị sót trên Web (`BudgetAndGoalsScreen`, `FinancialReportScreen`, `ChildCashFlowScreen`, dropdown `BudgetManagementScreen` & `CashFlowManagementScreen`, onboarding/legal) và trên App (`ForgotPasswordModal`, `CompleteProfileModal`, `LegalTermsModal`, `AppDatePicker`, `AccountBadge`, `GroupScreen.styles.ts`).
3. **Chống tràn ngang Mobile Web:** Sửa `DateRangePicker` (1 tháng trên mobile), `NotificationDropdown` (fixed full-width trên mobile), `GroupManagementScreen` table (`min-w-[820px]`), `DashboardHeaderSection`/`AdminLayout` (`min-w-0`), `AdminAnalyticsScreen`, `NotificationScreen`.
4. **Xử lý lỗi & Trạng thái rỗng:** Thay `catch {}` / `Promise.allSettled` im lặng bằng banner lỗi + nút "Thử lại"; thay `confirm()`/`alert()` bằng `ConfirmDeleteModal`/`AppAlert`.

### Giai đoạn 3: Tối ưu Hiệu năng & A11y (P1–P2)
1. **Tách file & Ảo hóa danh sách:** Tách nhỏ `GroupManagementScreen.tsx` (7,245 dòng) và `GroupScreen.tsx` (6,294 dòng) + `DebtScreen`/`RemindersScreen`/`TransactionsScreen`; chuyển chat/giao dịch App sang `FlatList`/`SectionList`; áp dụng `React.lazy` trên Web `AppScreen.tsx`; tắt polling N+1 khi không cần thiết.
2. **Touch Target & Accessibility:** Nâng nút chạm đạt chuẩn `44×44px` (`48dp` Android), bổ sung `aria-label`, `role="dialog"`, Escape handler (Web) và `accessibilityRole`/`accessibilityLabel` (App), tôn trọng `Reduce Motion`.
3. **Safe Area & Adaptivity App:** Thay `paddingBottom` hardcode bằng `useSafeAreaInsets().bottom`, thay `Dimensions.get('window')` bằng `useWindowDimensions()`, thay `height` cố định ở `BudgetCard` bằng `minHeight`.

### Giai đoạn 4: Đồng bộ Design System & Polish (P2–P3)
1. Chuẩn hóa hàm `formatVND` dùng chung 1 ký hiệu (`₫`) trên cả Web & App; dọn `index.css` và `src/theme.ts` thừa; sửa `AdminUserManagementScreen` edit `fullName`, `AdminSettingsScreen` icon `alert`, đồng bộ rule mật khẩu `>= 8` ký tự.
2. Sửa copy thô (`**...**` ở `AIAssistantScreen`), thêm Skeleton loading, dọn 4 file legacy unused trên Web.
