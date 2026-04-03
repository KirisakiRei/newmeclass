type PasswordResetTemplateInput = {
  recipientName: string;
  resetUrl: string;
  expiresMinutes: number;
};

const escapeHtml = (value: string) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export function buildPasswordResetEmailTemplate(input: PasswordResetTemplateInput) {
  const recipientName = escapeHtml(input.recipientName || 'Pelanggan NEWME');
  const resetUrl = escapeHtml(input.resetUrl);
  const expiresMinutes = Number(input.expiresMinutes || 30);
  const subject = 'Reset Password Akun NEWME';

  const text = [
    `Halo ${input.recipientName || 'Pelanggan NEWME'},`,
    '',
    'Kami menerima permintaan untuk mengatur ulang password akun NEWME Anda.',
    `Silakan buka tautan berikut untuk membuat password baru: ${input.resetUrl}`,
    '',
    `Tautan ini berlaku selama ${expiresMinutes} menit.`,
    'Jika Anda tidak merasa meminta reset password, abaikan email ini dan password Anda tidak akan berubah.',
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
                    NEWME Security
                  </div>
                  <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.2;color:#ffffff;">Reset Password Akun NEWME</h1>
                  <p style="margin:0;font-size:15px;line-height:1.7;color:#bdbdbd;">
                    Permintaan pengaturan ulang password telah kami terima untuk akun Anda.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px 16px;">
                  <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#f3f3f3;">
                    Halo <strong style="color:#ffffff;">${recipientName}</strong>,
                  </p>
                  <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#d0d0d0;">
                    Untuk melanjutkan proses, silakan klik tombol di bawah ini untuk membuat password baru dan mendapatkan kembali akses ke akun NEWME Anda.
                  </p>
                  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                    <tr>
                      <td align="center" bgcolor="#facc15" style="border-radius:999px;">
                        <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#111111;text-decoration:none;border-radius:999px;">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>
                  <div style="margin:0 0 18px;padding:18px 20px;border-radius:16px;background-color:#101010;border:1px solid #2a2a2a;">
                    <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#facc15;text-transform:uppercase;letter-spacing:0.12em;">
                      Informasi Penting
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#d0d0d0;">
                      Tautan ini berlaku selama <strong style="color:#ffffff;">${expiresMinutes} menit</strong>.
                      Jika tautan sudah kedaluwarsa, Anda dapat meminta email reset password baru dari halaman login.
                    </p>
                  </div>
                  <p style="margin:0 0 10px;font-size:14px;line-height:1.8;color:#d0d0d0;">
                    Jika tombol di atas tidak dapat dibuka, salin dan tempel tautan berikut ke browser Anda:
                  </p>
                  <p style="margin:0 0 22px;word-break:break-all;font-size:13px;line-height:1.8;color:#facc15;">
                    <a href="${resetUrl}" style="color:#facc15;text-decoration:none;">${resetUrl}</a>
                  </p>
                  <p style="margin:0;font-size:14px;line-height:1.8;color:#9f9f9f;">
                    Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini. Password Anda tidak akan berubah sampai Anda menyelesaikan proses reset.
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
