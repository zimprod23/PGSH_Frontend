import { createBrowserRouter, Outlet } from 'react-router-dom';
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
const DashboardHomePage    = lazy(() => import('../features/student/pages/DashboardHomePage'));
const ProfilePage          = lazy(() => import('../features/student/pages/ProfilePage'));
const StageListPage        = lazy(() => import('../features/student/pages/stages/StageListPage'));
const StageDetailsPage     = lazy(() => import('../features/student/pages/stages/StageDetailsPage'));
const ServiceDetailPage    = lazy(() => import('../features/student/pages/ServiceDetailPage'));
const HistoryPage          = lazy(() => import('../features/student/pages/HistoryPage'));
const DemandsPage          = lazy(() => import('../features/student/pages/DemandsPage'));

// ─── Lazy-loaded admin pages ──────────────────────────────────────────────────
const AdminDashboardPage      = lazy(() => import('../features/admin/pages/AdminDashboardPage'));
const StudentListPage         = lazy(() => import('../features/admin/pages/students/StudentListPage'));
const AdminStudentDetailPage  = lazy(() => import('../features/admin/pages/students/AdminStudentDetailPage'));
const AcademicYearsPage       = lazy(() => import('../features/admin/pages/AcademicYearsPage'));
const LevelsPage              = lazy(() => import('../features/admin/pages/LevelsPage'));
const CurriculumPage          = lazy(() => import('../features/admin/pages/CurriculumPage'));
const GroupsPage              = lazy(() => import('../features/admin/pages/GroupsPage'));
const GroupDetailPage         = lazy(() => import('../features/admin/pages/GroupDetailPage'));
const StageTimelinePage       = lazy(() => import('../features/admin/pages/StageTimelinePage'));
const RepartitionPage         = lazy(() => import('../features/admin/pages/RepartitionPage'));
const RotationCyclePage       = lazy(() => import('../features/admin/pages/RotationCyclePage'));
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
          { path: PATHS.STUDENT.SERVICE_DETAIL, element: wrap(<ServiceDetailPage />) },
        ],
      },

      // ── Admin zone ────────────────────────────────────────────────────────
      // A secrétaire is an employee, not administration: the only screen here she may use is
      // Présences, which the backend scopes to the services she is staff of. Everything else needs
      // an administrative role, and gating it here keeps the menu from offering her pages the API
      // will refuse. Mirrors Roles.Administrative on the backend.
      {
        path: PATHS.ADMIN.ROOT,
        element: (
          <AuthGuard requiredRole={[Roles.Scolarite, Roles.SuperUser, Roles.Secretaire]}>
            <AdminLayout />
          </AuthGuard>
        ),
        children: [
          { path: PATHS.ADMIN.ATTENDANCE,  element: wrap(<AttendancePage />) },
          {
            element: (
              <AuthGuard requiredRole={[Roles.Scolarite, Roles.SuperUser]}>
                <Outlet />
              </AuthGuard>
            ),
            children: [
              { index: true,                          element: wrap(<AdminDashboardPage />)         },
              { path: PATHS.ADMIN.STUDENTS,           element: wrap(<StudentListPage />)           },
              { path: PATHS.ADMIN.STUDENT_DETAIL,     element: wrap(<AdminStudentDetailPage />)    },
              { path: PATHS.ADMIN.ACADEMIC_YEARS,     element: wrap(<AcademicYearsPage />)         },
              { path: PATHS.ADMIN.LEVELS,             element: wrap(<LevelsPage />)                },
              { path: PATHS.ADMIN.CURRICULUM,         element: wrap(<CurriculumPage />)            },
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
              { path: PATHS.ADMIN.TIMELINE,    element: wrap(<StageTimelinePage />) },
              { path: PATHS.ADMIN.REPARTITION, element: wrap(<RepartitionPage />)   },
              { path: PATHS.ADMIN.ROTATION_CYCLE, element: wrap(<RotationCyclePage />) },
              { path: PATHS.ADMIN.HOSPITALS,    element: wrap(<InfrastructurePage />) },
              { path: PATHS.ADMIN.EMPLOYEES,   element: wrap(<EmployeesPage />)      },
              { path: PATHS.ADMIN.ASSIGNMENTS, element: wrap(<AssignmentsPage />)    },
            ],
          },
        ],
      },

      // ── Employee zone ─────────────────────────────────────────────────────
      {
        path: PATHS.EMPLOYEE.ROOT,
        element: (
          <AuthGuard requiredRole={[Roles.Employee, Roles.Professor, Roles.Secretaire]}>
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
