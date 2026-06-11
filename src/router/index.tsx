import React, { useEffect } from 'react';
import {
  createBrowserRouter,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { UserRole } from '@/types';

interface AuthStorage {
  state: {
    user: {
      id: string;
      username: string;
      role: UserRole;
      name: string;
    } | null;
    token: string | null;
  };
}

const getAuthStorage = (): AuthStorage['state'] | null => {
  const stored = localStorage.getItem('auth-storage');
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as AuthStorage;
    return parsed.state || null;
  } catch {
    return null;
  }
};

const isAuthenticated = (): boolean => {
  const authState = getAuthStorage();
  return !!authState?.user && !!authState?.token;
};

const hasPermission = (requiredRoles: UserRole[] | undefined): boolean => {
  const authState = getAuthStorage();
  if (!authState?.user) return false;
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.includes(authState.user.role);
};

interface AuthRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

const AuthRoute: React.FC<AuthRouteProps> = ({ children, requiredRoles }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true, state: { from: location.pathname } });
      return;
    }

    if (requiredRoles && !hasPermission(requiredRoles)) {
      navigate('/403', { replace: true });
    }
  }, [location.pathname, navigate, requiredRoles]);

  if (!isAuthenticated()) {
    return null;
  }

  if (requiredRoles && !hasPermission(requiredRoles)) {
    return null;
  }

  return <>{children}</>;
};

const LazyLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

const Login = React.lazy(() => import('@/pages/login/index'));
const MainLayout = React.lazy(() => import('@/components/layout/MainLayout'));
const Dashboard = React.lazy(() => import('@/pages/dashboard/index'));
const DeviceList = React.lazy(() => import('@/pages/devices/index'));
const DeviceNew = React.lazy(() => import('@/pages/devices/new'));
const DeviceDetail = React.lazy(() => import('@/pages/devices/[id]'));
const WorkOrderList = React.lazy(() => import('@/pages/workorders/index'));
const WorkOrderDetail = React.lazy(() => import('@/pages/workorders/[id]'));
const RepairWorkbench = React.lazy(() => import('@/pages/repair/index'));
const MaintenancePlanPage = React.lazy(() => import('@/pages/maintenance/index'));
const CalibrationPage = React.lazy(() => import('@/pages/calibration/index'));
const ScrapManagementPage = React.lazy(() => import('@/pages/scrap/index'));
const MessageCenter = React.lazy(() => import('@/pages/messages/index'));
const ReportsPage = React.lazy(() => import('@/pages/reports/index'));
const SystemUsersPage = React.lazy(() => import('@/pages/system/users/index'));
const SystemConfigPage = React.lazy(() => import('@/pages/system/config/index'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));
const Forbidden = React.lazy(() => import('@/pages/Forbidden'));

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <LazyLoader>
        <Login />
      </LazyLoader>
    ),
  },
  {
    path: '/403',
    element: (
      <LazyLoader>
        <Forbidden />
      </LazyLoader>
    ),
  },
  {
    path: '/404',
    element: (
      <LazyLoader>
        <NotFound />
      </LazyLoader>
    ),
  },
  {
    path: '/',
    element: (
      <AuthRoute>
        <LazyLoader>
          <MainLayout />
        </LazyLoader>
      </AuthRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <AuthRoute requiredRoles={['admin', 'director', 'engineer', 'nurse', 'finance']}>
            <LazyLoader>
              <Dashboard />
            </LazyLoader>
          </AuthRoute>
        ),
      },
      {
        path: 'devices',
        children: [
          {
            index: true,
            element: (
              <AuthRoute requiredRoles={['admin', 'director', 'engineer', 'nurse']}>
                <LazyLoader>
                  <DeviceList />
                </LazyLoader>
              </AuthRoute>
            ),
          },
          {
            path: 'new',
            element: (
              <AuthRoute requiredRoles={['admin', 'director', 'engineer']}>
                <LazyLoader>
                  <DeviceNew />
                </LazyLoader>
              </AuthRoute>
            ),
          },
          {
            path: ':id',
            element: (
              <AuthRoute requiredRoles={['admin', 'director', 'engineer', 'nurse']}>
                <LazyLoader>
                  <DeviceDetail />
                </LazyLoader>
              </AuthRoute>
            ),
          },
        ],
      },
      {
        path: 'workorders',
        children: [
          {
            index: true,
            element: (
              <AuthRoute requiredRoles={['admin', 'director', 'engineer', 'nurse']}>
                <LazyLoader>
                  <WorkOrderList />
                </LazyLoader>
              </AuthRoute>
            ),
          },
          {
            path: ':id',
            element: (
              <AuthRoute requiredRoles={['admin', 'director', 'engineer', 'nurse']}>
                <LazyLoader>
                  <WorkOrderDetail />
                </LazyLoader>
              </AuthRoute>
            ),
          },
        ],
      },
      {
        path: 'repair',
        children: [
          {
            index: true,
            element: (
              <AuthRoute requiredRoles={['admin', 'director', 'engineer']}>
                <LazyLoader>
                  <RepairWorkbench />
                </LazyLoader>
              </AuthRoute>
            ),
          },
        ],
      },
      {
        path: 'maintenance',
        children: [
          {
            index: true,
            element: (
              <AuthRoute requiredRoles={['admin', 'director', 'engineer']}>
                <LazyLoader>
                  <MaintenancePlanPage />
                </LazyLoader>
              </AuthRoute>
            ),
          },
        ],
      },
      {
        path: 'calibration',
        children: [
          {
            index: true,
            element: (
              <AuthRoute requiredRoles={['admin', 'director', 'engineer']}>
                <LazyLoader>
                  <CalibrationPage />
                </LazyLoader>
              </AuthRoute>
            ),
          },
        ],
      },
      {
        path: 'scrap',
        children: [
          {
            index: true,
            element: (
              <AuthRoute requiredRoles={['admin', 'director', 'finance']}>
                <LazyLoader>
                  <ScrapManagementPage />
                </LazyLoader>
              </AuthRoute>
            ),
          },
        ],
      },
      {
        path: 'reports',
        element: (
          <AuthRoute requiredRoles={['admin', 'director', 'finance']}>
            <LazyLoader>
              <ReportsPage />
            </LazyLoader>
          </AuthRoute>
        ),
      },
      {
        path: 'system',
        children: [
          {
            path: 'users',
            element: (
              <AuthRoute requiredRoles={['admin', 'director']}>
                <LazyLoader>
                  <SystemUsersPage />
                </LazyLoader>
              </AuthRoute>
            ),
          },
          {
            path: 'config',
            element: (
              <AuthRoute requiredRoles={['admin', 'director']}>
                <LazyLoader>
                  <SystemConfigPage />
                </LazyLoader>
              </AuthRoute>
            ),
          },
        ],
      },
      {
        path: 'messages',
        element: (
          <AuthRoute requiredRoles={['admin', 'director', 'engineer', 'nurse', 'finance']}>
            <LazyLoader>
              <MessageCenter />
            </LazyLoader>
          </AuthRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
];

export const router = createBrowserRouter(routes);

export default router;
