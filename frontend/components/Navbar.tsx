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

  const navTabs = [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'My Profile' },
  ];

  return (
    <>
      {/* Top Navbar */}
      <header className="top-navbar">
        {/* Logo */}
        <div className="nav-logo" onClick={() => router.push('/')}>
          <div className="nav-logo-icon">
            <Image src={"/logo.png"} width={18} height={18} alt="Logo" />
          </div>
          <span className="nav-logo-text">Fillica AI</span>
        </div>

        {/* Center Nav Tabs */}
        <nav className="nav-center">
          {navTabs.map((tab) => (
            <button
              key={tab.href}
              className={`nav-tab ${pathname === tab.href ? 'active' : ''}`}
              onClick={() => router.push(tab.href)}
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
              onClick={() => router.push('/login')}
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
