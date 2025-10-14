const STORAGE_KEY = 'commenter_name_key';

export function getOrCreateNameKey() {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing && typeof existing === 'string' && existing.length > 0) {
      return existing;
    }
  } catch (e) {
    // sessionStorage might be unavailable; continue to generate a key
  }

  let newKey = '';
  try {
    if (window && window.crypto && typeof window.crypto.randomUUID === 'function') {
      newKey = window.crypto.randomUUID();
    } else {
      // Fallback without external libs
      newKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  } catch (e) {
    newKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, newKey);
  } catch (e) {
    // Ignore if cannot persist, but still return key
  }

  return newKey;
}

export default getOrCreateNameKey;
