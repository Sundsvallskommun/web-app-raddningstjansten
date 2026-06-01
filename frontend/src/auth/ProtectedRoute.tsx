import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from './AuthContext';

/**
 * Guards a route by requiring an authenticated user of the expected type.
 * Redirects to the matching login page otherwise.
 */
export function ProtectedRoute({
  type,
  children,
}: {
  type: 'citizen' | 'admin';
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user || user.type !== type) {
    return <Navigate to={type === 'admin' ? '/admin' : '/'} replace />;
  }

  return <>{children}</>;
}
