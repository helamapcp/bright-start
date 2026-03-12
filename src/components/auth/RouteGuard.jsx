import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { canAccessPage } from '@/lib/rbac';
import { useUsersStore } from '@/lib/userStore';
import { isFrontendAuthenticated } from '@/lib/frontendAuth';

// Frontend-only mode role defaults for route redirects.
export const HOME_BY_ROLE = {
  admin: 'Dashboard',
  general_management: 'Dashboard',
  logistics_management: 'PATracking',
  stock_operator: 'Estoque',
  machine_operator: 'MachineSelection',
};

export default function RouteGuard({ children, pageName }) {
  const { currentUser } = useUsersStore();
  const fallbackPage = HOME_BY_ROLE[currentUser?.role] || 'Dashboard';

  if (!isFrontendAuthenticated()) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Authentication required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Sign in to continue.</p>
              <Button asChild>
                <Link to="/login">Go to login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!canAccessPage(currentUser?.role, pageName)) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Access restricted</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your role does not have permission to open this module.
              </p>
              <Button asChild>
                <Link to={createPageUrl(fallbackPage)}>Go to allowed area</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return children;
}
