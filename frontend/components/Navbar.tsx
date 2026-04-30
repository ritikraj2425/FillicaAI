'use client';

import { useAuth, useSession } from '@/components/AuthProvider';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import React from 'react';

interface NavbarProps {
  children?: React.ReactNode;
}

export default function Navbar({ children }: NavbarProps) {
  const { data: session, status } = useSession();
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isElectron = typeof window !== 'undefined' && 
    (navigator.userAgent.toLowerCase().includes('electron') || !!(window as any).electronAPI);

  const navigate = (href: string) => {
    if (isElectron && window.location.protocol === 'file:') {
      // In Electron static export, absolute router paths often fail.
      // We navigate to the specific HTML file using relative paths.
      const isRoot = pathname === '/' || pathname === '/index.html';
      if (href === '/') {
        window.location.href = isRoot ? './index.html' : '../index.html';
      } else {
        const cleanHref = href.startsWith('/') ? href.slice(1) : href;
        window.location.href = isRoot ? `./${cleanHref}/index.html` : `../${cleanHref}/index.html`;
      }
    } else {
      router.push(href);
    }
  };

  const navTabs = [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'My Profile' },
  ];

  return (
    <>
      {/* Top Navbar */}
      <header className="top-navbar">
        {/* Logo & Back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {pathname !== '/' && (
            <button 
              onClick={() => router.back()}
              style={{ 
                background: 'rgba(0,0,0,0.05)', 
                border: 'none', 
                cursor: 'pointer', 
                width: 32, height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)'
              }}
              title="Go Back"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
          <div className="nav-logo" onClick={() => navigate('/')}>
            <div className="nav-logo-icon">
              <Image src={"/logo.png"} width={18} height={18} alt="Logo" />
            </div>
            <span className="nav-logo-text">Fillica</span>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <nav className="nav-center">
          {navTabs.map((tab) => (
            <button
              key={tab.href}
              className={`nav-tab ${pathname === tab.href ? 'active' : ''}`}
              onClick={() => navigate(tab.href)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right Section */}
        <div className="nav-right">
          {status === 'authenticated' && session?.user ? (
            <>
              <div className="nav-user-chip">
                {session.user.avatar && (
                  <img
                    src={session.user.avatar}
                    alt="avatar"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span>{session.user.name?.split(' ')[0]}</span>
              </div>
              <button className="nav-action-btn" onClick={logout}>
                Sign Out
              </button>
            </>
          ) : status === 'unauthenticated' ? (
            <button
              className="nav-signin-btn"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          ) : null}
        </div>
      </header>

      {/* Main Content */}
      {children && (
        <main className="page-container animate-fade-in">
          {children}
        </main>
      )}
    </>
  );
}
