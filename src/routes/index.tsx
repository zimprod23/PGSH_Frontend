import { createBrowserRouter, Navigate } from "react-router-dom";
import { PATHS } from "./paths";

// Layouts
import { StudentLayout } from "../layouts/StudentLayout";
import { SimpleLayout } from "../layouts/SimpleLayout";

// Error & Public Pages
import { ErrorPage } from "../features/errors/ErrorPage";
import { LandingPage } from "../features/public/pages/LandingPage";
// import { AuthGuard } from "../common/components/AuthGuard";
import { AboutPage } from "../features/public/pages/AboutPage";
import ProfilePage from "../features/student/pages/ProfilePage";
import HistoryPage from "../features/student/pages/HistoryPage";
import DemandsPage from "../features/student/pages/DemandsPage";
import StageListPage from "../features/student/pages/stages/StageListPage";
import StageDetailsPage from "../features/student/pages/stages/StageDetailsPage";

const Placeholder = (title: string) => <div>{title} Section</div>;

export const router = createBrowserRouter([
  {
    path: PATHS.ROOT,
    // THE BOUNCER: This catches all 404s and code crashes for everything below it
    errorElement: <ErrorPage />,
    children: [
      // 1. PUBLIC ZONE
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: "about",
        element: <AboutPage />,
      },

      // 2. PROTECTED STUDENT ZONE
      {
        path: PATHS.STUDENT.ROOT,
        element: (
          // <AuthGuard requiredRole="Student">
          <StudentLayout />
          // </AuthGuard>
        ),
        children: [
          {
            index: true,
            element: <Navigate to={PATHS.STUDENT.PROFILE} replace />,
          },
          {
            path: PATHS.STUDENT.STAGES,
            children: [
              {
                index: true, // Matches /student/stages
                element: <StageListPage />,
              },
              {
                path: ":id", // Matches /student/stages/123
                element: <StageDetailsPage />,
              },
            ],
          },
          {
            path: PATHS.STUDENT.PROFILE,
            element: <ProfilePage />,
          },
          {
            path: PATHS.STUDENT.DEMANDS,
            element: <DemandsPage />,
          },

          {
            path: PATHS.STUDENT.HISTORY,
            element: <HistoryPage />,
          },
        ],
      },

      // 3. UTILITY ZONE
      {
        element: <SimpleLayout />,
        children: [
          {
            path: PATHS.UNAUTHORIZED,
            element: <ErrorPage />,
          },
          // REMOVED path: "*" from here.
          // Unmatched URLs now bubble up to the top-level errorElement automatically.
        ],
      },
    ],
  },
]);
