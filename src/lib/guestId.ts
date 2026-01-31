const GUEST_ID_KEY = 'digidiploma_guest_id';

export function getOrCreateGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = 'g_' + crypto.randomUUID();
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    return 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  }
}
