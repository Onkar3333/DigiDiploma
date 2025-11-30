import sgMail from '@sendgrid/mail';

let isConfigured = false;

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
  isConfigured = true;
  console.log('✅ SendGrid configured successfully');
} else {
  console.warn('⚠️ SendGrid API key not found. Email features will be disabled.');
}

export const sendgridService = {
  canSend: () => isConfigured,
  
  async sendMail({ to, subject, html, text }) {
    if (!isConfigured) {
      throw new Error('SendGrid is not configured');
    }

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@digidiploma.in';
    
    const msg = {
      to,
      from: fromAddress,
      subject,
      text: text || '',
      html: html || text || ''
    };

    try {
      const response = await sgMail.send(msg);
      console.log('✅ Email sent via SendGrid:', to);
      return response;
    } catch (error) {
      console.error('❌ SendGrid error:', error.response?.body || error.message);
      throw error;
    }
  }
};

