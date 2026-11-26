import { expect, test } from '@playwright/test';

const origin = process.env.FINAI_TEST_WEB_URL || 'http://127.0.0.1:5731';

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
