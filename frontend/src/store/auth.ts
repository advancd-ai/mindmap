/**
 * Authentication store using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  isGuest?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

// Check if we're in development mode
const isDev = import.meta.env.VITE_DEV_MODE === 'true';

// Development mode: auto-login with mock user
const initialState = isDev
  ? {
      token: 'dev_token_12345',
      user: {
        userId: 'choonho.son',
        email: 'choonho.son@gmail.com',
        name: 'Choonho Son',
      },
      isAuthenticated: true,
    }
  : {
      token: null,
      user: null,
      isAuthenticated: false,
    };

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,
      isGuest: false,
      login: (token, user) => {
        console.log('💾 Auth Store - login() called with:', { token, user });
        const isGuestUser = user.isGuest === true;
        set({ 
          token, 
          user, 
          isAuthenticated: true,
          isGuest: isGuestUser
        });
        console.log('💾 Auth Store - State updated to authenticated', { isGuest: isGuestUser });
      },
      logout: () => {
        console.log('💾 Auth Store - logout() called');
        set({ token: null, user: null, isAuthenticated: false, isGuest: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
