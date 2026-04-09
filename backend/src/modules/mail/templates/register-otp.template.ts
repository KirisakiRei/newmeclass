type RegisterOtpTemplateInput = {
  otp: string;
  recipientName: string;
  expiresMinutes: number;
};

const escapeHtml = (value: string) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export function buildRegisterOtpEmailTemplate(input: RegisterOtpTemplateInput) {
  const recipientName = escapeHtml(input.recipientName || 'Pelanggan NEWME');
  const otp = escapeHtml(input.otp || '000000');
  const expiresMinutes = Number(input.expiresMinutes || 10);
  const subject = 'Kode Verifikasi Registrasi NEWME';

  const text = [
    `Halo ${input.recipientName || 'Pelanggan NEWME'},`,
    '',
    'Gunakan kode OTP berikut untuk melanjutkan registrasi akun NEWME Anda:',
    input.otp || '000000',
    '',
    `Kode ini berlaku selama ${expiresMinutes} menit.`,
    'Jika Anda tidak merasa membuat akun, abaikan email ini.',
    '',
    'Hormat kami,',
    'Tim NEWME',
  ].join('\n');

  const html = `
  <!DOCTYPE html>
  <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${subject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#080808;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#080808;margin:0;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background-color:#141414;border:1px solid #2f2f2f;border-radius:20px;overflow:hidden;">
              <tr>
                <td style="padding:32px 32px 20px;background:linear-gradient(180deg,#171717 0%,#121212 100%);border-bottom:1px solid #2f2f2f;">
                  <div style="display:inline-block;padding:6px 12px;border-radius:999px;border:1px solid rgba(234,179,8,0.35);background-color:rgba(234,179,8,0.12);color:#facc15;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">
                    NEWME Registration
                  </div>
                  <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.2;color:#ffffff;">Verifikasi Email Registrasi</h1>
                  <p style="margin:0;font-size:15px;line-height:1.7;color:#bdbdbd;">
                    Satu langkah lagi sebelum akun Anda siap dipakai.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px 16px;">
                  <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#f3f3f3;">
                    Halo <strong style="color:#ffffff;">${recipientName}</strong>,
                  </p>
                  <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#d0d0d0;">
                    Masukkan kode OTP berikut pada halaman registrasi untuk memverifikasi email Anda dan melanjutkan pembuatan akun.
                  </p>
                  <div style="margin:28px 0;padding:24px 20px;border-radius:20px;background-color:#101010;border:1px solid #2a2a2a;text-align:center;">
                    <p style="margin:0 0 10px;font-size:12px;line-height:1.7;color:#facc15;text-transform:uppercase;letter-spacing:0.24em;">
                      Kode OTP
                    </p>
                    <p style="margin:0;font-size:42px;line-height:1;font-weight:800;letter-spacing:0.28em;color:#ffffff;">
                      ${otp}
                    </p>
                  </div>
                  <p style="margin:0 0 18px;font-size:14px;line-height:1.8;color:#d0d0d0;">
                    Kode ini berlaku selama <strong style="color:#ffffff;">${expiresMinutes} menit</strong>. Demi keamanan, jangan bagikan kode ini kepada siapa pun.
                  </p>
                  <p style="margin:0;font-size:14px;line-height:1.8;color:#9f9f9f;">
                    Jika Anda tidak merasa membuat akun NEWME, abaikan email ini dan tidak ada perubahan yang akan dilakukan.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 32px 32px;border-top:1px solid #2a2a2a;">
                  <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#e7e7e7;">Hormat kami,</p>
                  <p style="margin:0;font-size:14px;line-height:1.8;color:#facc15;font-weight:700;">Tim NEWME</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  return {
    subject,
    html,
    text,
  };
}
