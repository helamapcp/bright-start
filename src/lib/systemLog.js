import { useEffect, useMemo, useState } from 'react';
import { getCurrentUserSnapshot } from '@/lib/userStore';

const SYSTEM_LOG_STORAGE_KEY = 'frontend-system-log-v1';
const SYSTEM_LOG_EVENT = 'frontend-system-log-updated';

const getNowIso = () => new Date().toISOString();

const safeParse = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `log-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const readSystemLogs = () => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(SYSTEM_LOG_STORAGE_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
};

const persistSystemLogs = (logs) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SYSTEM_LOG_STORAGE_KEY, JSON.stringify(logs));
  window.dispatchEvent(new CustomEvent(SYSTEM_LOG_EVENT));
};

export const appendSystemLog = ({
  action = 'action',
  action_type = 'update',
  parameters = {},
  user_id,
  user_name,
  location = 'SISTEMA',
} = {}) => {
  const actor = getCurrentUserSnapshot();
  const next = {
    id: makeId(),
    action,
    action_type,
    parameters,
    user_id: user_id || actor?.id || 'local-user-1',
    user_name: user_name || actor?.full_name || 'Frontend Local',
    location,
    timestamp: getNowIso(),
  };
  const current = readSystemLogs();
  persistSystemLogs([next, ...current].slice(0, 1500));
  return next;
};

export const useSystemLogs = () => {
  const [logs, setLogs] = useState(() => readSystemLogs());

  useEffect(() => {
    const refresh = () => setLogs(readSystemLogs());
    window.addEventListener('storage', refresh);
    window.addEventListener(SYSTEM_LOG_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(SYSTEM_LOG_EVENT, refresh);
    };
  }, []);

  const users = useMemo(() => {
    const unique = new Map();
    logs.forEach((log) => {
      if (!unique.has(log.user_name)) unique.set(log.user_name, log.user_name);
    });
    return Array.from(unique.values());
  }, [logs]);

  return { logs, users, refresh: () => setLogs(readSystemLogs()) };
};

export { SYSTEM_LOG_STORAGE_KEY };
