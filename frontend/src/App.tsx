import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import AuthCallback from './pages/AuthCallback';
import SharePage from './pages/SharePage';
import './App.css';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isDev = import.meta.env.VITE_DEV_MODE === 'true';

  console.log('🔐 App - isAuthenticated:', isAuthenticated, 'isDev:', isDev);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Share page - no auth required */}
        <Route path="/share/:token" element={<SharePage />} />
        
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <DashboardPage />
            ) : (
              <>
                {console.log('⚠️ Not authenticated, redirecting to login from /dashboard')}
                <Navigate to="/login" replace />
              </>
            )
          }
        />
        
        <Route
          path="/editor/:mapId?"
          element={isAuthenticated ? <EditorPage /> : <Navigate to="/login" replace />}
        />
        
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : (isDev ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />)
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

