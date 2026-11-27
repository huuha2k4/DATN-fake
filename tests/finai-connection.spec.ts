import { expect, test } from '@playwright/test';

const origin = process.env.FINAI_TEST_WEB_URL || 'http://127.0.0.1:5731';

test('plain FinAI messages render in full Web and mini chat without action cards', async ({ page }) => {
  await page.route('**/api/v1/finai/chat', (route) => {
    const { message } = route.request().postDataJSON();
    return route.fulfill({ json: {
      type: 'MESSAGE', conversationId: 'plain-conversation', actions: [],
      message: message === 'Bạn ăn cơm chưa?' ? 'Mình là AI nên không cần ăn cơm.' :
        'Mình hỗ trợ theo dõi chi tiêu. Mọi thay đổi cần bạn xác nhận.',
    } });
  });
  await page.goto(`${origin}/ai-assistant`);
  await page.locator('.ai-textarea').fill('Bạn ăn cơm chưa?');
  await page.locator('.ai-textarea').press('Enter');
  await expect(page.getByText('Mình là AI nên không cần ăn cơm.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận', exact: true })).toHaveCount(0);

  await page.goto(`${origin}/dashboard`);
  await page.getByRole('button', { name: 'Mở menu thao tác nhanh' }).click();
  await page.getByRole('button', { name: 'Trợ lý Finora', exact: true }).click();
  const widget = page.locator('.mini-ai-chat-window');
  const prompt = widget.getByPlaceholder('Hỏi hoặc bảo FinAI làm việc...');
  await prompt.fill('Bạn có thể giúp gì cho tôi?');
  await prompt.press('Enter');
  await expect(widget.getByText('Mình hỗ trợ theo dõi chi tiêu. Mọi thay đổi cần bạn xác nhận.')).toBeVisible();
  await expect(widget.getByRole('button', { name: 'Xác nhận', exact: true })).toHaveCount(0);
});

test('mini widget selects a draft option, confirms or cancels, and publishes successful refresh', async ({ page }) => {
  const requestBodies: Array<{ optionId?: string }> = [];
  const action = { actionId: 'widget-action', toolName: 'create_goal', title: 'Mục tiêu thử nghiệm',
    description: 'Mục tiêu thử nghiệm', preview: { entityType: 'GOAL', amount: 100000, currency: 'VND' },
    status: 'PENDING', expiresAt: new Date(Date.now() + 60000).toISOString() };
  await page.addInitScript(() => {
    localStorage.setItem('finora_theme', 'dark');
    window.addEventListener('finai:action_completed', (event) => {
      sessionStorage.setItem('completed-action', (event as CustomEvent).detail.actionId);
    });
  });
  await page.route('**/api/v1/finai/chat', async (route) => {
    const body = route.request().postDataJSON();
    requestBodies.push(body);
    if (requestBodies.length === 1) {
      await route.fulfill({ json: { type: 'CLARIFICATION', conversationId: 'widget-chat', message: 'Chọn ví',
        actions: [], clarification: { draftId: 'widget-draft', field: 'accountId', expiresAt: action.expiresAt,
          options: [{ id: 'wallet-1', label: 'Ví kiểm thử' }] } } });
    } else {
      const id = requestBodies.length === 2 ? action.actionId : 'widget-cancel';
      await route.fulfill({ json: { type: 'ACTION_REQUIRED', conversationId: 'widget-chat', message: 'Xem đề xuất',
        actions: [{ ...action, actionId: id }] } });
    }
  });
  await page.route('**/api/v1/finai/actions/*/*', async (route) => {
    const confirm = new URL(route.request().url()).pathname.endsWith('/confirm');
    await route.fulfill({ json: { ...action, actionId: confirm ? action.actionId : 'widget-cancel',
      status: confirm ? 'COMPLETED' : 'CANCELLED' } });
  });
  await page.goto(`${origin}/dashboard`);
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Mở menu thao tác nhanh' }).click();
  await page.getByRole('button', { name: 'Trợ lý Finora', exact: true }).click();
  const widget = page.locator('.mini-ai-chat-window');
  const prompt = widget.getByPlaceholder('Hỏi hoặc bảo FinAI làm việc...');
  await prompt.fill('Tạo mục tiêu thử nghiệm');
  await prompt.press('Enter');
  await widget.getByRole('button', { name: 'Ví kiểm thử' }).click();
  await widget.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('completed-action'))).toBe('widget-action');
  expect(requestBodies[1]).toMatchObject({ draftId: 'widget-draft', optionId: 'wallet-1' });
  await prompt.fill('Tạo một mục tiêu khác');
  await prompt.press('Enter');
  await widget.getByRole('button', { name: 'Hủy bỏ', exact: true }).click();
  await expect(widget.getByText('Đã hủy', { exact: false })).toBeVisible();
});

test('full Web reload renders history and disables expired draft options', async ({ page }) => {
  const timestamp = new Date().toISOString();
  await page.route('**/api/v1/finai/conversations', (route) => route.fulfill({ json: [
    { conversationId: 'reload-chat', title: 'Cuộc trò chuyện kiểm thử', createdAt: timestamp, updatedAt: timestamp },
  ] }));
  await page.route('**/api/v1/finai/conversations/reload-chat', (route) => route.fulfill({ json: {
    conversationId: 'reload-chat', actions: [], messages: [
      { id: 'draft-message', author: 'assistant', text: 'Chọn ví từ lịch sử', createdAt: timestamp,
        clarification: { draftId: 'historical-draft', field: 'accountId',
          expiresAt: new Date(Date.now() - 1000).toISOString(), options: [{ id: 'historical', label: 'Ví đã hết hạn' }] } },
    ],
  } }));
  await page.goto(`${origin}/ai-assistant`);
  await page.reload();
  await page.getByText('Cuộc trò chuyện kiểm thử', { exact: true }).click();
  await expect(page.getByText('Chọn ví từ lịch sử')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ví đã hết hạn' })).toBeDisabled();
  await expect(page.getByText('Lựa chọn đã hết hạn.')).toBeVisible();
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'playwright-test-token');
    localStorage.setItem('user', JSON.stringify({
      id: 'finai-playwright-user',
      fullName: 'FinAI Test',
      systemRole: 'USER',
      emailVerified: true,
    }));
  });
  await page.route((url) => url.origin === new URL(origin).origin && url.pathname.startsWith('/api/'), async (route) => {
    // Keep this test independent of any services running on the workstation.
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/conversations')) await route.fulfill({ json: [] });
    else await route.fulfill({ status: 503, json: { message: 'Stubbed by the FinAI browser test' } });
  });
});

test('keeps the prompt, distinguishes HTTP errors, and preserves the key on retry', async ({ page }) => {
  const keys: string[] = [];
  await page.route('**/api/v1/finai/chat', async (route) => {
    keys.push(route.request().headers()['idempotency-key']);
    if (keys.length === 1) {
      await route.fulfill({ status: 429, headers: { 'Retry-After': '10' }, json: {
        errorCode: 'AI_QUOTA_EXCEEDED',
        message: 'private-provider-host.example',
        requestId: 'quota-test-id',
      } });
    } else {
      await route.fulfill({ json: { type: 'MESSAGE', conversationId: 'test-chat', message: 'Phản hồi kiểm thử', actions: [] } });
    }
  });
  await page.goto(`${origin}/ai-assistant`);
  const prompt = page.locator('.ai-textarea');
  await prompt.fill('Kiểm tra quota');
  await prompt.press('Enter');
  await expect(page.getByText(/Hạn mức AI hiện đã hết.*quota-test-id/)).toBeVisible();
  await expect(page.getByText('private-provider-host.example')).toHaveCount(0);
  await expect(prompt).toHaveValue('Kiểm tra quota');
  await prompt.press('Enter');
  await expect(page.getByText('Phản hồi kiểm thử')).toBeVisible();
  expect(keys[0]).toBeTruthy();
  expect(keys).toEqual([keys[0], keys[0]]);
});

test('shows slow progress, guards rapid submit, and cancels waiting', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.clock.install();
  let requests = 0;
  let release!: () => void;
  const holdRequest = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/finai/chat', async (route) => {
    requests++;
    await holdRequest;
    await route.fulfill({ json: { type: 'MESSAGE', conversationId: 'test-chat', message: 'Late answer', actions: [] } }).catch(() => {});
  });
  try {
    await page.goto(`${origin}/ai-assistant`);
    const prompt = page.locator('.ai-textarea');
    await prompt.fill('Câu hỏi xử lý chậm');
    await prompt.press('Enter');
    await expect.poll(() => requests).toBe(1);
    await expect(page.getByText('FinAI đang suy nghĩ...')).toBeVisible();
    await prompt.fill('Câu hỏi khác');
    await prompt.press('Enter');
    await page.clock.fastForward(10_500);
    await expect(page.getByText('FinAI vẫn đang xử lý yêu cầu của bạn...')).toBeVisible();
    expect(requests).toBe(1);
    await prompt.fill('');
    await page.getByRole('button', { name: 'Hủy chờ' }).click();
    await expect(prompt).toHaveValue('Câu hỏi xử lý chậm');
    await expect(page.getByText(/Không thể kết nối đến máy chủ/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hủy chờ' })).toHaveCount(0);
  } finally {
    release();
  }
});

test('reports a real network failure separately from an HTTP outage', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/v1/finai/chat', async (route) => {
    if (++attempts === 1) await route.abort('internetdisconnected');
    else await route.fulfill({ status: 503, json: { errorCode: 'AI_PROVIDER_UNAVAILABLE' } });
  });
  await page.goto(`${origin}/ai-assistant`);
  const prompt = page.locator('.ai-textarea');
  await prompt.fill('Mạng và HTTP');
  await prompt.press('Enter');
  await expect(page.getByText(/kiểm tra kết nối mạng/i)).toBeVisible();
  await prompt.press('Enter');
  await expect(page.getByText(/Dịch vụ AI đang tạm gián đoạn/)).toBeVisible();
});

test('renders trusted clarification choices and disables them after selection', async ({ page }) => {
  const draft = { draftId: 'server-draft', field: 'groupId', expiresAt: new Date(Date.now() + 300_000).toISOString(),
    options: [{ id: 'group-1', label: 'Nhóm phòng trọ' }, { id: 'group-2', label: 'Gia đình' }] };
  const requests: unknown[] = [];
  await page.route('**/api/v1/finai/chat', async (route) => {
    requests.push(route.request().postDataJSON());
    if (requests.length === 1) {
      await route.fulfill({ json: { type: 'CLARIFICATION', conversationId: 'test-group-chat',
        message: 'Bạn muốn dùng quỹ của nhóm nào?', clarification: draft, actions: [] } });
    } else {
      await route.fulfill({ json: { type: 'CLARIFICATION', conversationId: 'test-group-chat',
        message: 'Bạn muốn chia khoản chi cho những ai?', actions: [],
        clarification: { draftId: 'split-draft', field: 'splits', expiresAt: draft.expiresAt, options: [] } } });
    }
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${origin}/ai-assistant`);
  const prompt = page.locator('.ai-textarea');
  await prompt.fill('Chi 50k ăn tối bằng quỹ nhóm');
  await prompt.press('Enter');
  const choices = page.getByRole('group', { name: 'Lựa chọn cho FinAI' });
  const group = choices.getByRole('button', { name: 'Nhóm phòng trọ' });
  await expect(group).toBeEnabled();
  await group.click();
  await expect(page.getByText('Bạn muốn chia khoản chi cho những ai?')).toBeVisible();
  await expect(group).toBeDisabled();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual({ message: 'Nhóm phòng trọ', conversationId: 'test-group-chat',
    draftId: 'server-draft', optionId: 'group-1' });
});
