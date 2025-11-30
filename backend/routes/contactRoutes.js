import express from 'express';
import { db, isFirebaseReady } from '../lib/firebase.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import notificationService from '../websocket.js';
import { validate, contactMessageSchema, adminReplySchema } from '../middleware/validation.js';
import { mailService } from '../services/mailService.js';

const router = express.Router();

const CONTACT_COLLECTION = 'contactMessages';
const LEGACY_CONTACT_COLLECTION = 'contact_messages';
const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'digidiploma06@gmail.com';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, '../database/contact_messages.json');

const readLocalMessages = () => {
  try {
    if (!fs.existsSync(DATA_PATH)) return [];
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
};

const writeLocalMessages = (items) => {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch {}
};

const normalizeTimestamp = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value?._seconds) return new Date(value._seconds * 1000).toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
};

const adaptReplyHistory = (history = []) =>
  history.map((entry) => ({
    subject: entry.subject,
    messageText: entry.messageText || entry.body || entry.message || '',
    headerText: entry.headerText || 'DigiDiploma Support',
    footerText: entry.footerText || '© DigiDiploma. All rights reserved.',
    sentAt: normalizeTimestamp(entry.sentAt || entry.at) || new Date().toISOString(),
    adminName: entry.adminName || entry.by || null,
    adminId: entry.adminId || null
  }));

const normalizeMessage = (message) => {
  if (!message) return null;
  return {
    id: message.id,
    type: 'contact',
    name: message.name,
    email: message.email,
    phone: message.phone || '',
    subject: message.subject,
    message: message.message,
    status: message.status === 'replied' ? 'replied' : 'new',
    createdAt: normalizeTimestamp(message.createdAt) || new Date().toISOString(),
    viewedAt: normalizeTimestamp(message.viewedAt),
    replyHistory: adaptReplyHistory(message.replyHistory || message.replies || []),
    adminAlertEmailSentAt: normalizeTimestamp(message.adminAlertEmailSentAt)
  };
};

const buildAdminAlertHtml = (payload) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:auto;padding:24px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;color:#0f172a;">
    <h2 style="margin-top:0;margin-bottom:16px;">New Contact Message</h2>
    <p style="margin:4px 0;"><strong>Name:</strong> ${payload.name}</p>
    <p style="margin:4px 0;"><strong>Email:</strong> ${payload.email}</p>
    ${payload.phone ? `<p style="margin:4px 0;"><strong>Phone:</strong> ${payload.phone}</p>` : ''}
    <p style="margin:4px 0;"><strong>Subject:</strong> ${payload.subject}</p>
    <p style="margin:16px 0;white-space:pre-wrap;border-left:3px solid #2563eb;padding-left:12px;">${payload.message}</p>
    <p style="font-size:12px;color:#64748b;margin-top:24px;">DigiDiploma Alert • ${new Date().toLocaleString()}</p>
  </div>
`;

const buildReplyHtml = ({ headerText, messageText, footerText, subject, name }) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(90deg,#2563eb,#7c3aed);color:#fff;padding:20px 28px;">
      <h2 style="margin:0;">${headerText}</h2>
      <p style="margin:4px 0 0;font-size:14px;opacity:0.9;">Re: ${subject}</p>
    </div>
    <div style="padding:28px;background:#ffffff;">
      <p style="margin:0 0 16px;">Hi ${name || 'there'},</p>
      <div style="margin:0 0 20px;line-height:1.6;white-space:pre-wrap;">${messageText}</div>
      <div style="margin:24px 0 12px;">
        <p style="margin:0 0 8px;font-weight:600;">Follow us for updates:</p>
        <ul style="padding-left:18px;margin:0;color:#2563eb;">
          <li>Instagram: <a href="https://www.instagram.com/digi_diploma.in?igsh=eHM5MjZteHVmbjlv" target="_blank">instagram.com/digi_diploma.in</a></li>
          <li>LinkedIn: <a href="https://www.linkedin.com/in/chaitanya-zagade-766051294" target="_blank">linkedin.com/in/chaitanya-zagade-766051294</a></li>
          <li>YouTube: <a href="https://www.youtube.com/@DigiDiploma" target="_blank">youtube.com/@DigiDiploma</a></li>
        </ul>
      </div>
      <p style="margin:24px 0 0;font-size:13px;color:#475569;">${footerText}</p>
    </div>
  </div>
`;

const getMessageRecord = async (id) => {
  if (isFirebaseReady && db) {
    try {
      const ref = db.collection(CONTACT_COLLECTION).doc(id);
      const doc = await ref.get();
      if (doc.exists) return { storage: 'firestore', ref, data: { id, ...doc.data() } };
    } catch {}
    try {
      const legacyRef = db.collection(LEGACY_CONTACT_COLLECTION).doc(id);
      const legacyDoc = await legacyRef.get();
      if (legacyDoc.exists) return { storage: 'firestore', ref: legacyRef, data: { id, ...legacyDoc.data() } };
    } catch {}
  } else {
    const items = readLocalMessages();
    const index = items.findIndex((item) => item.id === id);
    if (index !== -1) {
      return { storage: 'local', items, index, data: items[index] };
    }
  }
  return null;
};

const saveLocalRecord = (record) => {
  const items = readLocalMessages();
  const existingIdx = items.findIndex((item) => item.id === record.id);
  if (existingIdx !== -1) {
    items[existingIdx] = record;
  } else {
    items.unshift(record);
  }
  writeLocalMessages(items);
};

// Submit a new contact message (public)
router.post('/messages', validate(contactMessageSchema), async (req, res) => {
  try {
    const { name, email, subject, message, phone } = req.body;
    const now = new Date().toISOString();
    const record = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'contact',
      name,
      email,
      phone: phone || '',
      subject,
      message,
      status: 'new',
      createdAt: now,
      viewedAt: null,
      replyHistory: [],
      adminAlertEmailSentAt: null
    };

    if (isFirebaseReady && db) {
      await db.collection(CONTACT_COLLECTION).doc(record.id).set(record);
    } else {
      saveLocalRecord(record);
    }

    let adminEmailSent = false;
    try {
      await mailService.sendMail({
        to: ADMIN_ALERT_EMAIL,
        subject: 'New Contact Message - DigiDiploma',
        html: buildAdminAlertHtml(record)
      });
      adminEmailSent = true;
    } catch (error) {
      adminEmailSent = false;
      console.error('Contact admin alert email failed:', error?.message || error);
    }

    if (adminEmailSent) {
      const timestamp = new Date().toISOString();
      if (isFirebaseReady && db) {
        await db.collection(CONTACT_COLLECTION).doc(record.id).set({ adminAlertEmailSentAt: timestamp }, { merge: true });
      } else {
        const items = readLocalMessages();
        const idx = items.findIndex((item) => item.id === record.id);
        if (idx !== -1) {
          items[idx].adminAlertEmailSentAt = timestamp;
          writeLocalMessages(items);
        }
      }
    }

    try {
      await notificationService.broadcastToAdmins({
        type: 'contact_message_new',
        message: {
          id: record.id,
          name: record.name,
          email: record.email,
          subject: record.subject,
          preview: record.message.slice(0, 160),
          createdAt: record.createdAt
        }
      });
    } catch (notifyError) {
      console.error('Failed to broadcast contact message notification:', notifyError?.message || notifyError);
    }

    res.json({ ok: true, id: record.id, adminEmailSent });
  } catch (error) {
    console.error('Contact message submit error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit message' });
  }
});

// List messages (admin)
router.get('/messages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (isFirebaseReady && db) {
      const items = [];
      try {
        const snap = await db.collection(CONTACT_COLLECTION).orderBy('createdAt', 'desc').get();
        snap.forEach((doc) => items.push(normalizeMessage({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Failed to fetch contactMessages collection:', err?.message || err);
      }
      try {
        const legacySnap = await db.collection(LEGACY_CONTACT_COLLECTION).orderBy('createdAt', 'desc').get();
        legacySnap.forEach((doc) => {
          if (!items.find((item) => item?.id === doc.id)) {
            items.push(normalizeMessage({ id: doc.id, ...doc.data() }));
          }
        });
      } catch {}
      const filtered = items.filter(Boolean).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json(filtered);
    }

    const items = readLocalMessages().map((entry) => normalizeMessage(entry)).filter(Boolean);
    return res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load messages' });
  }
});

// Mark message as viewed
router.patch('/messages/:id/view', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const recordInfo = await getMessageRecord(id);
    if (!recordInfo) return res.status(404).json({ error: 'Message not found' });

    const viewedAt = new Date().toISOString();
    if (recordInfo.storage === 'firestore') {
      await recordInfo.ref.set({ viewedAt }, { merge: true });
    } else if (recordInfo.storage === 'local') {
      recordInfo.items[recordInfo.index].viewedAt = viewedAt;
      writeLocalMessages(recordInfo.items);
    }

    return res.json({ ok: true, viewedAt });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update message' });
  }
});

// Reply to a message (admin) and send email via SMTP
router.post('/messages/:id/reply', authenticateToken, requireAdmin, validate(adminReplySchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { replySubject, headerText, messageText, footerText } = req.body;

    const recordInfo = await getMessageRecord(id);
    if (!recordInfo) return res.status(404).json({ error: 'Message not found' });

    const record = { ...recordInfo.data };
    const html = buildReplyHtml({
      headerText,
      messageText,
      footerText,
      subject: record.subject,
      name: record.name
    });

    let emailSent = false;
    try {
      await mailService.sendMail({
        to: record.email,
        subject: replySubject,
        html
      });
      emailSent = true;
    } catch (error) {
      emailSent = false;
      console.error('Contact reply email failed:', error?.message || error);
    }

    const replyEntry = {
      subject: replySubject,
      headerText,
      messageText,
      footerText,
      sentAt: new Date().toISOString(),
      adminId: req.user?.id || null,
      adminName: req.user?.name || 'Admin'
    };

    if (recordInfo.storage === 'firestore') {
      const existingHistory = adaptReplyHistory(record.replyHistory || record.replies || []);
      await recordInfo.ref.set(
        {
          status: 'replied',
          viewedAt: record.viewedAt || new Date().toISOString(),
          replyHistory: [...existingHistory, replyEntry]
        },
        { merge: true }
      );
    } else if (recordInfo.storage === 'local') {
      const items = recordInfo.items;
      const idx = recordInfo.index;
      items[idx].status = 'replied';
      items[idx].viewedAt = items[idx].viewedAt || new Date().toISOString();
      items[idx].replyHistory = adaptReplyHistory(items[idx].replyHistory || items[idx].replies || []);
      items[idx].replyHistory.push(replyEntry);
      writeLocalMessages(items);
    }

    return res.json({ ok: true, emailSent, status: 'replied' });
  } catch (error) {
    console.error('Reply handler error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send reply' });
  }
});

// Delete a contact message (admin)
router.delete('/messages/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    let deleted = false;

    // Try Firebase first if available
    if (isFirebaseReady && db) {
      try {
        const ref = db.collection(CONTACT_COLLECTION).doc(id);
        const doc = await ref.get();
        if (doc.exists) {
          await ref.delete();
          deleted = true;
        }
      } catch (firebaseError) {
        console.log('Firebase delete attempt failed, trying legacy collection:', firebaseError?.message);
      }
      
      if (!deleted) {
        try {
          const legacyRef = db.collection(LEGACY_CONTACT_COLLECTION).doc(id);
          const legacyDoc = await legacyRef.get();
          if (legacyDoc.exists) {
            await legacyRef.delete();
            deleted = true;
          }
        } catch (legacyError) {
          console.log('Legacy Firebase delete attempt failed:', legacyError?.message);
        }
      }
    }

    // If not deleted from Firebase, try local storage
    if (!deleted) {
      try {
        const items = readLocalMessages();
        const index = items.findIndex((item) => item && item.id === id);
        if (index !== -1) {
          items.splice(index, 1);
          writeLocalMessages(items);
          deleted = true;
        }
      } catch (localError) {
        console.error('Local storage delete error:', localError);
        return res.status(500).json({ error: 'Failed to delete message from local storage' });
      }
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Notify via WebSocket (non-blocking)
    try {
      await notificationService.broadcastToAdmins({
        type: 'contact_message_deleted',
        message: { id }
      });
    } catch (notifyError) {
      console.error('Failed to broadcast contact message deletion (non-critical):', notifyError?.message || notifyError);
      // Don't fail the request if notification fails
    }

    return res.json({ ok: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete contact message error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete message' });
  }
});

export default router;

