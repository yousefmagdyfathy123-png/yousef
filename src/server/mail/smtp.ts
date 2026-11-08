import nodemailer from 'nodemailer';
import type { MailTransport } from './transport';

export function createSmtpMailTransport(): MailTransport {
  const { SMTP_URL, SMTP_FROM } = process.env;
  if (!SMTP_URL || !SMTP_FROM) throw new Error('SMTP_URL and SMTP_FROM are required');
  const url = new URL(SMTP_URL);
  if (!['smtp:', 'smtps:'].includes(url.protocol) || !url.hostname || url.search || url.hash ||
      !['', '/'].includes(url.pathname)) {
    throw new Error('SMTP_URL must be an smtp or smtps server URL');
  }
  const secure = url.protocol === 'smtps:';
  const transport = nodemailer.createTransport({
    host: url.hostname.replace(/^\[|\]$/g, ''),
    port: url.port ? Number(url.port) : secure ? 465 : 587,
    secure,
    requireTLS: !secure,
    auth: url.username ? { user: decodeURIComponent(url.username), pass: decodeURIComponent(url.password) } : undefined,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return {
    async send({ to, subject, text }) {
      const result = await transport.sendMail({ to, subject, text, from: SMTP_FROM });
      if (!result.accepted.length || result.rejected.length) throw new Error('SMTP rejected delivery');
    },
  };
}
