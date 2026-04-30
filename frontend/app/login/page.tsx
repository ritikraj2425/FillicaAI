'use client';

import { useSession } from '@/components/AuthProvider';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function LoginContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === 'authenticated') {
      const redirect = searchParams.get('redirect') || '/';
      router.replace(redirect);
    }
  }, [status, router, searchParams]);

  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' &&
    (navigator.userAgent.toLowerCase().includes('electron') || !!(window as any).electronAPI);

  const handleGoogleLogin = async () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    if (isElectron) {
      try {
        const electronAPI = (window as any).electronAPI;
        const port = await electronAPI.startAuthServer();
        const authUrl = `${backendUrl}/auth/google?app_source=electron&local_port=${port}`;
        window.open(authUrl, '_blank');
      } catch (e) {
        console.error("Failed to start auth server", e);
      }
    } else {
      window.location.href = `${backendUrl}/auth/google`;
    }
  };

  // Listen for deep link auth (Electron only)
  useEffect(() => {
    if (!isElectron) return;

    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.onDeepLinkAuth) return;

    electronAPI.onDeepLinkAuth((data: any) => {
      console.log('[Login] Received deep link auth:', data);

      if (data.token) {
        localStorage.setItem('authToken', data.token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('userId', data.user.id);
        }

        // Redirect to dashboard
        router.push('/');
      }
    });

    return () => {
      electronAPI.offDeepLinkAuth?.();
    };
  }, [isElectron, router]);

  return (
    <div style={styles.container}>
      {/* Background decoration */}
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />
      <div style={styles.bgGrid} />

      <div style={styles.card} className="animate-slide-up">
        {/* Logo */}
        <div style={styles.logoContainer}>
          <Image src="/logo.png" width={52} height={52} alt="Fillica logo" />
          <h1 style={styles.logoText}>Fillica</h1>
        </div>

        {isElectron && (
          <div style={styles.desktopBadge}>
            Desktop Application
          </div>
        )}

        <p style={styles.subtitle}>
          AI-powered job application automation.
          <br />
          Fill forms faster. Apply smarter.
        </p>

        <button
          onClick={handleGoogleLogin}
          style={styles.googleBtn}
          id="google-login-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>secure authentication</span>
          <span style={styles.dividerLine} />
        </div>

        <p style={styles.footer}>
          By signing in, you agree to let Fillica assist with your job applications.
          Your data is stored securely and never shared.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--nav-bg)',
      }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--nav-bg)',
  },
  bgOrb1: {
    position: 'absolute',
    top: '-20%',
    right: '-10%',
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(13, 148, 136, 0.15) 0%, transparent 70%)',
    filter: 'blur(80px)',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: '-20%',
    left: '-10%',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(5, 150, 105, 0.1) 0%, transparent 70%)',
    filter: 'blur(80px)',
  },
  bgGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
    backgroundSize: '60px 60px',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 440,
    margin: '0 20px',
    padding: 48,
    borderRadius: 'var(--radius-xl)',
    textAlign: 'center' as const,
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #0D9488, #34D399)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    lineHeight: 1.6,
    marginBottom: 32,
  },
  desktopBadge: {
    display: 'inline-block',
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'rgba(16, 185, 129, 0.9)',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 16,
    border: '1px solid rgba(16, 185, 129, 0.3)',
    whiteSpace: 'nowrap',
  },
  googleBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '14px 24px',
    background: 'white',
    color: '#1f2937',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '24px 0 16px',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    fontWeight: 500,
  },
  footer: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
    lineHeight: 1.5,
  },
};
