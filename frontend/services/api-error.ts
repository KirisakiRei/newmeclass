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

  const detail = stringifyMessage(error.response.data.detail);
  if (detail.trim()) {
    return detail;
  }

  const message = stringifyMessage(error.userMessage || error.response.data.message || error.message);
  if (message.trim()) {
    return message;
  }

  return fallback;
};
