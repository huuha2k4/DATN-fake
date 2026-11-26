import { expect, test } from '@playwright/test';
import { getAiHttpError as webError } from '../frontend-web/src/modules/ai-assistant/api/aiHttpError';
import { getAiHttpError as appError } from '../frontend-app/src/modules/ai-assistant/api/aiHttpError';

test('Web and Mobile map the same safe HTTP messages', () => {
  const cases = [
    { status: 400, code: 'INVALID_REQUEST' },
    { status: 401, code: 'AUTHENTICATION_ERROR' },
    { status: 403, code: 'AUTHORIZATION_ERROR' },
    { status: 429, code: 'AI_RATE_LIMITED' },
    { status: 429, upstream: 'AI_QUOTA_EXCEEDED', code: 'AI_QUOTA_EXCEEDED' },
    { status: 500, code: 'AI_INTERNAL_ERROR' },
    { status: 503, code: 'AI_PROVIDER_UNAVAILABLE' },
    { status: 504, code: 'AI_TIMEOUT' },
    { status: 524, code: 'AI_TIMEOUT' },
  ];
  for (const { status, upstream, code } of cases) {
    const body = { errorCode: upstream, message: 'private-provider-host.example', requestId: 'contract-test' };
    const result = appError(status, body, null, '15');
    expect(result).toEqual(webError(status, body, null, '15'));
    expect(result.code).toBe(code);
    expect(result.requestId).toBe('contract-test');
    expect(result.retryAfterSeconds).toBe(15);
    expect(result.message).not.toContain('private-provider-host');
  }
});
