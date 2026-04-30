'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  hasProfile: boolean;
}

interface AuthContextType {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  status: 'loading',
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Alternative to next-auth's useSession
export function useSession() {
  const { user, status } = useAuth();
  return { data: user ? { user } : null, status };
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login'];

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${backendUrl}/auth/me`, { 
        headers,
        credentials: token ? 'omit' : 'include' 
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    } catch (err) {
      console.error('[Auth] Check failed:', err);
      setUser(null);
      setStatus('unauthenticated');
    }
  };

  useEffect(() => {
    checkAuth();

    // Listen for the login token from Electron's main process
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.onDeepLinkAuth((data: any) => {
        if (data && data.token) {
          localStorage.setItem('authToken', data.token);
          checkAuth(); // Update the UI state immediately
        }
      });
    }
  }, [pathname]);

  const logout = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      await fetch(`${backendUrl}/auth/logout`, { 
        method: 'POST',
        credentials: 'include' 
      });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
      }
      setUser(null);
      setStatus('unauthenticated');
      router.push('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  // Route protection — only redirect for non-public routes
  useEffect(() => {
    const isPublic = PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith('/login')
    );
    if (status === 'unauthenticated' && !isPublic) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, status, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
