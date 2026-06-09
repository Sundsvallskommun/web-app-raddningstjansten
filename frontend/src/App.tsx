import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { CitizenLoginPage } from '@/routes/citizen/LoginPage';
import { CitizenDashboardPage } from '@/routes/citizen/DashboardPage';
import { ErrandFormPage } from '@/routes/citizen/ErrandFormPage';
import { MyErrandsPage } from '@/routes/citizen/MyErrandsPage';
import { MyDecisionsPage } from '@/routes/citizen/MyDecisionsPage';
import { CitizenErrandDetailPage } from '@/routes/citizen/ErrandDetailPage';
import { AdminLoginPage } from '@/routes/admin/LoginPage';
import { AdminDashboardPage } from '@/routes/admin/DashboardPage';
import { AdminErrandsPage } from '@/routes/admin/ErrandsPage';
import { ErrandDetailPage } from '@/routes/admin/ErrandDetailPage';
import { NotFound } from '@/routes/NotFound';

// Two entry points in one SPA: citizen at "/", admin at "/admin".
const router = createBrowserRouter([
  { path: '/', element: <CitizenLoginPage /> },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute type="citizen">
        <CitizenDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/errand/new',
    element: (
      <ProtectedRoute type="citizen">
        <ErrandFormPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/errands',
    element: (
      <ProtectedRoute type="citizen">
        <MyErrandsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/errands/:id',
    element: (
      <ProtectedRoute type="citizen">
        <CitizenErrandDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/decisions',
    element: (
      <ProtectedRoute type="citizen">
        <MyDecisionsPage />
      </ProtectedRoute>
    ),
  },
  { path: '/admin', element: <AdminLoginPage /> },
  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute type="admin">
        <AdminDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/errands',
    element: (
      <ProtectedRoute type="admin">
        <AdminErrandsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/errands/:id',
    element: (
      <ProtectedRoute type="admin">
        <ErrandDetailPage />
      </ProtectedRoute>
    ),
  },
  { path: '*', element: <NotFound /> },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
