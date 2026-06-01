import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { CitizenLoginPage } from '@/routes/citizen/LoginPage';
import { CitizenDashboardPage } from '@/routes/citizen/DashboardPage';
import { AdminLoginPage } from '@/routes/admin/LoginPage';
import { AdminDashboardPage } from '@/routes/admin/DashboardPage';
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
  { path: '/admin', element: <AdminLoginPage /> },
  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute type="admin">
        <AdminDashboardPage />
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
