const messages: Record<string, string> = {
  AI_TIMEOUT: 'FinAI chưa xử lý kịp yêu cầu. Vui lòng thử lại.',
  AI_RATE_LIMITED: 'FinAI đang nhận quá nhiều yêu cầu. Vui lòng thử lại sau.',
  AI_QUOTA_EXCEEDED: 'Hạn mức AI hiện đã hết. Vui lòng thử lại khi hạn mức được khôi phục.',
  AI_PROVIDER_UNAVAILABLE: 'Dịch vụ AI đang tạm gián đoạn. Vui lòng thử lại sau.',
  AI_INTERNAL_ERROR: 'FinAI chưa thể xử lý yêu cầu. Vui lòng thử lại sau.',
  AUTHENTICATION_ERROR: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  AUTHORIZATION_ERROR: 'Bạn không có quyền thực hiện yêu cầu này.',
  INVALID_REQUEST: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại nội dung.',
  AI_REQUEST_IN_PROGRESS: 'FinAI vẫn đang xử lý câu hỏi này. Vui lòng chờ trước khi thử lại.',
  AI_DRAFT_STALE: 'Lựa chọn đã hết hạn hoặc hội thoại đã thay đổi. Vui lòng mở lại hội thoại.',
};

const approvedServerMessages: Record<string, readonly string[]> = {
  AI_TIMEOUT: ['Phân tích AI chưa xử lý kịp yêu cầu.'],
  AI_PROVIDER_UNAVAILABLE: [
    'Nhà cung cấp AI đang tạm gián đoạn. Vui lòng thử lại sau.',
    'Không thể kết nối đến dịch vụ FinAI lúc này. Vui lòng thử lại sau.',
    'Dịch vụ phân tích tài chính đang tạm gián đoạn.',
  ],
  AI_INTERNAL_ERROR: ['FinAI trả về phản hồi không hợp lệ.'],
};

export function getAiHttpError(status: number, body: unknown, requestHeader?: string | null, retryHeader?: string | null) {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const candidate = data.errorCode;
  const fallback = status === 401 ? 'AUTHENTICATION_ERROR'
    : status === 403 || status === 404 ? 'AUTHORIZATION_ERROR'
      : status === 400 || status === 422 ? 'INVALID_REQUEST'
        : status === 429 ? 'AI_RATE_LIMITED'
          : [408, 504, 524].includes(status) ? 'AI_TIMEOUT'
            : status === 502 || status === 503 || status >= 520 ? 'AI_PROVIDER_UNAVAILABLE'
              : 'AI_INTERNAL_ERROR';
  const code = typeof candidate === 'string' && Object.prototype.hasOwnProperty.call(messages, candidate)
    ? candidate : fallback;
  const requestId = [data.requestId, requestHeader].find(
    (value): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value),
  );
  const retry = Number(data.retryAfterSeconds ?? retryHeader);
  const retryAfterSeconds = Number.isSafeInteger(retry) && retry > 0 ? retry : undefined;
  const message = typeof data.message === 'string' && approvedServerMessages[code]?.includes(data.message)
    ? data.message
    : messages[code];
  return { code, message, requestId, retryAfterSeconds };
}
