import { useEffect, useState } from 'react';

export const FRONTEND_AUTH_STORAGE_KEY = 'frontend-auth-session-v1';
const FRONTEND_AUTH_EVENT = 'frontend-auth-updated';

const parseSafe = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export const readFrontendAuthSession = () => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(FRONTEND_AUTH_STORAGE_KEY);
  const parsed = parseSafe(raw, null);
  return parsed && parsed.userId ? parsed : null;
};

export const isFrontendAuthenticated = () => !!readFrontendAuthSession();

const notifyAuthChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FRONTEND_AUTH_EVENT));
};

export const setFrontendAuthSession = ({ userId, role, email }) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    FRONTEND_AUTH_STORAGE_KEY,
    JSON.stringify({
      userId,
      role,
      email,
      loggedAt: new Date().toISOString(),
    })
  );
  notifyAuthChanged();
};

export const clearFrontendAuthSession = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(FRONTEND_AUTH_STORAGE_KEY);
  notifyAuthChanged();
};

export const useFrontendAuth = () => {
  const [session, setSession] = useState(() => readFrontendAuthSession());

  useEffect(() => {
    const sync = () => setSession(readFrontendAuthSession());
    window.addEventListener('storage', sync);
    window.addEventListener(FRONTEND_AUTH_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(FRONTEND_AUTH_EVENT, sync);
    };
  }, []);

  return {
    session,
    isAuthenticated: !!session,
  };
};
