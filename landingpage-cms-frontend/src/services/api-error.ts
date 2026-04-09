const stringifyMessage = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean).join('. ');
  }

  if (typeof value === 'string') {
    return value;
  }

  return '';
};

export const getApiErrorCode = (error: unknown): string => {
  const code = (error as { code?: string })?.code
    || (error as { payload?: { error?: string } })?.payload?.error;
  return typeof code === 'string' ? code : '';
};

export const getApiErrorStatus = (error: unknown): number => {
  const status = Number(
    (error as { status?: number })?.status
    || (error as { payload?: { statusCode?: number } })?.payload?.statusCode
    || 0,
  );
  return Number.isFinite(status) ? status : 0;
};

export const getApiErrorMessage = (error: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string => {
  if (!error) return fallback;

  const payload = (error as { payload?: Record<string, unknown> })?.payload || {};

  const detail = stringifyMessage(payload.detail);
  if (detail.trim()) return detail;

  const messages = stringifyMessage(payload.messages);
  if (messages.trim()) return messages;

  const message = stringifyMessage(
    (error as { message?: string })?.message || payload.message || payload.error,
  );
  if (message.trim()) return message;

  return fallback;
};
