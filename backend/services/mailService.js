import nodemailer from 'nodemailer';

let cachedTransporter = null;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure =
    typeof process.env.SMTP_SECURE !== 'undefined'
      ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
      : port === 465;

  const tlsRejectEnv = String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || '').toLowerCase();
  const allowSelfSigned = tlsRejectEnv === 'false' || tlsRejectEnv === '0' || tlsRejectEnv === 'no';
  if (allowSelfSigned) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  const tlsReject = !allowSelfSigned;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: tlsReject }
  });

  return cachedTransporter;
};

export const mailService = {
  canSend: () => Boolean(getTransporter()),
  async sendMail({ to, subject, html, text }) {
    const transporter = getTransporter();
    if (!transporter) {
      throw new Error('SMTP credentials are not configured');
    }
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    const replyTo = process.env.SMTP_REPLY_TO || process.env.SMTP_USER;
    return transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text,
      replyTo
    });
  }
};

