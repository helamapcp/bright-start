import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Factory,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Warehouse,
  History,
  Boxes,
  FlaskConical,
  Truck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { canAccessPage, getRoleLabel } from '@/lib/rbac';
import { useUsersStore } from '@/lib/userStore';
import { clearFrontendAuthSession } from '@/lib/frontendAuth';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Produção', icon: Factory, page: 'MachineSelection' },
  { name: 'Ordens', icon: Package, page: 'Orders' },
  { name: 'PA Tracking', icon: Truck, page: 'PATracking' },
  { name: 'Fábrica', icon: Warehouse, page: 'FactoryDashboard' },
  { name: 'Estoque', icon: Boxes, page: 'Estoque' },
  { name: 'Programação PMP', icon: FlaskConical, page: 'FormulationPlanning' },
  { name: 'Histórico Consumo', icon: History, page: 'ConsumptionHistory' },
  { name: 'Configurações', icon: Settings, page: 'Settings' },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentUser } = useUsersStore();

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => canAccessPage(currentUser?.role, item.page)),
    [currentUser?.role]
  );

  const handleLogout = () => {
    clearFrontendAuthSession();
    window.location.href = '/login';
  };

  const FACTORY_FLOOR_PAGES = ['Production', 'BagTransfer', 'MachineConsumption'];
  const noSidebar = FACTORY_FLOOR_PAGES.includes(currentPageName);

  return noSidebar ? (
    children
  ) : (
    <div className="min-h-screen bg-background text-foreground">
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b border-border z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Factory className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">PVC Production</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{currentUser?.full_name || 'User'}</p>
          <p className="text-xs text-muted-foreground">{getRoleLabel(currentUser?.role)}</p>
        </div>
      </header>

      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-background border-r border-border z-40 transition-all duration-300',
          'lg:translate-x-0',
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64',
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'
        )}
      >
        <div className="h-16 px-4 flex items-center border-b border-border justify-between">
          <div className={cn('flex items-center gap-3 min-w-0', sidebarCollapsed && 'lg:justify-center lg:w-full')}>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0">
              <Factory className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className={cn('min-w-0', sidebarCollapsed && 'lg:hidden')}>
              <h1 className="font-bold truncate">PVC Production</h1>
              <p className="text-xs text-muted-foreground truncate">Plataforma MES</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-label={sidebarCollapsed ? 'Expandir menu' : 'Contrair menu'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>
        </div>

        <nav className="p-3 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = currentPageName === item.page;
            const Icon = item.icon;

            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.name : undefined}
                className={cn(
                  'flex items-center rounded-xl transition-all hover:bg-muted',
                  sidebarCollapsed ? 'lg:justify-center lg:px-2 py-3 px-4 gap-0' : 'gap-3 px-4 py-3',
                  isActive && 'bg-muted font-medium'
                )}
              >
                <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-foreground' : 'text-muted-foreground')} />
                <span className={cn(sidebarCollapsed && 'lg:hidden')}>{item.name}</span>
                {isActive && !sidebarCollapsed && <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border">
          <div className={cn('flex items-center gap-3 mb-3', sidebarCollapsed && 'lg:justify-center')}>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium shrink-0">
              {currentUser?.full_name?.charAt(0) || 'U'}
            </div>
            <div className={cn('flex-1 min-w-0', sidebarCollapsed && 'lg:hidden')}>
              <p className="text-sm font-medium truncate">{currentUser?.full_name || 'User'}</p>
              <Badge variant="secondary" className="text-xs mt-0.5">
                {getRoleLabel(currentUser?.role)}
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            className={cn('w-full', sidebarCollapsed ? 'lg:justify-center lg:px-0' : 'justify-start')}
            onClick={handleLogout}
            title="Ir para login"
          >
            <LogOut className={cn('w-4 h-4', !sidebarCollapsed && 'mr-2')} />
            <span className={cn(sidebarCollapsed && 'lg:hidden')}>Ir para login</span>
          </Button>
        </div>
      </aside>

      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />}

      <main className={cn('min-h-screen pt-16 lg:pt-0 transition-all duration-300', sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64')}>
        {children}
      </main>
    </div>
  );
}
