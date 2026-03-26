// @ts-nocheck
const stringifyMessage = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean).join('. ');
  }

  if (typeof value === 'string') {
    return value;
  }

  return '';
};

export const getApiErrorMessage = (error, fallback = 'Terjadi kesalahan. Silakan coba lagi.') => {
  if (!error) return fallback;

  const responseData = error.response?.data || {};

  const detail = stringifyMessage(responseData.detail);
  if (detail.trim()) {
    return detail;
  }

  const messages = stringifyMessage(responseData.messages);
  if (messages.trim()) {
    return messages;
  }

  const message = stringifyMessage(error.userMessage || responseData.message || error.message);
  if (message.trim()) {
    return message;
  }

  return fallback;
};
