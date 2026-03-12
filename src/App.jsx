import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { queryClientInstance } from '@/lib/query-client';
import { pagesConfig } from './pages.config';
import PageNotFound from './lib/PageNotFound';
import RouteGuard, { HOME_BY_ROLE } from '@/components/auth/RouteGuard';
import Login from '@/pages/Login';
import { createPageUrl } from '@/utils';
import { useUsersStore } from '@/lib/userStore';
import { useFrontendAuth } from '@/lib/frontendAuth';

const { Pages, Layout } = pagesConfig;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

function AppRoutes() {
  const { isAuthenticated } = useFrontendAuth();
  const { currentUser } = useUsersStore();
  const homeByRole = createPageUrl(HOME_BY_ROLE[currentUser?.role] || 'Dashboard');

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? homeByRole : '/login'} replace />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={homeByRole} replace /> : <Login />} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            isAuthenticated ? (
              <LayoutWrapper currentPageName={path}>
                <RouteGuard pageName={path}>
                  <Page />
                </RouteGuard>
              </LayoutWrapper>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AppRoutes />
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
