/**
 * OAuth callback handler
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';
import apiClient from '../api/client';
import ProgressIndicator from '../components/ProgressIndicator';

type ProgressStep = {
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
};

export default function AuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  
  const [showProgress, setShowProgress] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [progressMessage, setProgressMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    console.log('🔐 AuthCallback - Token received:', token);
    console.log('🔐 Current URL:', window.location.toString());
    console.log('🔐 Search params:', searchParams.toString());

    if (!token) {
      console.error('❌ No token in URL parameters');
      navigate('/login');
      return;
    }

    // Fetch user info
    console.log('📡 Fetching user info from /auth/me...');
    console.log('📡 API Client baseURL:', apiClient.defaults.baseURL);
    
    apiClient
      .get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(async (response) => {
        console.log('✅ User info fetched:', response.data);
        const userData = response.data.data;
        const { repository, ...user } = userData;
        
        console.log('💾 Calling login() with token and user:', { token, user });
        
        // Check if this is a guest user
        const isGuestUser = user.userId === 'guest' || user.email === 'guest@example.com';
        
        login(token, {
          ...user,
          isGuest: isGuestUser,
        });
        
        // Guest users: skip repository setup, go directly to dashboard
        if (isGuestUser) {
          console.log('👤 Guest user - skipping repository setup');
          setTimeout(() => {
            console.log('🚀 Navigating to dashboard...');
            navigate('/dashboard', { replace: true });
          }, 100);
          return;
        }
        
        // Regular users: Check if repository setup is needed
        if (!repository || !repository.exists || !repository.initialized) {
          console.log('📦 Repository needs setup:', repository);
          await setupRepository(token);
        } else {
          console.log('✅ Repository is ready');
          // Navigate to dashboard
          setTimeout(() => {
            console.log('🚀 Navigating to dashboard...');
            navigate('/dashboard', { replace: true });
          }, 100);
        }
      })
      .catch((error) => {
        console.error('❌ Auth error:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          fullURL: error.config?.baseURL + error.config?.url,
        });
        alert(`Login failed: ${error.response?.data?.error?.message || error.message}`);
        navigate('/login');
      });
  }, [searchParams, login, navigate]);

  const setupRepository = async (token: string) => {
    console.log('🏗️ Starting repository setup...');
    
    // Show progress UI
    setShowProgress(true);
    setProgressMessage(t('auth.setupRepo.message', 'Setting up your personal storage...'));
    setProgressSteps([
      { label: t('auth.setupRepo.checkRepo', 'Checking GitHub repository'), status: 'active' },
      { label: t('auth.setupRepo.createRepo', 'Creating repository'), status: 'pending' },
      { label: t('auth.setupRepo.initRepo', 'Initializing storage'), status: 'pending' },
      { label: t('auth.setupRepo.complete', 'Setup complete'), status: 'pending' },
    ]);

    try {
      // Update step 1
      setProgressSteps(prev => prev.map((step, i) => 
        i === 0 ? { ...step, status: 'completed' } : step
      ));

      // Update step 2
      setProgressSteps(prev => prev.map((step, i) => 
        i === 1 ? { ...step, status: 'active' } : step
      ));
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Call setup API
      console.log('📡 Calling /auth/setup-repo...');
      const response = await apiClient.post('/auth/setup-repo', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('✅ Repository setup complete:', response.data);

      // Update step 2
      setProgressSteps(prev => prev.map((step, i) => 
        i === 1 ? { ...step, status: 'completed' } : step
      ));

      // Update step 3
      setProgressSteps(prev => prev.map((step, i) => 
        i === 2 ? { ...step, status: 'active' } : step
      ));

      await new Promise(resolve => setTimeout(resolve, 500));

      setProgressSteps(prev => prev.map((step, i) => 
        i === 2 ? { ...step, status: 'completed' } : step
      ));

      // Update step 4
      setProgressSteps(prev => prev.map((step, i) => 
        i === 3 ? { ...step, status: 'active' } : step
      ));

      await new Promise(resolve => setTimeout(resolve, 500));

      setProgressSteps(prev => prev.map((step, i) => 
        i === 3 ? { ...step, status: 'completed' } : step
      ));

      // Wait a bit and navigate to dashboard
      setTimeout(() => {
        console.log('🚀 Navigating to dashboard...');
        navigate('/dashboard', { replace: true });
      }, 1000);

    } catch (error: any) {
      console.error('❌ Repository setup error:', error);
      
      // Mark current step as error
      setProgressSteps(prev => prev.map(step => 
        step.status === 'active' ? { ...step, status: 'error' } : step
      ));
      
      setProgressMessage(t('auth.setupRepo.error', 'Setup failed. Please try again.'));
      
      // Show error but still allow to proceed
      // Repository might have been created, just not fully initialized
      setTimeout(() => {
        console.log('⚠️ Setup had issues but proceeding to dashboard');
        console.log('📝 Repository will be initialized on first use');
        navigate('/dashboard', { replace: true });
      }, 2000);
    }
  };

  if (showProgress) {
    return (
      <ProgressIndicator 
        steps={progressSteps}
        message={progressMessage}
      />
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '100vh'
    }}>
      <div>Authenticating...</div>
    </div>
  );
}

