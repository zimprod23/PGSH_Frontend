import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader, Center } from '@mantine/core';
import { PATHS } from './paths';
import { Roles } from '../common/constants/roles';

import { StudentLayout }    from '../layouts/StudentLayout';
import { AdminLayout }      from '../layouts/AdminLayout';
import { EmployeeLayout }   from '../layouts/EmployeeLayout';
import { SimpleLayout }     from '../layouts/SimpleLayout';
import { AuthGuard }        from '../common/components/AuthGuard';

import { ErrorPage }        from '../features/errors/ErrorPage';
import { LandingPage }      from '../features/public/pages/LandingPage';
import { AboutPage }        from '../features/public/pages/AboutPage';
import { UnauthorizedPage } from '../features/errors/UnauthorizedPage';
import { NoProfilePage }    from '../features/errors/NoProfilePage';

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
const AcademicYearsPage       = lazy(() => import('../features/admin/pages/AcademicYearsPage'));
const LevelsPage              = lazy(() => import('../features/admin/pages/LevelsPage'));
const GroupsPage              = lazy(() => import('../features/admin/pages/GroupsPage'));
const GroupDetailPage         = lazy(() => import('../features/admin/pages/GroupDetailPage'));
const StagesPage              = lazy(() => import('../features/admin/pages/StagesPage'));
const StageDetailPage         = lazy(() => import('../features/admin/pages/StageDetailPage'));
const InfrastructurePage      = lazy(() => import('../features/admin/pages/InfrastructurePage'));
const EmployeesPage           = lazy(() => import('../features/admin/pages/EmployeesPage'));
const AttendancePage          = lazy(() => import('../features/admin/pages/AttendancePage'));
const AssignmentsPage         = lazy(() => import('../features/admin/pages/AssignmentsPage'));

// ─── Lazy-loaded employee pages ───────────────────────────────────────────────
const EmployeeDashboardPage  = lazy(() => import('../features/employee/pages/EmployeeDashboardPage'));
const EmployeeProfilePage    = lazy(() => import('../features/employee/pages/EmployeeProfilePage'));
const EmployeeServicesPage   = lazy(() => import('../features/employee/pages/EmployeeServicesPage'));

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
          <AuthGuard requiredRole={Roles.Student}>
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
          <AuthGuard requiredRole={[Roles.Scolarite, Roles.SuperUser, Roles.Secretaire]}>
            <AdminLayout />
          </AuthGuard>
        ),
        children: [
          { index: true,                          element: wrap(<AdminDashboardPage />)         },
          { path: PATHS.ADMIN.STUDENTS,           element: wrap(<StudentListPage />)           },
          { path: PATHS.ADMIN.STUDENT_DETAIL,     element: wrap(<AdminStudentDetailPage />)    },
          { path: PATHS.ADMIN.ACADEMIC_YEARS,     element: wrap(<AcademicYearsPage />)         },
          { path: PATHS.ADMIN.LEVELS,             element: wrap(<LevelsPage />)                },
          {
            path: PATHS.ADMIN.GROUPS,
            children: [
              { index: true, element: wrap(<GroupsPage />)       },
              { path: ':id',  element: wrap(<GroupDetailPage />) },
            ],
          },
          {
            path: PATHS.ADMIN.STAGES,
            children: [
              { index: true, element: wrap(<StagesPage />) },
              { path: ':id',  element: wrap(<StageDetailPage />) },
            ],
          },
          { path: PATHS.ADMIN.HOSPITALS,    element: wrap(<InfrastructurePage />) },
          { path: PATHS.ADMIN.EMPLOYEES,   element: wrap(<EmployeesPage />)      },
          { path: PATHS.ADMIN.ATTENDANCE,  element: wrap(<AttendancePage />)     },
          { path: PATHS.ADMIN.ASSIGNMENTS, element: wrap(<AssignmentsPage />)    },
        ],
      },

      // ── Employee zone ─────────────────────────────────────────────────────
      {
        path: PATHS.EMPLOYEE.ROOT,
        element: (
          <AuthGuard requiredRole={[Roles.Employee, Roles.Professor]}>
            <EmployeeLayout />
          </AuthGuard>
        ),
        children: [
          { index: true,                           element: wrap(<EmployeeDashboardPage />)  },
          { path: PATHS.EMPLOYEE.PROFILE,          element: wrap(<EmployeeProfilePage />)   },
          { path: PATHS.EMPLOYEE.SERVICES,         element: wrap(<EmployeeServicesPage />)  },
        ],
      },

      // ── Utility ───────────────────────────────────────────────────────────
      {
        element: <SimpleLayout />,
        children: [
          { path: PATHS.UNAUTHORIZED, element: <UnauthorizedPage /> },
          { path: PATHS.NO_PROFILE,   element: <NoProfilePage />    },
        ],
      },
    ],
  },
]);
