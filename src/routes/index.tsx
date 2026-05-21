import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader, Center } from '@mantine/core';
import { PATHS } from './paths';

import { StudentLayout }    from '../layouts/StudentLayout';
import { AdminLayout }      from '../layouts/AdminLayout';
import { SimpleLayout }     from '../layouts/SimpleLayout';
import { AuthGuard }        from '../common/components/AuthGuard';

import { ErrorPage }        from '../features/errors/ErrorPage';
import { LandingPage }      from '../features/public/pages/LandingPage';
import { AboutPage }        from '../features/public/pages/AboutPage';
import { UnauthorizedPage } from '../features/errors/UnauthorizedPage';

// ─── Lazy-loaded student pages ────────────────────────────────────────────────
const DashboardHomePage = lazy(() => import('../features/student/pages/DashboardHomePage'));
const ProfilePage       = lazy(() => import('../features/student/pages/ProfilePage'));
const StageListPage     = lazy(() => import('../features/student/pages/stages/StageListPage'));
const StageDetailsPage  = lazy(() => import('../features/student/pages/stages/StageDetailsPage'));
const HistoryPage       = lazy(() => import('../features/student/pages/HistoryPage'));
const DemandsPage       = lazy(() => import('../features/student/pages/DemandsPage'));

// ─── Lazy-loaded admin pages ──────────────────────────────────────────────────
const AdminDashboardPage      = lazy(() => import('../features/admin/pages/AdminDashboardPage'));
const StudentListPage         = lazy(() => import('../features/admin/pages/students/StudentListPage'));
const AdminStudentDetailPage  = lazy(() => import('../features/admin/pages/students/AdminStudentDetailPage'));

// ─── Lazy-loaded employee pages ───────────────────────────────────────────────
const EmployeePage = lazy(() => import('../features/employee/pages/EmployeePage'));

// ─── Suspense fallback ────────────────────────────────────────────────────────
const PageLoader = () => (
  <Center h="100vh">
    <Loader color="navy" size="md" />
  </Center>
);

const wrap = (el: React.ReactNode) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;

export const router = createBrowserRouter([
  {
    path: PATHS.ROOT,
    errorElement: <ErrorPage />,
    children: [
      // ── Public ───────────────────────────────────────────────────────────
      { index: true, element: <LandingPage /> },
      { path: 'about', element: <AboutPage /> },

      // ── Student zone ──────────────────────────────────────────────────────
      {
        path: PATHS.STUDENT.ROOT,
        element: (
          <AuthGuard requiredRole="Student">
            <StudentLayout />
          </AuthGuard>
        ),
        children: [
          { index: true,                        element: wrap(<DashboardHomePage />) },
          { path: PATHS.STUDENT.PROFILE,        element: wrap(<ProfilePage />)       },
          { path: PATHS.STUDENT.HISTORY,        element: wrap(<HistoryPage />)       },
          { path: PATHS.STUDENT.DEMANDS,        element: wrap(<DemandsPage />)       },
          {
            path: PATHS.STUDENT.STAGES,
            children: [
              { index: true, element: wrap(<StageListPage />)    },
              { path: ':id',  element: wrap(<StageDetailsPage />) },
            ],
          },
        ],
      },

      // ── Admin zone ────────────────────────────────────────────────────────
      {
        path: PATHS.ADMIN.ROOT,
        element: (
          <AuthGuard requiredRole={['Scolarite', 'SuperUser', 'Secretaire']}>
            <AdminLayout />
          </AuthGuard>
        ),
        children: [
          { index: true,                          element: wrap(<AdminDashboardPage />)     },
          { path: PATHS.ADMIN.STUDENTS,           element: wrap(<StudentListPage />)         },
          { path: PATHS.ADMIN.STUDENT_DETAIL,     element: wrap(<AdminStudentDetailPage />) },
        ],
      },

      // ── Employee zone (coming soon — no auth required) ───────────────────
      { path: PATHS.EMPLOYEE, element: wrap(<EmployeePage />) },

      // ── Utility ───────────────────────────────────────────────────────────
      {
        element: <SimpleLayout />,
        children: [
          { path: PATHS.UNAUTHORIZED, element: <UnauthorizedPage /> },
        ],
      },
    ],
  },
]);
