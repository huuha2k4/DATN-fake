// Run against an isolated database and two synthetic members in a ROOMMATE group.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { FINORA_E2E_WEB, FINORA_E2E_API, FINORA_E2E_GROUP, FINORA_E2E_OWNER, FINORA_E2E_MEMBER,
  FINORA_E2E_PASSWORD, FINORA_E2E_SCREENSHOTS, FINORA_E2E_BROWSER } = process.env;
for (const value of [FINORA_E2E_WEB, FINORA_E2E_API, FINORA_E2E_GROUP, FINORA_E2E_OWNER,
  FINORA_E2E_MEMBER, FINORA_E2E_PASSWORD, FINORA_E2E_SCREENSHOTS]) assert.ok(value, 'Set FINORA_E2E fixture variables');
for (const url of [FINORA_E2E_WEB, FINORA_E2E_API]) assert.equal(new URL(url).hostname, '127.0.0.1', 'Local fixture only');
const groupPath = `/groups/${FINORA_E2E_GROUP}`;
const date = new Date().toLocaleDateString('sv-SE');

async function login(browser, identity, width, height, theme) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
  await context.addInitScript((value) => localStorage.setItem('finora_theme', value), theme);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto(FINORA_E2E_WEB);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).first().click();
  await page.getByLabel('Email hoặc Tên tài khoản').fill(identity);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(FINORA_E2E_PASSWORD);
  const [response] = await Promise.all([
    page.waitForResponse((result) => result.url().endsWith('/auth/login') && result.request().method() === 'POST'),
    page.locator('button[type=submit]').filter({ hasText: 'Đăng nhập' }).click(),
  ]);
  assert.ok(response.ok(), `Authentication returned ${response.status()}`);
  const session = (await response.json()).data;
  await page.waitForURL((url) => url.pathname !== '/');
  const get = async (endpoint) => {
    const result = await context.request.get(FINORA_E2E_API + endpoint, {
      headers: { Authorization: `Bearer ${session.tokens.access_token}` },
    });
    assert.ok(result.ok(), `${endpoint} returned ${result.status()}`);
    const body = await result.json();
    return body.data ?? body;
  };
  return { page, get, userId: session.user.id };
}

async function navigate(page, tab = 'OVERVIEW') {
  await page.goto(`${FINORA_E2E_WEB}/groups?groupId=${FINORA_E2E_GROUP}&tab=${tab}`);
  await page.getByRole('button', { name: 'Tổng quan', exact: true }).waitFor();
  await page.getByText('Đang tải thông tin nhóm…', { exact: false }).waitFor({ state: 'hidden' });
}

async function mutate(page, endpoint, button) {
  const [response] = await Promise.all([
    page.waitForResponse((result) => result.url().endsWith(groupPath + endpoint) && result.request().method() === 'POST'),
    button.click(),
  ]);
  assert.ok(response.ok(), `${endpoint} returned ${response.status()}: ${await response.text()}`);
  return response.json();
}

async function chooseFirst(select) {
  const value = await select.locator('option').evaluateAll((items) => items.find((item) => !!item.value)?.value);
  assert.ok(value, 'Expected selectable fixture account or category');
  await select.selectOption(value);
}

async function deposit(page, period, amount, external = false) {
  await page.getByRole('button', { name: 'Nộp quỹ', exact: true }).first().click();
  await page.getByLabel('Kỳ đóng quỹ', { exact: true }).selectOption(period);
  await page.getByLabel('Nguồn đóng góp').selectOption(external ? 'CASH' : 'MANAGED_ACCOUNT');
  if (!external) await chooseFirst(page.getByLabel('Ví nguồn', { exact: true }));
  await page.getByPlaceholder('Số tiền nộp (VNĐ) *').fill(String(amount));
  return mutate(page, external ? '/fund/contribution-requests' : '/fund/contributions',
    page.locator('button[type=submit]').filter({ hasText: 'Nộp quỹ' }));
}

async function expense(page, title, amount, purpose) {
  await page.getByRole('button', { name: 'Thêm khoản chi', exact: true }).click();
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Lưu khoản chi' }) });
  await form.getByPlaceholder('VD: Bữa tối BBQ, Mua đồ siêu thị, Tiền điện...').fill(title);
  await form.getByPlaceholder('VD: 500.000').fill(String(amount));
  await form.getByLabel('Nguồn tiền').selectOption(purpose === 'FUND_EXPENSE' ? 'GROUP_FUND' : 'PERSONAL_ACCOUNT');
  if (purpose !== 'FUND_EXPENSE') {
    await form.getByLabel('Mục đích').selectOption(purpose);
    await chooseFirst(form.getByLabel('Ví nguồn'));
  }
  await chooseFirst(form.getByLabel('Danh mục chi'));
  return mutate(page, '/expenses', form.getByRole('button', { name: 'Lưu khoản chi' }));
}

async function screenshot(page, name) {
  await page.getByRole('heading', { name: 'Kỳ nghiệm thu', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Hoàn trả tiền ứng', exact: true }).waitFor();
  const extent = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  assert.ok(extent.content <= extent.viewport + 2, `Page overflows ${name}: ${JSON.stringify(extent)}`);
  await page.screenshot({ path: path.join(FINORA_E2E_SCREENSHOTS, name + '.png'), fullPage: true, animations: 'disabled' });
}

async function main() {
  await fs.mkdir(FINORA_E2E_SCREENSHOTS, { recursive: true });
  const browser = await chromium.launch(FINORA_E2E_BROWSER ? { executablePath: FINORA_E2E_BROWSER } : {});
  try {
    const owner = await login(browser, FINORA_E2E_OWNER, 1440, 900, 'light');
    const member = await login(browser, FINORA_E2E_MEMBER, 880, 900, 'dark');
    const report = async (session) => (await session.get(`/transactions/summary?fromDate=${date}&toDate=${date}`)).summary;
    const [ownerBefore, memberBefore] = await Promise.all([report(owner), report(member)]);
    await navigate(owner.page);
    await owner.page.getByRole('button', { name: 'Tạo kỳ đóng quỹ', exact: true }).click();
    await owner.page.getByLabel('Tên kỳ').fill('Kỳ nghiệm thu');
    await owner.page.getByLabel('Hạn đóng').fill(date);
    await owner.page.getByLabel('Tổng mục tiêu').fill('400000');
    const period = await mutate(owner.page, '/contribution-periods', owner.page.getByRole('button', { name: 'Bắt đầu kỳ' }));
    assert.equal(period.requiredTotal, 400000);

    await navigate(member.page);
    assert.equal(await member.page.getByRole('button', { name: 'Kết thúc kỳ', exact: true }).count(), 0);
    await deposit(member.page, period.id, 100000);
    await member.page.getByPlaceholder('Số tiền nộp (VNĐ) *').waitFor({ state: 'hidden' });
    const external = await deposit(member.page, period.id, 50000, true);
    assert.equal(external.status, 'PENDING');
    assert.equal((await member.get(groupPath + '/contribution-periods/active')).confirmedAmount, 100000);

    await navigate(owner.page);
    await mutate(owner.page, `/fund/contributions/${external.id}/confirm`,
      owner.page.locator(`#finance-${external.id}`).getByRole('button', { name: 'Xác nhận đã nhận' }));
    assert.equal((await owner.get(groupPath + '/contribution-periods/active')).confirmedAmount, 150000);
    await expense(owner.page, 'Chi tiền từ quỹ nghiệm thu', 40000, 'FUND_EXPENSE');
    assert.equal((await owner.get(groupPath + '/fund')).balance, 110000);
    assert.equal((await owner.get(groupPath + '/contribution-periods/active')).confirmedAmount, 150000);

    await navigate(member.page);
    const advance = await expense(member.page, 'Ứng tiền nghiệm thu', 90000, 'FUND_REIMBURSEMENT');
    const claims = await member.get(groupPath + '/fund/reimbursements');
    const claim = claims.content.find((item) => item.expenseId === advance.id);
    assert.ok(claim);
    await navigate(owner.page);
    const claimCard = owner.page.locator(`#finance-${claim.id}`);
    await claimCard.getByRole('button', { name: 'Ghi nhận hoàn trả' }).click();
    await claimCard.getByLabel('Số tiền hoàn trả').fill('30000');
    const payment = await mutate(owner.page, `/fund/reimbursements/${claim.id}/payments`, claimCard.getByRole('button', { name: 'Xác nhận', exact: true }));
    assert.equal(payment.remainingAmount, 60000);
    await claimCard.getByRole('button', { name: 'Lịch sử hoàn trả' }).click();
    await claimCard.getByText(/30\.000 đ · Bên ngoài/).waitFor();

    await expense(owner.page, 'Chia tiền nghiệm thu', 120000, 'MEMBER_SPLIT');
    await navigate(member.page, 'BALANCES');
    await member.page.getByRole('button', { name: 'Đóng tiền bù trừ' }).click();
    const settle = member.page.locator('form').filter({ has: member.page.getByRole('button', { name: 'Tạo yêu cầu bù trừ' }) });
    await chooseFirst(settle.getByLabel('Ví nguồn thanh toán'));
    const request = await mutate(member.page, '/settlements', settle.getByRole('button', { name: 'Tạo yêu cầu bù trừ' }));
    assert.equal(request.status, 'PENDING');
    await navigate(owner.page, 'BALANCES');
    const settlement = owner.page.locator(`#finance-${request.id}`);
    await settlement.getByRole('button', { name: 'Xác nhận nhận tiền' }).click();
    await chooseFirst(settlement.locator('select'));
    const confirmed = await mutate(owner.page, `/settlements/${request.id}/confirm`, settlement.getByRole('button', { name: 'Đã nhận', exact: true }));
    assert.equal(confirmed.status, 'CONFIRMED');
    assert.equal((await owner.get(groupPath + '/balances')).isFullySettled, true);
    assert.equal((await owner.get(groupPath + '/fund')).balance, 80000);
    const [ownerAfter, memberAfter] = await Promise.all([report(owner), report(member)]);
    assert.equal(ownerAfter.totalIncome - ownerBefore.totalIncome, 0);
    assert.equal(ownerAfter.totalExpense - ownerBefore.totalExpense, 60000);
    assert.equal(ownerAfter.walletCashIn - ownerBefore.walletCashIn, 60000);
    assert.equal(ownerAfter.walletCashOut - ownerBefore.walletCashOut, 120000);
    assert.equal(memberAfter.totalExpense - memberBefore.totalExpense, 60000);
    assert.equal(memberAfter.walletCashOut - memberBefore.walletCashOut, 250000);

    await navigate(owner.page);
    await screenshot(owner.page, 'owner-desktop-light');
    await navigate(member.page);
    await screenshot(member.page, 'member-tablet-dark');
    const phone = await login(browser, FINORA_E2E_MEMBER, 390, 844, 'dark');
    await navigate(phone.page);
    await screenshot(phone.page, 'member-phone-dark');
    console.log('Authenticated owner/member finance lifecycle and 3 screenshot viewports passed.');
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
