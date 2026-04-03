import DOMPurify from 'dompurify';

export const sanitizeHtml = (input: unknown) => DOMPurify.sanitize(String(input || ''), {
  USE_PROFILES: { html: true },
});
