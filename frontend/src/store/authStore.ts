import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isDevelopmentMode: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

// Development Mode Configuration
const isDevelopmentMode = import.meta.env.VITE_AUTH_MODE === 'development';

const developmentUser: User = {
  id: 1,
  email: 'developer@taskmaster.local',
  username: 'developer',
  full_name: 'Development User',
  role: 'admin',
};

// Initial state based on mode
const getInitialState = () => {
  if (isDevelopmentMode) {
    console.log('🔧 Development Mode: Auto-authentication enabled');
    return {
      user: developmentUser,
      accessToken: 'dev-mode-no-token-required',
      refreshToken: 'dev-mode-no-token-required',
      isAuthenticated: true,
      isDevelopmentMode: true,
    };
  }
  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isDevelopmentMode: false,
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...getInitialState(),
      login: (accessToken, refreshToken, user) =>
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        }),
      logout: () => {
        if (isDevelopmentMode) {
          // In dev mode, just reset to dev user
          set(getInitialState());
        } else {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isDevelopmentMode: false,
          });
        }
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

// Made with Bob
