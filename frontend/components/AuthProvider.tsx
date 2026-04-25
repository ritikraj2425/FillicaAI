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
      const res = await fetch(`${backendUrl}/auth/me`, { credentials: 'include' });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    } catch {
      setUser(null);
      setStatus('unauthenticated');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuth();
  }, [pathname]); // Re-check on route change

  const logout = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      await fetch(`${backendUrl}/auth/logout`, { 
        method: 'POST',
        credentials: 'include' 
      });
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
