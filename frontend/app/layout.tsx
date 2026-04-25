import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Fillica AI',
  description:
    'AI-powered job application automation. Fill job forms automatically with live browser control and real-time progress tracking.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div id="root-app">
          <AuthProvider>{children}</AuthProvider>
        </div>
        <div id="mobile-blocker">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" style={{ marginBottom: 24 }}>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>Desktop Required</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '300px' }}>
            Fillica AI is a desktop automation engine. It controls a real browser window on your computer to apply for jobs.
            <br /><br />
            Please open this website on your computer to start using the AI.
          </p>
        </div>
      </body>
    </html>
  );
}
