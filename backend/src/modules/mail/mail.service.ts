import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { Transporter } from 'nodemailer';

const nodemailer = require('nodemailer') as typeof import('nodemailer');

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private maskEmail(email: string) {
    const normalized = String(email || '').trim().toLowerCase();
    const [localPart, domain] = normalized.split('@');
    if (!localPart || !domain) {
      return 'unknown-recipient';
    }

    const visibleLocal = localPart.length <= 2
      ? `${localPart[0] || '*'}*`
      : `${localPart.slice(0, 2)}***`;

    return `${visibleLocal}@${domain}`;
  }

  isConfigured() {
    return Boolean(
      String(process.env.SMTP_HOST || '').trim()
      && String(process.env.SMTP_PORT || '').trim()
      && String(process.env.SMTP_USER || '').trim()
      && String(process.env.SMTP_PASS || '').trim()
      && String(process.env.SMTP_FROM_EMAIL || '').trim(),
    );
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('MAIL_NOT_CONFIGURED');
    }

    this.transporter = nodemailer.createTransport({
      host: String(process.env.SMTP_HOST || '').trim(),
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true',
      auth: {
        user: String(process.env.SMTP_USER || '').trim(),
        pass: String(process.env.SMTP_PASS || '').trim(),
      },
    });

    return this.transporter;
  }

  async sendMail(input: SendMailInput) {
    const transporter = this.getTransporter();
    const fromName = String(process.env.SMTP_FROM_NAME || 'NEWME').trim() || 'NEWME';
    const fromEmail = String(process.env.SMTP_FROM_EMAIL || '').trim();

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    this.logger.log(`Transactional email sent to ${this.maskEmail(input.to)}`);
  }
}
