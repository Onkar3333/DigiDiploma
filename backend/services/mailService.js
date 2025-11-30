import nodemailer from 'nodemailer';
import { sendgridService } from './sendgridService.js';

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
    tls: { rejectUnauthorized: tlsReject },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  return cachedTransporter;
};

export const mailService = {
  canSend: () => Boolean(getTransporter()) || sendgridService.canSend(),
  
  async sendMail({ to, subject, html, text }) {
    // Try SendGrid first if configured (more reliable on cloud platforms)
    if (sendgridService.canSend()) {
      try {
        console.log('📧 Sending email via SendGrid to:', to);
        return await sendgridService.sendMail({ to, subject, html, text });
      } catch (error) {
        console.error('❌ SendGrid failed, trying SMTP fallback:', error.message);
        // Fall through to SMTP if SendGrid fails
      }
    }

    // Fallback to SMTP
    const transporter = getTransporter();
    if (!transporter) {
      throw new Error('Email service not configured. Please set either SENDGRID_API_KEY or SMTP credentials.');
    }
    
    console.log('📧 Sending email via SMTP to:', to);
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    const replyTo = process.env.SMTP_REPLY_TO || process.env.SMTP_USER;
    
    try {
      const result = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        text,
        replyTo
      });
      console.log('✅ Email sent via SMTP to:', to);
      return result;
    } catch (error) {
      console.error('❌ SMTP Error:', error.message);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
};

