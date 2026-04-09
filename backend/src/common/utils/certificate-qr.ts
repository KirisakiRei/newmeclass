import * as QRCode from 'qrcode';

export async function buildCertificateQrCodeDataUrl(value: string) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) {
    return null;
  }

  return QRCode.toDataURL(normalizedValue, {
    errorCorrectionLevel: 'H',
    margin: 3,
    width: 512,
    color: {
      dark: '#000000',
      light: '#FFFFFFFF',
    },
  });
}
