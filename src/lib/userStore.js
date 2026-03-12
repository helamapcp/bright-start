import { useEffect, useMemo, useState } from 'react';
import { ROLE_IDS, normalizeRole } from '@/lib/rbac';

const USERS_STORAGE_KEY = 'frontend-users-v1';
const ACTIVE_USER_STORAGE_KEY = 'frontend-active-user-id-v1';
const USERS_EVENT = 'frontend-users-updated';

const DEFAULT_USERS = [
  {
    id: 'local-user-admin',
    full_name: 'Production Planner Admin',
    email: 'admin@test',
    password: 'test123',
    role: ROLE_IDS.ADMIN,
    active: true,
  },
  {
    id: 'local-user-gm',
    full_name: 'General Manager',
    email: 'gm@local.dev',
    password: 'test123',
    role: ROLE_IDS.GENERAL_MANAGEMENT,
    active: true,
  },
  {
    id: 'local-user-log',
    full_name: 'Logistics Manager',
    email: 'logistics@local.dev',
    password: 'test123',
    role: ROLE_IDS.LOGISTICS_MANAGEMENT,
    active: true,
  },
  {
    id: 'local-user-stock',
    full_name: 'Stock Operator',
    email: 'stock.operator@test',
    password: 'test123',
    role: ROLE_IDS.STOCK_OPERATOR,
    active: true,
  },
  {
    id: 'local-user-machine',
    full_name: 'Machine Operator',
    email: 'machine.operator@test',
    password: 'test123',
    role: ROLE_IDS.MACHINE_OPERATOR,
    active: true,
  },
];

const parseSafe = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `user-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const sanitizeUsers = (users) => {
  if (!Array.isArray(users)) return DEFAULT_USERS;
  const valid = users
    .filter((user) => user?.full_name && user?.email)
    .map((user) => ({
      id: user.id || makeId(),
      full_name: String(user.full_name),
      email: String(user.email).trim().toLowerCase(),
      password: String(user.password || 'test123'),
      role: normalizeRole(user.role || ROLE_IDS.MACHINE_OPERATOR),
      active: user.active !== false,
    }));

  return valid.length ? valid : DEFAULT_USERS;
};

export const readUsers = () => {
  if (typeof window === 'undefined') return DEFAULT_USERS;
  const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
  return sanitizeUsers(parseSafe(raw, DEFAULT_USERS));
};

const persistUsers = (users) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  window.dispatchEvent(new CustomEvent(USERS_EVENT));
};

const readCurrentUserId = () => {
  if (typeof window === 'undefined') return 'local-user-admin';
  return window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY) || 'local-user-admin';
};

const persistCurrentUserId = (userId) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId);
  window.dispatchEvent(new CustomEvent(USERS_EVENT));
};

export const getCurrentUserSnapshot = () => {
  const users = readUsers();
  const activeId = readCurrentUserId();
  const activeUser = users.find((user) => user.id === activeId && user.active !== false);

  if (activeUser) return activeUser;

  const fallback = users.find((user) => user.active !== false) || DEFAULT_USERS[0];
  if (typeof window !== 'undefined') persistCurrentUserId(fallback.id);
  return fallback;
};

export const useUsersStore = () => {
  const [users, setUsers] = useState(() => readUsers());
  const [currentUserId, setCurrentUserId] = useState(() => readCurrentUserId());

  useEffect(() => {
    persistUsers(users);
  }, [users]);

  useEffect(() => {
    persistCurrentUserId(currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    const refresh = () => {
      setUsers(readUsers());
      setCurrentUserId(readCurrentUserId());
    };

    window.addEventListener('storage', refresh);
    window.addEventListener(USERS_EVENT, refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(USERS_EVENT, refresh);
    };
  }, []);

  const currentUser = useMemo(() => {
    const selected = users.find((user) => user.id === currentUserId && user.active !== false);
    return selected || users.find((user) => user.active !== false) || DEFAULT_USERS[0];
  }, [users, currentUserId]);

  const addUser = ({ full_name, email, role }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      throw new Error('A user with this email already exists.');
    }

    const nextUser = {
      id: makeId(),
      full_name: String(full_name || '').trim(),
      email: normalizedEmail,
      role: normalizeRole(role || ROLE_IDS.MACHINE_OPERATOR),
      active: true,
    };

    if (!nextUser.full_name || !nextUser.email) {
      throw new Error('Name and email are required.');
    }

    setUsers((prev) => [nextUser, ...prev]);
    return nextUser;
  };

  const updateUser = (userId, payload = {}) => {
    let updated = null;

    setUsers((prev) =>
      prev.map((user) => {
        if (user.id !== userId) return user;
        updated = {
          ...user,
          full_name: payload.full_name?.trim() || user.full_name,
          email: payload.email?.trim().toLowerCase() || user.email,
          role: payload.role ? normalizeRole(payload.role) : user.role,
          active: typeof payload.active === 'boolean' ? payload.active : user.active,
        };
        return updated;
      })
    );

    return updated;
  };

  const setUserActive = (userId, active) => {
    const updated = updateUser(userId, { active: !!active });

    if (!active && userId === currentUserId) {
      const nextActive = users.find((user) => user.id !== userId && user.active !== false);
      setCurrentUserId(nextActive?.id || 'local-user-admin');
    }

    return updated;
  };

  const deleteUser = (userId) => {
    const target = users.find((user) => user.id === userId);
    if (!target) return null;

    setUsers((prev) => prev.filter((user) => user.id !== userId));

    if (currentUserId === userId) {
      const nextActive = users.find((user) => user.id !== userId && user.active !== false);
      setCurrentUserId(nextActive?.id || 'local-user-1');
    }

    return target;
  };

  const switchCurrentUser = (userId) => {
    const target = users.find((user) => user.id === userId && user.active !== false);
    if (!target) throw new Error('Only active users can be selected.');
    setCurrentUserId(userId);
    return target;
  };

  return {
    users,
    currentUser,
    currentUserId,
    addUser,
    updateUser,
    setUserActive,
    deleteUser,
    switchCurrentUser,
  };
};

export { USERS_STORAGE_KEY, ACTIVE_USER_STORAGE_KEY };
