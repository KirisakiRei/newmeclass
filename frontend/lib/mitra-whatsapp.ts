import { DEFAULT_SITE_SETTINGS } from './site-settings';

const normalizeWhatsappNumber = (value?: string | null) => {
  const digits = String(value || DEFAULT_SITE_SETTINGS.whatsapp || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
};

export const buildWhatsAppUrl = (phone?: string | null, message?: string | null) => {
  const normalized = normalizeWhatsappNumber(phone);
  if (!normalized) return '';
  const encoded = encodeURIComponent(String(message || '').trim());
  return `https://wa.me/${normalized}${encoded ? `?text=${encoded}` : ''}`;
};

export const buildMitraUpgradeWhatsappMessage = (input: {
  mitraName?: string | null;
  capacityUsed?: number | null;
  capacityLimit?: number | null;
}) => (
  `Halo Admin NEWME, saya dari Mitra ${String(input.mitraName || 'NEWME Partner').trim()}. `
  + `Saat ini kapasitas pengelolaan yayasan kami telah penuh di ${Number(input.capacityUsed || 0)}/${Number(input.capacityLimit || 0)}. `
  + 'Kami bermaksud mengajukan pembahasan penambahan kapasitas pengelolaan yayasan. '
  + 'Mohon informasi langkah lanjutan untuk proses kerja sama dan penyesuaian kontrak. Terima kasih.'
);

export const buildJoinMitraWhatsappMessage = () => (
  'Halo Admin NEWME, saya tertarik bergabung sebagai Mitra NEWME. '
  + 'Mohon informasi proses kerja sama dan pembuatan akun mitra. Terima kasih.'
);
