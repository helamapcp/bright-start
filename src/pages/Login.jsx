import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ACTIVE_USER_STORAGE_KEY,
  USERS_STORAGE_KEY,
  readUsers,
} from '@/lib/userStore';
import { ROLE_IDS } from '@/lib/rbac';
import { isFrontendAuthenticated, setFrontendAuthSession } from '@/lib/frontendAuth';
import { HOME_BY_ROLE } from '@/components/auth/RouteGuard';
import { createPageUrl } from '@/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const USERS_EVENT = 'frontend-users-updated';

const mapBackendRoleToFrontend = (backendRole) => {
  if (backendRole === 'admin') return ROLE_IDS.ADMIN;
  if (backendRole === 'gerente') return ROLE_IDS.GENERAL_MANAGEMENT;
  if (backendRole === 'operador') return ROLE_IDS.MACHINE_OPERATOR;
  return ROLE_IDS.MACHINE_OPERATOR;
};

const resolveFrontendRole = (backendRoles = []) => {
  const normalized = new Set((backendRoles || []).map((role) => String(role || '').toLowerCase()));
  if (normalized.has('admin')) return mapBackendRoleToFrontend('admin');
  if (normalized.has('gerente')) return mapBackendRoleToFrontend('gerente');
  if (normalized.has('operador')) return mapBackendRoleToFrontend('operador');
  return ROLE_IDS.MACHINE_OPERATOR;
};

const upsertFrontendUserCache = ({ id, email, full_name, role }) => {
  const users = readUsers();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const nextUser = {
    id,
    full_name: String(full_name || normalizedEmail || 'User'),
    email: normalizedEmail,
    password: '',
    role,
    active: true,
  };

  const existingIndex = users.findIndex((user) => user.id === id || user.email?.toLowerCase() === normalizedEmail);
  const nextUsers = [...users];

  if (existingIndex >= 0) {
    nextUsers[existingIndex] = { ...nextUsers[existingIndex], ...nextUser };
  } else {
    nextUsers.unshift(nextUser);
  }

  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers));
  window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(USERS_EVENT));
};

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!isFrontendAuthenticated()) return;
    const users = readUsers();
    const activeId = window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    const currentUser = users.find((user) => user.id === activeId) || users[0];
    navigate(createPageUrl(HOME_BY_ROLE[currentUser?.role] || 'Dashboard'), { replace: true });
  }, [navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: String(form.email || '').trim(),
        password: String(form.password || ''),
      });

      if (signInError || !signInData?.user) {
        toast.error(signInError?.message || 'Credenciais inválidas.');
        return;
      }

      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role, created_at')
          .eq('user_id', signInData.user.id)
          .order('created_at', { ascending: true }),
        supabase.from('profiles').select('full_name, email').eq('id', signInData.user.id).maybeSingle(),
      ]);

      const role = resolveFrontendRole((roles || []).map((entry) => entry.role));
      const resolvedEmail = String(profile?.email || signInData.user.email || form.email || '').trim().toLowerCase();
      const resolvedName = profile?.full_name || signInData.user.user_metadata?.full_name || resolvedEmail;

      upsertFrontendUserCache({
        id: signInData.user.id,
        email: resolvedEmail,
        full_name: resolvedName,
        role,
      });

      setFrontendAuthSession({
        userId: signInData.user.id,
        role,
        email: resolvedEmail,
      });

      toast.success(`Bem-vindo, ${resolvedName}.`);
      navigate(createPageUrl(HOME_BY_ROLE[role] || 'Dashboard'), { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Acesso ao sistema</CardTitle>
          <CardDescription>
            Entre com suas credenciais para acessar a plataforma MES.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="seu.email@empresa.com"
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

