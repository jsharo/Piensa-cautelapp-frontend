const TOKEN_KEY = 'access_token';
const USER_KEY = 'currentUser';
const DEVICE_KEY = 'device_key';
const REMEMBER_KEY = 'rememberPreference';

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function getStoredUserRaw(): string | null {
  return sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
}

export function storeCurrentUser(userJson: string): void {
  if (sessionStorage.getItem(TOKEN_KEY)) {
    sessionStorage.setItem(USER_KEY, userJson);
    return;
  }
  localStorage.setItem(USER_KEY, userJson);
}

export function persistSession(token: string, userJson: string, remember: boolean): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, userJson);
  localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
}

export function clearStoredSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('rememberSession');
}

export function getRememberPreference(): boolean {
  const value = localStorage.getItem(REMEMBER_KEY);
  if (value === null) {
    return localStorage.getItem('rememberSession') !== 'false';
  }
  return value === 'true';
}

export function getOrCreateDeviceKey(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing && /^[A-Za-z0-9_-]{16,80}$/.test(existing)) {
    return existing;
  }
  const created = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}
