import nodemailer from 'nodemailer';

let cachedTransporter = null;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10); // Changed default to 465
  const secure = port === 465; // Use SSL for port 465

  const tlsRejectEnv = String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || '').toLowerCase();
  const allowSelfSigned = tlsRejectEnv === 'false' || tlsRejectEnv === '0' || tlsRejectEnv === 'no';
  if (allowSelfSigned) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  const tlsReject = !allowSelfSigned;

  // Enhanced configuration for cloud hosting compatibility
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { 
      rejectUnauthorized: tlsReject,
      minVersion: 'TLSv1.2' // Ensure minimum TLS version
    },
    connectionTimeout: 10000, // 10 second connection timeout
    greetingTimeout: 10000, // 10 second greeting timeout
    socketTimeout: 30000, // 30 second socket timeout
    pool: true, // Use connection pooling
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10, // Max 10 messages per second
    // Add direct socket connection for better reliability
    requireTLS: !secure, // Require STARTTLS if not using SSL
    logger: process.env.NODE_ENV === 'development', // Enable logging in dev
    debug: process.env.NODE_ENV === 'development'
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

