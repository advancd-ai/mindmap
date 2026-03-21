/**
 * Login page
 */

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';
import LanguageSelector from '../components/LanguageSelector';
import { getBackendBaseUrl } from '../config/runtime';
import './LoginPage.css';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const isDev = import.meta.env.VITE_DEV_MODE === 'true';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    // Development mode: auto-login
    if (isDev) {
      login('dev_token_12345', {
        userId: 'choonho.son',
        email: 'choonho.son@example.com',
        name: 'Choonho Son',
      });
      navigate('/dashboard');
      return;
    }

    // Production: Redirect to Google OAuth (dev: Vite proxies /api → backend)
    const apiUrl = getBackendBaseUrl();
    const authUrl = `${apiUrl}/auth/google`;
    console.log('🔐 Redirecting to:', authUrl);
    // Use window.location.assign() to avoid TrustedScriptURL error
    window.location.assign(authUrl);
  };

  const handleGuestLogin = async () => {
    // Guest login: call backend API to get guest session
    console.log('👤 Initiating guest login...');
    
    try {
      const apiUrl = getBackendBaseUrl();
      const response = await fetch(`${apiUrl}/auth/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Guest login failed');
      }

      const data = await response.json();
      console.log('✅ Guest session created:', data);

      // Login with guest token and user info
      login(data.data.token, {
        ...data.data.user,
        isGuest: true,
      });

      console.log('👤 Guest login successful');
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ Guest login error:', error);
      alert('Guest login failed. Please try again.');
    }
  };

  return (
    <div className="login-page">
      {/* Background Mindmap Pattern */}
      <svg className="login-bg-pattern" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
        <defs>
          {/* Gradient definitions */}
          <linearGradient id="nodeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#007AFF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#5856D6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="nodeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34C759" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#30D158" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="nodeGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9500" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FF3B30" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        {/* Connections */}
        <g className="connections" opacity="0.2">
          <path d="M 300 150 Q 450 200 600 150" stroke="#007AFF" strokeWidth="3" fill="none" strokeDasharray="5,5" />
          <path d="M 600 150 Q 750 100 900 150" stroke="#34C759" strokeWidth="3" fill="none" />
          <path d="M 300 400 Q 450 350 600 400" stroke="#FF9500" strokeWidth="3" fill="none" strokeDasharray="8,4" />
          <path d="M 150 550 Q 300 600 450 550" stroke="#5856D6" strokeWidth="3" fill="none" />
          <path d="M 750 550 Q 900 500 1050 550" stroke="#AF52DE" strokeWidth="3" fill="none" strokeDasharray="5,5" />
        </g>
        
        {/* Nodes */}
        <g className="nodes">
          {/* Center main node */}
          <rect x="560" y="360" width="180" height="80" rx="40" fill="url(#nodeGrad1)" />
          <text x="650" y="408" fontSize="18" fill="#007AFF" textAnchor="middle" fontWeight="600" opacity="0.5">Main Idea</text>
          
          {/* Top nodes */}
          <circle cx="300" cy="150" r="45" fill="url(#nodeGrad2)" />
          <text x="300" y="158" fontSize="14" fill="#34C759" textAnchor="middle" fontWeight="500" opacity="0.5">Concept</text>
          
          <rect x="530" y="110" width="140" height="80" rx="12" fill="url(#nodeGrad1)" />
          <text x="600" y="158" fontSize="14" fill="#007AFF" textAnchor="middle" fontWeight="500" opacity="0.5">Branch</text>
          
          <polygon points="900,130 950,110 1000,130 950,170" fill="url(#nodeGrad3)" />
          <text x="950" y="148" fontSize="14" fill="#FF9500" textAnchor="middle" fontWeight="500" opacity="0.5">Task</text>
          
          {/* Bottom nodes */}
          <rect x="230" y="360" width="140" height="80" rx="8" fill="url(#nodeGrad2)" />
          <text x="300" y="408" fontSize="14" fill="#34C759" textAnchor="middle" fontWeight="500" opacity="0.5">Detail</text>
          
          <ellipse cx="450" cy="550" rx="80" ry="50" fill="url(#nodeGrad3)" />
          <text x="450" y="558" fontSize="14" fill="#FF9500" textAnchor="middle" fontWeight="500" opacity="0.5">Note</text>
          
          <circle cx="150" cy="550" r="40" fill="url(#nodeGrad1)" />
          <text x="150" y="558" fontSize="13" fill="#007AFF" textAnchor="middle" fontWeight="500" opacity="0.5">Idea</text>
          
          {/* Right nodes */}
          <rect x="880" y="360" width="160" height="80" rx="40" fill="url(#nodeGrad2)" />
          <text x="960" y="408" fontSize="14" fill="#34C759" textAnchor="middle" fontWeight="500" opacity="0.5">Subtopic</text>
          
          <path d="M 750 520 L 850 520 L 820 580 L 700 580 Z" fill="url(#nodeGrad3)" />
          <text x="775" y="558" fontSize="14" fill="#FF9500" textAnchor="middle" fontWeight="500" opacity="0.5">Data</text>
          
          <rect x="980" y="510" width="120" height="80" rx="16" fill="url(#nodeGrad1)" />
          <text x="1040" y="558" fontSize="13" fill="#007AFF" textAnchor="middle" fontWeight="500" opacity="0.5">Point</text>
        </g>
      </svg>
      
      <div className="login-language">
        <LanguageSelector />
      </div>

      <div className="login-about">
        <Link to="/about" className="login-about-link">
          {t('common.about')}
        </Link>
      </div>
      
      <div className="login-container">
        <div className="login-card card">
          <h1 className="login-title">{t('login.title')}</h1>
          <p className="login-subtitle">
            {t('login.subtitle')}
          </p>
          
          <button onClick={handleLogin} className="button login-button google-button">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              style={{ marginRight: '12px' }}
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t('login.signInWithGoogle')}
          </button>

          <div className="login-divider">
            <span>{t('login.or', 'or')}</span>
          </div>

          <button onClick={handleGuestLogin} className="button login-button guest-button">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '12px' }}
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {t('login.continueAsGuest', 'Continue as Guest')}
          </button>

          <p className="guest-notice">
            {t('login.guestNotice', 'Guest mode: Your data will be stored locally and not synced.')}
          </p>

          <div className="login-features">
            <div className="feature-item">
              <span className="feature-icon">📝</span>
              <span className="feature-text">{t('login.features.create')}</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎨</span>
              <span className="feature-text">{t('login.features.shapes')}</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔗</span>
              <span className="feature-text">{t('login.features.connect')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
