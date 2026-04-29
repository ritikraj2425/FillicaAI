'use client';

import { useSession } from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import { useSocket } from '@/lib/useSocket';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  workplace: string;
}

interface ApplyPageContentProps {
  jobId?: string | null;
}

type AgentStatus =
  | 'idle'
  | 'connecting'
  | 'navigating'
  | 'analyzing'
  | 'planning'
  | 'executing'
  | 'review'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface AgentStatusEvent {
  status: AgentStatus;
  message: string;
  playwright_code?: string;
  plan?: string;
}

interface AgentErrorEvent {
  error: string;
}

interface AgentCompleteEvent {
  message?: string;
}

interface ElectronAPI {
  startAgent: (jobId: string, userId: string, token: string, backendUrl: string) => Promise<void>;
  cancelAgent: (jobId: string, userId: string) => Promise<void>;
  submitAgent: (payload: { userId?: string; jobId?: string | null; token: string | null; backendUrl: string }) => Promise<void>;
  onAgentStatus: (callback: (data: AgentStatusEvent) => void) => void;
  onAgentError: (callback: (data: AgentErrorEvent) => void) => void;
  onAgentComplete: (callback: (data: AgentCompleteEvent) => void) => void;
  offAgentStatus: () => void;
  offAgentError: () => void;
  offAgentComplete: () => void;
}

type ElectronWindow = Window & {
  electronAPI?: ElectronAPI;
};

export default function ApplyPageContent({ jobId }: ApplyPageContentProps) {
  const { status, data: sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [playwrightCode, setPlaywrightCode] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState('');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  const { socket, isConnected: isSocketConnected, emit: socketEmit } = useSocket({ url: backendUrl, autoConnect: true });

  const isElectron = typeof window !== 'undefined' && !!(window as ElectronWindow).electronAPI;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/');
      return;
    }
    if (!jobId) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    fetch(`${backendUrl}/jobs/${jobId}`, { headers })
      .then((r) => r.json())
      .then((data) => setJob(data.job))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId, status, backendUrl, router]);

  useEffect(() => {
    if (!isElectron) return;

    const electronAPI = (window as ElectronWindow).electronAPI;
    if (!electronAPI) return;

    electronAPI.onAgentStatus((data) => {
      setAgentStatus(data.status);
      setStatusMessage(data.message);
      if (data.playwright_code) setPlaywrightCode(data.playwright_code);
      setCurrentPlan(data.plan || data.message || '');
    });

    electronAPI.onAgentError((data) => {
      setAgentStatus('failed');
      setStatusMessage(`Error: ${data.error}`);
    });

    electronAPI.onAgentComplete((data) => {
      setAgentStatus('completed');
      setStatusMessage(data.message || 'Automation completed successfully!');
    });

    return () => {
      electronAPI.offAgentStatus();
      electronAPI.offAgentError();
      electronAPI.offAgentComplete();
    };
  }, [isElectron]);

  useEffect(() => {
    if (!socket || isElectron) return;

    socket.on('agent_status', (data: AgentStatusEvent) => {
      setAgentStatus(data.status);
      setStatusMessage(data.message);
      setCurrentPlan(data.plan || data.message || '');
    });

    socket.on('agent_actions', (data: { playwright_code: string; plan: string }) => {
      setPlaywrightCode(data.playwright_code || '');
      setCurrentPlan(data.plan || '');
    });

    socket.on('agent_complete', (data: { message: string }) => {
      setAgentStatus('review');
      setStatusMessage(data.message);
    });

    socket.on('agent_error', (data: { error: string }) => {
      setAgentStatus('failed');
      setStatusMessage(`Error: ${data.error}`);
    });

    return () => {
      socket.off('agent_status');
      socket.off('agent_actions');
      socket.off('agent_complete');
      socket.off('agent_error');
    };
  }, [socket, isElectron]);

  const handleStart = async () => {
    if (!userId || !jobId) return;
    const token = localStorage.getItem('authToken');
    if (!token) {
      setAgentStatus('failed');
      setStatusMessage('Authentication token missing. Please sign out and sign in again to re-authenticate.');
      return;
    }

    setPlaywrightCode('');
    setCurrentPlan('');
    setAgentStatus('connecting');
    setStatusMessage('Initializing automation engine...');

    if (isElectron) {
      const electronAPI = (window as ElectronWindow).electronAPI;
      if (!electronAPI) {
        setAgentStatus('failed');
        setStatusMessage('Desktop automation bridge is unavailable.');
        return;
      }
      try {
        await electronAPI.startAgent(jobId, userId, token, backendUrl);
      } catch (err: unknown) {
        setAgentStatus('failed');
        setStatusMessage(`Failed to start: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else {
      socketEmit('start_agent', { userId, jobId, token });
    }
  };

  const handleCancel = () => {
    if (!userId || !jobId) return;
    if (isElectron) {
      (window as ElectronWindow).electronAPI?.cancelAgent(jobId, userId);
    } else {
      socketEmit('cancel_agent', { jobId, userId });
    }
  };

  const handleSubmit = () => {
    if (!userId || !jobId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    if (isElectron) {
      (window as ElectronWindow).electronAPI?.submitAgent({ userId, jobId, token, backendUrl });
    } else {
      socketEmit('user_submit', { userId, jobId });
    }
  };

  if (!jobId) {
    return (
      <Navbar>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <p>Missing application id</p>
          <button className="btn btn-secondary" onClick={() => router.push('/')}>Back to Jobs</button>
        </div>
      </Navbar>
    );
  }

  if (loading) {
    return (
      <Navbar>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <div className="spinner" />
          Loading...
        </div>
      </Navbar>
    );
  }

  if (!job) {
    return (
      <Navbar>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <p>{jobId ? 'Job not found' : 'Missing application id'}</p>
          <button className="btn btn-secondary" onClick={() => router.push('/')}>Back to Jobs</button>
        </div>
      </Navbar>
    );
  }

  const isAiActive = ['connecting', 'navigating', 'analyzing', 'planning', 'executing', 'initializing'].includes(agentStatus);
  const isConnected = isElectron || isSocketConnected;

  return (
    <Navbar>
      <div className="agent-container animate-fade-in">
        <div className={`agent-sidebar ${isAiActive ? 'ai-glow-active' : ''}`} style={{ flex: 1, maxWidth: 800, margin: '0 auto', position: 'relative' }}>
          <div className="agent-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => router.push('/')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 8,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  transition: 'background 0.2s'
                }}
                className="hover-bg-gray"
                title="Back to Dashboard"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>AI Application Engine</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Automating for {job.company}</p>
              </div>
            </div>
            <StatusBadge status={agentStatus} />
          </div>

          <div style={{ padding: '20px 24px', fontSize: 14, color: 'var(--text-primary)', marginBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
            {statusMessage || 'Ready to begin.'}
          </div>

          <div className="agent-feed" style={{ background: '#f8fafc', padding: '32px 24px', minHeight: 200 }}>
            {agentStatus === 'idle' ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>
                <div style={{ width: 64, height: 64, background: 'rgba(13, 148, 136, 0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" style={{ opacity: 0.8 }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
                <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>System Ready</p>
                <p style={{ fontSize: 13 }}>Click Start Automation to launch local Chrome instance</p>
              </div>
            ) : agentStatus === 'cancelled' ? (
              <div style={{ textAlign: 'center', color: '#ef4444', padding: '20px 0' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 12px' }}>
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <p style={{ fontWeight: 600 }}>Automation Cancelled</p>
              </div>
            ) : agentStatus === 'failed' ? (
              <div style={{ textAlign: 'center', color: '#ef4444', padding: '20px 0' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 12px' }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p style={{ fontWeight: 600 }}>Automation Failed</p>
              </div>
            ) : agentStatus === 'review' ? (
              <div style={{ textAlign: 'center', color: '#10b981', padding: '20px 0' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 12px' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p style={{ fontWeight: 600 }}>Manual Review Required</p>
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>The application form is open. Please review and confirm.</p>
              </div>
            ) : agentStatus === 'completed' ? (
              <div style={{ textAlign: 'center', color: '#10b981', padding: '20px 0' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 16px' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Application Finished!</h3>
                <p style={{ color: '#64748b', fontSize: 14 }}>The automation session is complete. You can now close this window.</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#0f172a' }}>
                <div className="spinner" style={{ borderColor: '#cbd5e1', borderTopColor: 'var(--accent-primary)', marginBottom: 20, display: 'inline-block', width: 40, height: 40, borderWidth: 4 }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>AI Agent Working</h3>
                <p style={{ color: '#64748b', fontSize: 14, maxWidth: 400, margin: '0 auto', lineHeight: 1.5 }}>
                  {currentPlan || playwrightCode || 'Processing application requirements...'}
                </p>
              </div>
            )}
          </div>

          <div className="agent-control-bar">
            {agentStatus === 'idle' && (
              <button className="btn btn-primary" style={{ width: '100%', height: 48, fontSize: 16, fontWeight: 600 }} onClick={handleStart} disabled={!isConnected}>
                {isConnected ? 'Start Automation' : 'Establishing Connection...'}
              </button>
            )}

            {isAiActive && (
              <button className="btn btn-danger" style={{ width: '100%', height: 48, fontSize: 16, fontWeight: 600 }} onClick={handleCancel}>
                Stop Agent
              </button>
            )}

            {agentStatus === 'review' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                <div style={{ fontSize: 13, color: '#92400e', background: '#fffbeb', padding: 16, borderRadius: 12, border: '1px solid #fef3c7', lineHeight: 1.5 }}>
                  <strong>Action Required:</strong> The AI has filled the application. Please verify the information in the Chrome window and click &quot;Mark as Done&quot; here once you submit it.
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-secondary" style={{ flex: 1, height: 44 }} onClick={handleCancel}>
                    Cancel
                  </button>
                  <button className="btn btn-success" style={{ flex: 1, height: 44 }} onClick={handleSubmit}>
                    Mark as Done
                  </button>
                </div>
              </div>
            )}

            {agentStatus === 'failed' && (
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button className="btn btn-secondary" style={{ flex: 1, height: 44 }} onClick={() => router.push('/')}>
                  Exit
                </button>
                <button className="btn btn-primary" style={{ flex: 1, height: 44 }} onClick={handleStart}>
                  Retry
                </button>
              </div>
            )}

            {['completed', 'cancelled'].includes(agentStatus) && (
              <button className="btn btn-secondary" style={{ width: '100%', height: 44 }} onClick={() => router.push('/')}>
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>

      {isAiActive && (
        <div className="ai-status-pill">
          <span className="ai-status-dot" />
          Fillica: {statusMessage || 'Initializing...'}
        </div>
      )}

      <style jsx>{`
        @keyframes ai-moving-glow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes ai-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .agent-container {
          display: flex;
          gap: 24px;
          height: calc(100vh - 160px);
          max-height: 800px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .agent-sidebar.ai-glow-active {
          border-color: transparent;
          overflow: visible;
          z-index: 1;
        }
        .agent-sidebar.ai-glow-active::before {
          content: '';
          position: absolute;
          top: -3px; left: -3px; right: -3px; bottom: -3px;
          border-radius: calc(var(--radius-lg) + 2px);
          background: linear-gradient(90deg, rgba(13, 148, 136, 0.8), rgba(6, 182, 212, 0.8), rgba(139, 92, 246, 0.8), rgba(13, 148, 136, 0.8));
          background-size: 200% 200%;
          z-index: -1;
          animation: ai-moving-glow 3s linear infinite;
          filter: blur(6px);
          opacity: 0.8;
        }
        .agent-sidebar.ai-glow-active::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: var(--bg-card);
          border-radius: calc(var(--radius-lg) + 2px);
          z-index: -1;
        }
        .ai-status-pill {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(12px);
          color: #fff;
          padding: 10px 24px;
          border-radius: 100px;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(13, 148, 136, 0.3);
          display: flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
        }
        .ai-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #0d9488;
          animation: ai-dot-pulse 1.5s ease-in-out infinite;
        }
        .agent-sidebar {
          flex: 4;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .agent-header {
          padding: 24px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: #ffffff;
        }
        .agent-feed {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .agent-control-bar {
          padding: 24px;
          border-top: 1px solid var(--border-color);
          background: #ffffff;
        }
        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid var(--border-color);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .hover-bg-gray:hover {
          background-color: #f1f5f9 !important;
        }
      `}</style>
    </Navbar>
  );
}

function StatusBadge({ status }: { status: string }) {
  let bg = 'rgba(107,114,128,0.1)';
  let color = 'var(--text-secondary)';
  const label = status.toUpperCase();

  if (['analyzing', 'planning', 'executing', 'connecting', 'navigating', 'initializing'].includes(status)) {
    bg = 'rgba(13,148,136,0.1)';
    color = 'var(--accent-primary)';
  } else if (status === 'review' || status === 'paused_for_review') {
    bg = 'rgba(217,119,6,0.1)';
    color = 'var(--warning)';
  } else if (status === 'failed' || status === 'cancelled') {
    bg = 'rgba(220,38,38,0.1)';
    color = 'var(--error)';
  } else if (status === 'completed') {
    bg = 'rgba(5,150,105,0.1)';
    color = 'var(--success)';
  }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: bg, color, padding: '6px 12px', borderRadius: 100,
      fontSize: 12, fontWeight: 700, letterSpacing: 0.5
    }}>
      {['analyzing', 'planning', 'executing', 'connecting', 'navigating', 'initializing'].includes(status) && (
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, animation: 'pulse-glow 1.5s infinite' }} />
      )}
      {label}
    </div>
  );
}
