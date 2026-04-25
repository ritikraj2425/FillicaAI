'use client';

import { useSession } from '@/components/AuthProvider';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { useSocket } from '@/lib/useSocket';

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  workplace: string;
}



export default function ApplyPage() {
  const { status, data: sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const [agentStatus, setAgentStatus] = useState<'idle' | 'connecting' | 'navigating' | 'analyzing' | 'planning' | 'executing' | 'review' | 'completed' | 'failed' | 'cancelled'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [playwrightCode, setPlaywrightCode] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState('');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  const { socket, isConnected, emit } = useSocket({ url: backendUrl, autoConnect: true });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/');
      return;
    }
    fetch(`${backendUrl}/jobs/${jobId}`)
      .then((r) => r.json())
      .then((data) => setJob(data.job))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [jobId, status, backendUrl, router]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on('agent_status', (data: { status: any, message: string }) => {
      setAgentStatus(data.status);
      setStatusMessage(data.message);
    });

    socket.on('agent_actions', (data: { playwright_code: string, plan: string }) => {
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
      socket.off('agent_action_progress');
      socket.off('agent_complete');
      socket.off('agent_error');
      socket.off('agent_screenshot_stream');
    };
  }, [socket]);

  const handleStart = () => {
    if (!userId || !jobId) return;
    setPlaywrightCode('');
    setAgentStatus('connecting');
    emit('start_agent', { userId, jobId });
  };

  const handleCancel = () => {
    emit('cancel_agent', { jobId, userId });
  };



  const handleSubmit = () => {
    emit('user_submit', { userId, jobId });
  };

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
          <p>Job not found</p>
          <button className="btn btn-secondary" onClick={() => router.push('/')}>Back to Jobs</button>
        </div>
      </Navbar>
    );
  }

  const isAiActive = ['connecting', 'navigating', 'analyzing', 'planning', 'executing'].includes(agentStatus);

  return (
    <Navbar>
      <div className="agent-container animate-fade-in">
        <div className={`agent-sidebar ${isAiActive ? 'ai-glow-active' : ''}`} style={{ flex: 1, maxWidth: 800, margin: '0 auto', position: 'relative' }}>
          {/* Status Header */}
          <div className="agent-header">
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>AI Application Engine</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Automating application for {job.company}</p>
            </div>
            <StatusBadge status={agentStatus} />
          </div>

          <div style={{ padding: '20px 24px', fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>
            {statusMessage || 'Ready to begin.'}
          </div>

          {/* Professional Action Feed */}
          <div className="agent-feed" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '32px 24px' }}>
            {agentStatus === 'idle' ? (
              <div style={{ textAlign: 'center', color: '#64748b' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px', opacity: 0.5 }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <p>Click Start Automation to launch local Chrome</p>
              </div>
            ) : agentStatus === 'cancelled' ? (
              <div style={{ textAlign: 'center', color: '#ef4444' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 12px' }}>
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <p>Run Cancelled.</p>
              </div>
            ) : agentStatus === 'failed' ? (
              <div style={{ textAlign: 'center', color: '#ef4444' }}>
                <p>Automation encountered an error.</p>
              </div>
            ) : agentStatus === 'review' ? (
              <div style={{ textAlign: 'center', color: '#10b981' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 12px' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p style={{ fontWeight: 500 }}>Ready for Manual Review</p>
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Browser is open on your desktop.</p>
              </div>
            ) : agentStatus === 'completed' ? (
              <div style={{ textAlign: 'center', color: '#10b981' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 16px' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Application Marked as Done!</h3>
                <p style={{ color: '#64748b', fontSize: 14 }}>The automation session has been closed. You can now go back to your dashboard.</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#0f172a' }}>
                <div className="spinner" style={{ borderColor: '#cbd5e1', borderTopColor: '#0ea5e9', marginBottom: 16, display: 'inline-block', width: 32, height: 32 }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>AI is analyzing the page</h3>
                <p style={{ color: '#64748b', fontSize: 14, maxWidth: 400, margin: '0 auto' }}>
                  {currentPlan || 'Mapping fields to your profile data and preparing to fill the form...'}
                </p>
              </div>
            )}
          </div>

          {/* Control Bar */}
          <div className="agent-control-bar">
            {agentStatus === 'idle' && (
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleStart} disabled={!isConnected}>
                {isConnected ? 'Start Automation' : 'Connecting...'}
              </button>
            )}

            {isAiActive && (
              <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleCancel}>
                Stop Agent
              </button>
            )}

            {agentStatus === 'review' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
                <div style={{ fontSize: 13, color: 'var(--warning)', background: 'rgba(217,119,6,0.1)', padding: 12, borderRadius: 8 }}>
                  <strong>Manual Review Required:</strong> Check the browser view. Please fill any missing or low-confidence fields directly in the browser, then click Submit on the form.
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleCancel}>
                    Cancel Run
                  </button>
                  <button className="btn btn-success" style={{ flex: 1 }} onClick={handleSubmit}>
                    Mark as Done
                  </button>
                </div>
              </div>
            )}
            {agentStatus === 'failed' && (
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => router.push('/')}>
                  Back to Jobs
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleStart}>
                  Retry Automation
                </button>
              </div>
            )}
            {['completed', 'cancelled'].includes(agentStatus) && (
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => router.push('/')}>
                Back to Jobs
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Centered AI Status Pill */}
      {isAiActive && (
        <div className="ai-status-pill">
          <span className="ai-status-dot" />
          Fillica AI: {statusMessage || 'Initializing...'}
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
          height: calc(100vh - 64px - 64px);
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
          background: #fafafa;
        }
        .agent-feed {
          flex: 1;
          overflow-y: auto;
          padding: 0 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
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
      `}</style>
    </Navbar>
  );
}

function StatusBadge({ status }: { status: string }) {
  let bg = 'rgba(107,114,128,0.1)';
  let color = 'var(--text-secondary)';
  const label = status.toUpperCase();

  if (['analyzing', 'planning', 'executing', 'connecting', 'navigating'].includes(status)) {
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
      {['analyzing', 'planning', 'executing', 'connecting', 'navigating'].includes(status) && (
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, animation: 'pulse-glow 1.5s infinite' }} />
      )}
      {label}
    </div>
  );
}

