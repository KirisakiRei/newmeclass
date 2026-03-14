// @ts-nocheck
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format number as Indonesian Rupiah currency
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Format date to Indonesian locale string
 */
export function formatDate(dateString, options = {}) {
  if (!dateString) return '-';
  const defaultOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', { ...defaultOptions, ...options });
}

/**
 * Format date with time
 */
export function formatDateTime(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Extract error message from API error response
 */
export function getErrorMsg(error, fallback = 'Terjadi kesalahan') {
  const detail = error.response.data.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;

  const message = error.userMessage
    || error.response.data.message
    || error.message;
  if (typeof message === 'string' && message.trim()) return message;

  return fallback;
}

/**
 * Calculate education level (jenjang) from birthDate and jenjang config.
 * Returns 'sd' | 'smp' | 'sma' | 'dewasa'
 */
export function getJenjang(birthDate, config) {
  if (!birthDate || !config) return 'dewasa';
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return 'dewasa';
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  for (const [key, range] of Object.entries(config)) {
    if (age >= range.min && age <= range.max) return key;
  }
  return 'dewasa';
}

/**
 * Get question text appropriate for the user's jenjang.
 * Falls back to the universal question text if no variant exists.
 */
export function getQuestionText(question, jenjang) {
  if (jenjang && jenjang !== 'dewasa' && question.variants?.[jenjang]) {
    return question.variants[jenjang];
  }
  return question.text || question.question || '';
}



