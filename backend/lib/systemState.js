import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.join(__dirname, '..', 'database');
const stateFile = path.join(dbDir, 'system.json');

let cached = { maintenance: false, broadcastMessage: '', broadcastHistory: [] };
let listeners = new Set();

async function ensureDir() {
  try { await fs.access(dbDir); } catch { await fs.mkdir(dbDir, { recursive: true }); }
}

export async function loadState() {
  try {
    const raw = await fs.readFile(stateFile, 'utf8');
    cached = JSON.parse(raw);
    // Ensure all required fields exist
    if (!cached.hasOwnProperty('maintenance')) {
      cached.maintenance = false;
    }
    if (!cached.hasOwnProperty('broadcastMessage')) {
      cached.broadcastMessage = '';
    }
    if (!cached.hasOwnProperty('broadcastHistory')) {
      cached.broadcastHistory = [];
    }
  } catch {
    cached = { maintenance: false, broadcastMessage: '', broadcastHistory: [] };
  }
  return cached;
}

export function getMaintenance() {
  try {
    return cached.maintenance === true;
  } catch (error) {
    console.error('Error getting maintenance status:', error);
    return false;
  }
}

export async function setMaintenance(enabled) {
  cached.maintenance = !!enabled;
  // Ensure all fields exist
  if (!cached.hasOwnProperty('broadcastMessage')) {
    cached.broadcastMessage = '';
  }
  if (!cached.hasOwnProperty('broadcastHistory')) {
    cached.broadcastHistory = [];
  }
  await ensureDir();
  await fs.writeFile(stateFile, JSON.stringify(cached, null, 2));
  for (const cb of listeners) {
    try { cb(cached); } catch {}
  }
  return cached;
}

export function getBroadcastMessage() {
  try {
    // Ensure cached has the field
    if (!cached.hasOwnProperty('broadcastMessage')) {
      cached.broadcastMessage = '';
    }
    return cached.broadcastMessage || '';
  } catch (error) {
    console.error('Error getting broadcast message:', error);
    return '';
  }
}

export function getBroadcastHistory() {
  try {
    // Ensure cached has the field
    if (!cached.hasOwnProperty('broadcastHistory')) {
      cached.broadcastHistory = [];
    }
    return cached.broadcastHistory || [];
  } catch (error) {
    console.error('Error getting broadcast history:', error);
    return [];
  }
}

export async function setBroadcastMessage(message) {
  cached.broadcastMessage = message || '';
  if (message && message.trim()) {
    if (!cached.broadcastHistory) {
      cached.broadcastHistory = [];
    }
    cached.broadcastHistory.unshift({
      message: message.trim(),
      timestamp: new Date().toISOString()
    });
    // Keep only last 50 messages
    if (cached.broadcastHistory.length > 50) {
      cached.broadcastHistory = cached.broadcastHistory.slice(0, 50);
    }
  }
  await ensureDir();
  await fs.writeFile(stateFile, JSON.stringify(cached, null, 2));
  for (const cb of listeners) {
    try { cb(cached); } catch {}
  }
  return cached;
}

export function onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }

// Load once on import
loadState().catch(err => {
  console.error('Failed to load system state:', err);
  cached = { maintenance: false, broadcastMessage: '', broadcastHistory: [] };
});


