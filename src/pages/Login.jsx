import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { authenticateFrontendUser, ACTIVE_USER_STORAGE_KEY, readUsers } from '@/lib/userStore';
import { getRoleLabel } from '@/lib/rbac';
import { clearFrontendAuthSession, isFrontendAuthenticated, setFrontendAuthSession } from '@/lib/frontendAuth';
import { HOME_BY_ROLE } from '@/components/auth/RouteGuard';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const TEST_USERS = [
  { email: 'stock.operator@test', password: 'test123', label: 'Stock Operator' },
  { email: 'machine.operator@test', password: 'test123', label: 'Machine Operator' },
  { email: 'admin@test', password: 'test123', label: 'Production Planner Admin' },
];

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const identifiedRole = useMemo(() => {
    const user = readUsers().find(
      (item) => String(item.email || '').toLowerCase() === String(form.email || '').trim().toLowerCase()
    );
    return user?.role || null;
  }, [form.email]);

  React.useEffect(() => {
    if (!isFrontendAuthenticated()) return;
    const users = readUsers();
    const activeId = window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    const currentUser = users.find((user) => user.id === activeId) || users[0];
    navigate(createPageUrl(HOME_BY_ROLE[currentUser?.role] || 'Dashboard'), { replace: true });
  }, [navigate]);

  const handleLogin = (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const user = authenticateFrontendUser(form);
      if (!user) {
        toast.error('Invalid credentials. Use one of the test users.');
        return;
      }

      window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, user.id);
      setFrontendAuthSession({ userId: user.id, role: user.role, email: user.email });
      toast.success(`Logged in as ${user.full_name}.`);
      navigate(createPageUrl(HOME_BY_ROLE[user.role] || 'Dashboard'), { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSession = () => {
    clearFrontendAuthSession();
    toast.success('Session cleared.');
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Login de teste (RBAC)</CardTitle>
          <CardDescription>
            Entre com email e senha para validar rotas e permissões por perfil.
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
                placeholder="stock.operator@test"
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="test123"
                autoComplete="current-password"
              />
            </div>

            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-muted-foreground mb-1">Role identified:</p>
              {identifiedRole ? (
                <Badge variant="secondary">{getRoleLabel(identifiedRole)}</Badge>
              ) : (
                <span className="text-muted-foreground">Waiting for a known email.</span>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
              <Button type="button" variant="outline" onClick={handleResetSession}>
                Reset
              </Button>
            </div>
          </form>

          <div className="rounded-md border border-border p-3 space-y-2">
            <p className="text-sm font-medium">Test users</p>
            {TEST_USERS.map((user) => (
              <p key={user.email} className="text-xs text-muted-foreground">
                {user.label}: <span className="font-medium text-foreground">{user.email}</span> / {user.password}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
