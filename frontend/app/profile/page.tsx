'use client';

import { useSession } from '@/components/AuthProvider';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

interface Profile {
  name: string;
  email: string;
  phone: string;
  location: string;
  resumeUrl: string;
  skills: string[];
  education: Array<{
    institute: string;
    degree: string;
    field: string;
    startYear: number;
    endYear: number;
  }>;
  workExperience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  projects: Array<{
    title: string;
    description: string;
    techStack: string[];
    link: string;
  }>;
  links?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    twitter?: string;
    other?: string[];
  };
  demographics?: {
    gender?: string;
    race?: string;
    veteran?: string;
    disability?: string;
    pronouns?: string;

  };
  workAuthorization?: {
    visaStatus?: string;
    sponsorshipNeeded?: boolean;
  };
  expectedSalary?: string;
  achievements?: string[];
  defaultPassword?: string;
  aiConfiguration?: {
    provider: 'google' | 'openai' | 'anthropic' | 'deepseek';
    model: string;
    apiKey?: string;
  };
  bio?: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ text: string; type: string } | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [aiConfig, setAiConfig] = useState({ provider: 'google' as any, model: 'gemini-flash-latest', apiKey: '' });
  const [isEditingAi, setIsEditingAi] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  const fetchProfile = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${backendUrl}/profile`, { 
        headers,
        credentials: 'include' 
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        if (data.profile.defaultPassword) {
          setPassword('********');
          setIsEditingPassword(false);
        } else {
          setIsEditingPassword(true);
        }

        if (data.profile.aiConfiguration) {
          setAiConfig({
            provider: data.profile.aiConfiguration.provider || 'google',
            model: data.profile.aiConfiguration.model || 'gemini-flash-latest',
            apiKey: data.profile.aiConfiguration.apiKey || ''
          });
          if (data.profile.aiConfiguration.apiKey === '********') {
            setIsEditingAi(false);
          } else {
            setIsEditingAi(true);
          }
        } else {
          setIsEditingAi(true);
        }
      }
    } catch {
      // Profile doesn't exist yet
      setIsEditingAi(true);
      setIsEditingPassword(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAiConfig = async () => {
    if (!aiConfig.apiKey || aiConfig.apiKey === '********') {
      if (isEditingAi) setIsEditingAi(false);
      return;
    }
    setSavingAi(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${backendUrl}/profile/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ aiConfiguration: aiConfig }),
        credentials: 'include'
      });
      if (res.ok) {
        setMessage({ text: 'AI Configuration saved successfully!', type: 'success' });
        await fetchProfile();
        setIsEditingAi(false);
      } else {
        const data = await res.json();
        setMessage({ text: data.error || 'Failed to save AI configuration', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Failed to save AI configuration', type: 'error' });
    } finally {
      setSavingAi(false);
    }
  };

  const handleSavePassword = async () => {
    if (!password || password === '********') return;
    setSavingPassword(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${backendUrl}/profile/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ defaultPassword: password }),
        credentials: 'include'
      });
      if (res.ok) {
        setMessage({ text: 'Credentials saved successfully', type: 'success' });
        setPassword('********');
        setIsEditingPassword(false);
        await fetchProfile();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || 'Failed to save credentials', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error saving credentials', type: 'error' });
    }
    setSavingPassword(false);
  };

  const handleUpdateProfile = async (data: any) => {
    try {
      // Clean up skills array — filter empty entries from comma-separated input
      const cleanData = { ...data };
      if (Array.isArray(cleanData.skills)) {
        cleanData.skills = cleanData.skills.filter((s: string) => s && s.trim().length > 0);
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${backendUrl}/profile/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(cleanData),
        credentials: 'include'
      });
      if (res.ok) {
        const result = await res.json();
        setProfile(result.profile);
        setEditingSection(null);
        setMessage({ text: 'Profile updated successfully', type: 'success' });
      } else {
        setMessage({ text: 'Update failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error', type: 'error' });
    }
    setIsSaving(false);
  };

  const startEditing = (section: string, data: any) => {
    setEditingSection(section);
    setEditData(JSON.parse(JSON.stringify(data)));
    setMessage(null);
  };

  const handleEditChange = (path: string, value: any) => {
    const newData = { ...editData };
    const keys = path.split('.');
    let current = newData;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setEditData(newData);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage({ text: 'Please select a resume file.', type: 'error' });
      return;
    }

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('aiConfiguration', JSON.stringify(aiConfig));

    try {
      // Use /create for new profile, /resume for update
      const endpoint = profile ? `${backendUrl}/profile/resume` : `${backendUrl}/profile/create`;
      const method = profile ? 'PUT' : 'POST';

      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(endpoint, {
        method,
        headers,
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ text: profile ? 'Profile updated successfully!' : 'Profile created successfully!', type: 'success' });
        setProfile(data.profile);
        setFile(null);
        setShowUpdateForm(false);
      } else {
        setMessage({ text: data.error || 'Upload failed', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Navbar>
      <div className="animate-fade-in" style={{ paddingBottom: 60, maxWidth: 840, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 300, marginBottom: 8, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
          Your Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 16, maxWidth: 600 }}>
          Your profile acts as your master application profile, powered by AI to automatically match and apply to roles perfectly suited for your background.
        </p>

        {profile && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glow)',
            borderRadius: 16,
            padding: '12px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 14,
            color: 'var(--accent-primary)',
            boxShadow: 'var(--accent-glow)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
            <strong>Tip:</strong> Core data like experience and education are automatically extracted from your resume. Update them below if needed.
          </div>
        )}

        {/* Personal AI Configuration (Always accessible) */}
        <div className="tsenta-card" style={{ border: '1px solid #1e293b', background: 'rgba(13, 148, 136, 0.05)', marginBottom: '24px' }}>
          <div className="tsenta-card-header" style={{ borderBottom: '1px solid #1e293b', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0d9488', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                Personal AI Configuration
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Configure your own AI provider to power the automation agent.</p>
            </div>
            {!isEditingAi && (
              <button
                onClick={() => setIsEditingAi(true)}
                className="btn"
                style={{ background: '#1e293b', color: '#fff', fontSize: '0.75rem', padding: '6px 12px' }}
              >
                {aiConfig.apiKey ? 'Update Configuration' : 'Setup AI Provider'}
              </button>
            )}
          </div>
          <div className="tsenta-card-body" style={{ padding: '20px', minHeight: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '8px', display: 'block' }}>AI Provider</label>
                <select
                  className="input"
                  value={aiConfig.provider}
                  disabled={!isEditingAi}
                  onChange={(e) => {
                    const provider = e.target.value;
                    let defaultModel = 'gemini-flash-latest';
                    if (provider === 'openai') defaultModel = 'gpt-4o-mini';
                    if (provider === 'anthropic') defaultModel = 'claude-sonnet-4-20250514';
                    if (provider === 'deepseek') defaultModel = 'deepseek-chat';
                    setAiConfig({ ...aiConfig, provider, model: defaultModel });
                  }}
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #1e293b', color: '#fff' }}
                >
                  <option value="google">Google Gemini</option>
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '8px', display: 'block' }}>Select Model</label>
                <select
                  className="input"
                  value={aiConfig.model}
                  disabled={!isEditingAi}
                  onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #1e293b', color: '#fff' }}
                >
                  {aiConfig.provider === 'google' && (
                    <>
                      <option value="gemini-flash-latest">Gemini Flash (Latest/Free)</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash (Requires Quota)</option>
                    </>
                  )}
                  {aiConfig.provider === 'openai' && (
                    <>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                      <option value="gpt-4.1">GPT-4.1</option>
                    </>
                  )}
                  {aiConfig.provider === 'anthropic' && (
                    <>
                      <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                      <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    </>
                  )}
                  {aiConfig.provider === 'deepseek' && (
                    <>
                      <option value="deepseek-chat">DeepSeek Chat</option>
                      <option value="deepseek-coder">DeepSeek Coder</option>
                      <option value="deepseek-reasoner">DeepSeek Reasoner</option>
                    </>
                  )}
                </select>
              </div>
              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', marginBottom: '8px', display: 'block' }}>API Key</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    {isEditingAi ? (
                      <input
                        type="password"
                        className="input"
                        placeholder={`Paste your ${aiConfig.provider} API Key`}
                        value={aiConfig.apiKey === '********' ? '' : aiConfig.apiKey}
                        onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                        style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #1e293b', color: '#fff' }}
                      />
                    ) : (
                      <div style={{ height: '40px', display: 'flex', alignItems: 'center', padding: '0 12px', background: 'rgba(13, 148, 136, 0.1)', border: '1px solid #0d9488', borderRadius: '8px', color: '#0d9488', fontSize: '0.875rem' }}>
                        {aiConfig.apiKey ? (
                          <>
                            <span style={{ marginRight: '8px' }}>●●●●●●●●●●●●●●●●</span>
                            <span style={{ fontSize: '0.7rem', background: '#0d9488', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Saved</span>
                          </>

                        ) : (
                          <span style={{ marginRight: '8px' }}></span>

                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isEditingAi && (
              <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setIsEditingAi(false);
                    fetchProfile();
                  }}
                  className="btn"
                  style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #1e293b' }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveAiConfig}
                  disabled={savingAi || !aiConfig.apiKey}
                  style={{ background: '#0d9488', color: '#fff', padding: '8px 24px' }}
                >
                  {savingAi ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{
              width: 32, height: 32, margin: '0 auto 12px',
              border: '3px solid var(--border-color)',
              borderTopColor: 'var(--accent-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            Loading your profile data...
          </div>
        ) : (!profile || !profile.resumeUrl) ? (
          /* ─── Upload Resume (First Time or Required) ─── */
          <div className="tsenta-card-body" style={{ background: '#ffffff', borderRadius: 20, padding: 48, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', minHeight: 'auto' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-primary)' }}>
              <div style={{ padding: 10, background: 'rgba(13,148,136,0.1)', borderRadius: 12 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              Create Your AI Profile
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
              Upload a PDF resume to get started. Our AI will instantly parse your experience, education, and skills. Once created, you can seamlessly apply to any job with one click.
            </p>

            <ResumeUploadForm
              file={file}
              setFile={setFile}
              uploading={uploading}
              message={message}
              onSubmit={handleUpload}
              buttonText="Upload & Create Profile"
              loadingText="Processing with AI..."
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* ─── Profile Display ─── */}
            {/* Header card */}
            <div className="tsenta-card-body" style={{ background: '#ffffff', borderRadius: 20, padding: 32, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', position: 'relative', minHeight: 'auto' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--accent-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {profile.name?.charAt(0) || '?'}
              </div>

              {editingSection === 'header' ? (
                <div style={{ flex: 1, minWidth: 200, display: 'grid', gap: 12 }}>
                  <input className="input" value={editData.name} onChange={(e) => handleEditChange('name', e.target.value)} placeholder="Full Name" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input className="input" value={editData.email} onChange={(e) => handleEditChange('email', e.target.value)} placeholder="Email" />
                    <input className="input" value={editData.phone} onChange={(e) => handleEditChange('phone', e.target.value)} placeholder="Phone" />
                  </div>
                  <input className="input" value={editData.location} onChange={(e) => handleEditChange('location', e.target.value)} placeholder="Location (e.g. New York, NY)" />
                  <textarea
                    className="input"
                    style={{ minHeight: 80, borderRadius: 12 }}
                    value={editData.bio || ''}
                    onChange={(e) => handleEditChange('bio', e.target.value)}
                    placeholder="Professional Bio / Summary (used for 'Tell us about yourself' questions)"
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button className="tsenta-apply-btn" onClick={() => handleUpdateProfile(editData)} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: 100, fontSize: 13 }} onClick={() => setEditingSection(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <h2 style={{ fontSize: 28, fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 4 }}>{profile.name}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                      {profile.email} • {profile.phone} • {profile.location}
                    </p>
                    {profile.bio && (
                      <p style={{ color: 'var(--text-primary)', fontSize: 14, marginTop: 12, opacity: 0.8, lineHeight: 1.5, maxWidth: 600 }}>
                        {profile.bio}
                      </p>
                    )}
                  </div>
                  <div style={{ position: 'absolute', top: 16, right: 16 }}>
                    <EditButton onClick={() => startEditing('header', { name: profile.name, email: profile.email, phone: profile.phone, location: profile.location, bio: profile.bio })} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: 20, marginTop: 4 }}>
                {profile.resumeUrl && (
                  <a
                    href={profile.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="modal-footer-link"
                    style={{ background: 'var(--bg-secondary)', padding: '10px 20px', borderRadius: 100, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
                  >
                    View Original Resume
                  </a>
                )}
                <button
                  className="tsenta-apply-btn"
                  style={{ padding: '10px 24px' }}
                  onClick={() => { setShowUpdateForm(!showUpdateForm); setMessage(null); setFile(null); }}
                >
                  {showUpdateForm ? 'Cancel' : 'Update Resume'}
                </button>
              </div>
            </div>

            {/* Update Profile Form (toggle) */}
            {showUpdateForm && (
              <div className="tsenta-card-body animate-fade-in" style={{ padding: 40, background: '#e0f2f1', borderRadius: 20, minHeight: 'auto' }}>
                <h3 className="modal-section-title" style={{ color: '#004d40', display: 'flex', alignItems: 'center', gap: 10 }}>
                  Upload New Resume
                </h3>
                <p style={{ color: '#004d40', opacity: 0.8, fontSize: 14, marginBottom: 24 }}>
                  Your profile data will be completely replaced and re-structured based on your new PDF resume.
                </p>
                <ResumeUploadForm
                  file={file}
                  setFile={setFile}
                  uploading={uploading}
                  message={message}
                  onSubmit={handleUpload}
                  buttonText="Parse & Update Profile"
                  loadingText="Re-processing with AI..."
                />
              </div>
            )}

            {/* Automation Credentials */}
            <div className="tsenta-card-body" style={{ background: '#ffffff', borderRadius: 20, padding: '24px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', height: "auto", minHeight: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 300 }}>
                  <h3 className="modal-section-title" style={{ marginBottom: 4 }}>
                    Automation Login Credentials
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 0 }}>
                    Provide a default password so the AI can automatically sign in or register on job portals.
                  </p>
                  {message && (message.text.toLowerCase().includes('credential') || message.text.toLowerCase().includes('password')) && (
                    <div
                      className={`badge ${message.type === 'success' ? 'badge-success' : 'badge-error'}`}
                      style={{ marginTop: 12, display: 'inline-block' }}
                    >
                      {message.text}
                    </div>
                  )}
                </div>

                {isEditingPassword ? (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input
                      type="password"
                      value={password === '********' ? '' : password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (message) setMessage(null);
                      }}
                      placeholder="Enter new password"
                      style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 14, width: 220 }}
                    />
                    <button
                      className="tsenta-apply-btn"
                      style={{ padding: '8px 20px', fontSize: 13 }}
                      onClick={handleSavePassword}
                      disabled={savingPassword || !password || password === '********'}
                    >
                      {savingPassword ? 'Saving...' : 'Save'}
                    </button>
                    {profile.defaultPassword && (
                      <button
                        className="btn-secondary"
                        style={{ padding: '8px 16px', borderRadius: 100, fontSize: 13 }}
                        onClick={() => {
                          setIsEditingPassword(false);
                          setPassword('********');
                          setMessage(null);
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', padding: '6px 12px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}></div>
                      <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>Password Saved</span>
                    </div>
                    <button
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: 13, borderRadius: 100, border: '1px solid var(--border-color)', fontWeight: 500 }}
                      onClick={() => {
                        setIsEditingPassword(true);
                        setPassword('');
                        setMessage(null);
                      }}
                    >
                      Update Default Password
                    </button>
                  </div>
                )}
              </div>
            </div>

            <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />



            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
              {/* Skills */}
              <div className="tsenta-card-body" style={{ background: '#ffffff', borderRadius: 20, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', position: 'relative', minHeight: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="modal-section-title" style={{ marginBottom: 0 }}>
                    Skills & Technologies
                  </h3>
                  {editingSection !== 'skills' && <EditButton onClick={() => startEditing('skills', { skills: profile.skills })} />}
                </div>

                {editingSection === 'skills' ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <textarea
                      className="input"
                      style={{ minHeight: 100, lineHeight: 1.5 }}
                      value={Array.isArray(editData.skills) ? editData.skills.join(', ') : (editData.skills || '')}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setEditData({ ...editData, skills: raw.split(',').map(s => s.trim()) });
                      }}
                      placeholder="Enter skills separated by commas (e.g. React, Node.js, Python)"
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="tsenta-apply-btn" onClick={() => handleUpdateProfile(editData)} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: 100, fontSize: 13 }} onClick={() => setEditingSection(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="modal-skill-tags">
                    {profile.skills?.map((skill, i) => (
                      <span key={i} className="modal-skill-tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Education */}
              <div className="tsenta-card-body" style={{ background: '#ffffff', borderRadius: 20, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', position: 'relative', minHeight: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="modal-section-title" style={{ marginBottom: 0 }}>
                    Education
                  </h3>
                  {editingSection !== 'education' && <EditButton onClick={() => startEditing('education', { education: profile.education })} />}
                </div>

                {editingSection === 'education' ? (
                  <div style={{ display: 'grid', gap: 20 }}>
                    {editData.education?.map((edu: any, idx: number) => (
                      <div key={idx} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, display: 'grid', gap: 10 }}>
                        <input className="input" value={edu.institute} onChange={(e) => {
                          const newEdu = [...editData.education];
                          newEdu[idx].institute = e.target.value;
                          setEditData({ ...editData, education: newEdu });
                        }} placeholder="Institute" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <input className="input" value={edu.degree} onChange={(e) => {
                            const newEdu = [...editData.education];
                            newEdu[idx].degree = e.target.value;
                            setEditData({ ...editData, education: newEdu });
                          }} placeholder="Degree" />
                          <input className="input" value={edu.field} onChange={(e) => {
                            const newEdu = [...editData.education];
                            newEdu[idx].field = e.target.value;
                            setEditData({ ...editData, education: newEdu });
                          }} placeholder="Field of Study" />
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="tsenta-apply-btn" onClick={() => handleUpdateProfile(editData)} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: 100, fontSize: 13 }} onClick={() => setEditingSection(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  profile.education?.map((edu, i) => (
                    <div key={i} className="modal-desc-block">
                      <h4 className="modal-desc-label">{edu.institute}</h4>
                      <p className="modal-desc-text" style={{ fontSize: 16 }}>{edu.degree} in {edu.field}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                        {edu.startYear} – {edu.endYear || 'Present'}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Achievements */}
              <div className="tsenta-card-body" style={{ background: '#ffffff', borderRadius: 20, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', position: 'relative', minHeight: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="modal-section-title" style={{ marginBottom: 0 }}>
                    Achievements & Awards
                  </h3>
                  {editingSection !== 'achievements' && <EditButton onClick={() => startEditing('achievements', { achievements: profile.achievements })} />}
                </div>

                {editingSection === 'achievements' ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <textarea
                      className="input"
                      style={{ minHeight: 120, lineHeight: 1.5 }}
                      value={editData.achievements?.join('\n')}
                      onChange={(e) => handleEditChange('achievements', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                      placeholder="Enter each achievement on a new line"
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="tsenta-apply-btn" onClick={() => handleUpdateProfile(editData)} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: 100, fontSize: 13 }} onClick={() => setEditingSection(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
                    {profile.achievements?.map((ach, i) => (
                      <li key={i} style={{ marginBottom: 8 }}>{ach}</li>
                    ))}
                    {!profile.achievements?.length && <li style={{ listStyle: 'none', marginLeft: -20, opacity: 0.6 }}>No achievements listed</li>}
                  </ul>
                )}
              </div>

              {/* Links & Socials */}
              <div className="tsenta-card-body" style={{ background: '#ffffff', borderRadius: 20, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', position: 'relative', minHeight: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="modal-section-title" style={{ marginBottom: 0 }}>
                    Links & Portfolios
                  </h3>
                  {editingSection !== 'links' && <EditButton onClick={() => startEditing('links', { links: profile.links || {} })} />}
                </div>

                {editingSection === 'links' ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>LinkedIn URL</label>
                      <input className="input" value={editData.links?.linkedin || ''} onChange={(e) => handleEditChange('links.linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>GitHub URL</label>
                      <input className="input" value={editData.links?.github || ''} onChange={(e) => handleEditChange('links.github', e.target.value)} placeholder="https://github.com/..." />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Portfolio URL</label>
                      <input className="input" value={editData.links?.portfolio || ''} onChange={(e) => handleEditChange('links.portfolio', e.target.value)} placeholder="https://..." />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button className="tsenta-apply-btn" onClick={() => handleUpdateProfile(editData)} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: 100, fontSize: 13 }} onClick={() => setEditingSection(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div className="modal-desc-block" style={{ marginBottom: 0 }}>
                      <h4 className="modal-desc-label" style={{ fontSize: 12, textTransform: 'uppercase', opacity: 0.6 }}>LinkedIn</h4>
                      <p className="modal-desc-text" style={{ fontSize: 14 }}>{profile.links?.linkedin || 'Not provided'}</p>
                    </div>
                    <div className="modal-desc-block" style={{ marginBottom: 0 }}>
                      <h4 className="modal-desc-label" style={{ fontSize: 12, textTransform: 'uppercase', opacity: 0.6 }}>GitHub</h4>
                      <p className="modal-desc-text" style={{ fontSize: 14 }}>{profile.links?.github || 'Not provided'}</p>
                    </div>
                    <div className="modal-desc-block" style={{ marginBottom: 0 }}>
                      <h4 className="modal-desc-label" style={{ fontSize: 12, textTransform: 'uppercase', opacity: 0.6 }}>Portfolio</h4>
                      <p className="modal-desc-text" style={{ fontSize: 14 }}>{profile.links?.portfolio || 'Not provided'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Common Job Questions */}
              <div className="tsenta-card-body" style={{ gridColumn: '1 / -1', background: 'var(--nav-bg)', color: 'white', borderRadius: 20, padding: 32, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', position: 'relative', minHeight: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h3 className="modal-section-title" style={{ color: 'white', marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                    Common Job Application Data
                  </h3>
                  {editingSection !== 'common' && (
                    <EditButton
                      color="white"
                      onClick={() => startEditing('common', {
                        demographics: profile.demographics || {},
                        workAuthorization: profile.workAuthorization || {},
                        expectedSalary: profile.expectedSalary
                      })}
                    />
                  )}
                </div>

                {editingSection === 'common' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
                    <div style={{ display: 'grid', gap: 12 }}>
                      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Demographics</h4>
                      <select className="input" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }} value={editData.demographics?.gender || ''} onChange={(e) => handleEditChange('demographics.gender', e.target.value)}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                        <option value="Other">Other</option>
                      </select>
                      <input
                        className="input"
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                        value={editData.demographics?.pronouns || ''}
                        onChange={(e) => handleEditChange('demographics.pronouns', e.target.value)}
                        placeholder="Pronouns (e.g. He/Him, They/Them)"
                      />
                      <select className="input" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }} value={editData.demographics?.race || ''} onChange={(e) => handleEditChange('demographics.race', e.target.value)}>
                        <option value="">Select Race/Ethnicity</option>
                        <option value="Asian">Asian</option>
                        <option value="Black or African American">Black or African American</option>
                        <option value="Hispanic or Latino">Hispanic or Latino</option>
                        <option value="White">White</option>
                        <option value="Native American or Alaska Native">Native American or Alaska Native</option>
                        <option value="Native Hawaiian or Pacific Islander">Native Hawaiian or Pacific Islander</option>
                        <option value="Two or more races">Two or more races</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                      <select className="input" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }} value={editData.demographics?.veteran || ''} onChange={(e) => handleEditChange('demographics.veteran', e.target.value)}>
                        <option value="">Veteran Status</option>
                        <option value="I am not a veteran">I am not a veteran</option>
                        <option value="I am a veteran">I am a veteran</option>
                        <option value="I am a protected veteran">I am a protected veteran</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                      <select className="input" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }} value={editData.demographics?.disability || ''} onChange={(e) => handleEditChange('demographics.disability', e.target.value)}>
                        <option value="">Disability Status</option>
                        <option value="Yes, I have a disability">Yes, I have a disability</option>
                        <option value="No, I don't have a disability">{"No, I don't have a disability"}</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Work Authorization</h4>
                      <select className="input" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }} value={editData.workAuthorization?.visaStatus || ''} onChange={(e) => handleEditChange('workAuthorization.visaStatus', e.target.value)}>
                        <option value="">Select Visa Status</option>
                        <option value="US Citizen">US Citizen</option>
                        <option value="Permanent Resident (Green Card)">Permanent Resident (Green Card)</option>
                        <option value="H-1B">H-1B</option>
                        <option value="OPT/CPT">OPT/CPT</option>
                        <option value="L-1">L-1</option>
                        <option value="TN">TN</option>
                        <option value="Other Work Visa">Other Work Visa</option>
                        <option value="Require Sponsorship">Require Sponsorship</option>
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                        <input type="checkbox" checked={!!editData.workAuthorization?.sponsorshipNeeded} onChange={(e) => handleEditChange('workAuthorization.sponsorshipNeeded', e.target.checked)} />
                        Sponsorship Needed?
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Compensation</h4>
                      <input className="input" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }} value={editData.expectedSalary || ''} onChange={(e) => handleEditChange('expectedSalary', e.target.value)} placeholder="Expected Salary (e.g. $120,000)" />
                      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                        <button className="tsenta-apply-btn" onClick={() => handleUpdateProfile(editData)} disabled={isSaving}>
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: 100, fontSize: 13, background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={() => setEditingSection(null)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
                    <div>
                      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 12 }}>Work Authorization</h4>
                      <div style={{ fontSize: 15 }}>
                        <div style={{ marginBottom: 4 }}>Status: <span style={{ opacity: 0.8 }}>{profile.workAuthorization?.visaStatus || 'Not set'}</span></div>
                        <div>Sponsorship: <span style={{ opacity: 0.8 }}>{profile.workAuthorization?.sponsorshipNeeded ? 'Yes' : 'No'}</span></div>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 12 }}>Demographics</h4>
                      <div style={{ fontSize: 14, opacity: 0.8, display: 'grid', gap: 4 }}>
                        <div>Gender: {profile.demographics?.gender || 'Not set'}</div>
                        <div>Pronouns: {profile.demographics?.pronouns || 'Not set'}</div>
                        <div>Race: {profile.demographics?.race || 'Not set'}</div>
                        <div>Veteran: {profile.demographics?.veteran || 'Not set'}</div>
                        <div>Disability: {profile.demographics?.disability || 'Not set'}</div>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 12 }}>Compensation</h4>
                      <div style={{ fontSize: 15 }}>
                        Expected: <span style={{ opacity: 0.8 }}>{profile.expectedSalary || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Work Experience */}
              <div className="tsenta-card-body" style={{ gridColumn: '1 / -1', background: '#ffffff', borderRadius: 20, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', position: 'relative', minHeight: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h3 className="modal-section-title" style={{ marginBottom: 0 }}>
                    Work Experience
                  </h3>
                  {editingSection !== 'work' && <EditButton onClick={() => startEditing('work', { workExperience: profile.workExperience })} />}
                </div>

                {editingSection === 'work' ? (
                  <div style={{ display: 'grid', gap: 32 }}>
                    {editData.workExperience?.map((exp: any, idx: number) => (
                      <div key={idx} style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 16, display: 'grid', gap: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <input className="input" value={exp.role} onChange={(e) => {
                            const newWork = [...editData.workExperience];
                            newWork[idx].role = e.target.value;
                            setEditData({ ...editData, workExperience: newWork });
                          }} placeholder="Role" />
                          <input className="input" value={exp.company} onChange={(e) => {
                            const newWork = [...editData.workExperience];
                            newWork[idx].company = e.target.value;
                            setEditData({ ...editData, workExperience: newWork });
                          }} placeholder="Company" />
                        </div>
                        <textarea
                          className="input"
                          style={{ minHeight: 80 }}
                          value={exp.description}
                          onChange={(e) => {
                            const newWork = [...editData.workExperience];
                            newWork[idx].description = e.target.value;
                            setEditData({ ...editData, workExperience: newWork });
                          }}
                          placeholder="Description"
                        />
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="tsenta-apply-btn" onClick={() => handleUpdateProfile(editData)} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: 100, fontSize: 13 }} onClick={() => setEditingSection(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 32 }}>
                    {profile.workExperience?.length ? (
                      profile.workExperience.map((exp, i) => (
                        <div key={i} className="modal-desc-block" style={{ marginBottom: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                            <h4 className="modal-desc-label" style={{ fontSize: 18, color: 'var(--text-primary)' }}>{exp.role}</h4>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: 100 }}>
                              {exp.startDate ? new Date(exp.startDate).getFullYear() : ''} – {exp.endDate ? new Date(exp.endDate).getFullYear() : 'Present'}
                            </span>
                          </div>
                          <p className="modal-desc-text" style={{ fontSize: 15, fontWeight: 500, color: 'var(--accent-primary)', marginBottom: 12 }}>{exp.company}</p>
                          {exp.description && (
                            <p className="modal-desc-text" style={{ opacity: 0.8 }}>
                              {exp.description}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No work experience listed</p>
                    )}
                  </div>
                )}
              </div>

              {/* Projects */}
              <div className="tsenta-card-body" style={{ gridColumn: '1 / -1', background: '#ffffff', borderRadius: 20, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', position: 'relative', minHeight: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h3 className="modal-section-title" style={{ marginBottom: 0 }}>
                    Projects
                  </h3>
                  {editingSection !== 'projects' && <EditButton onClick={() => startEditing('projects', { projects: profile.projects })} />}
                </div>

                {editingSection === 'projects' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
                    {editData.projects?.map((proj: any, idx: number) => (
                      <div key={idx} style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 16, display: 'grid', gap: 10 }}>
                        <input className="input" value={proj.title} onChange={(e) => {
                          const newProj = [...editData.projects];
                          newProj[idx].title = e.target.value;
                          setEditData({ ...editData, projects: newProj });
                        }} placeholder="Project Title" />
                        <textarea
                          className="input"
                          style={{ minHeight: 80 }}
                          value={proj.description}
                          onChange={(e) => {
                            const newProj = [...editData.projects];
                            newProj[idx].description = e.target.value;
                            setEditData({ ...editData, projects: newProj });
                          }}
                          placeholder="Description"
                        />
                        <input className="input" value={proj.link} onChange={(e) => {
                          const newProj = [...editData.projects];
                          newProj[idx].link = e.target.value;
                          setEditData({ ...editData, projects: newProj });
                        }} placeholder="Project Link (URL)" />
                      </div>
                    ))}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                      <button className="tsenta-apply-btn" onClick={() => handleUpdateProfile(editData)} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: 100, fontSize: 13 }} onClick={() => setEditingSection(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                    {profile.projects?.map((proj, i) => (
                      <div
                        key={i}
                        style={{
                          padding: 24,
                          background: 'var(--bg-primary)',
                          borderRadius: 16,
                        }}
                      >
                        <h4 className="modal-desc-label" style={{ fontSize: 16, marginBottom: 8 }}>{proj.title}</h4>
                        <p className="modal-desc-text" style={{ fontSize: 14, opacity: 0.85, marginBottom: 16, minHeight: 60 }}>
                          {proj.description?.substring(0, 150)}
                          {proj.description?.length > 150 ? '...' : ''}
                        </p>
                        {proj.techStack?.length > 0 && (
                          <div className="modal-skill-tags" style={{ marginBottom: 16 }}>
                            {proj.techStack.map((t, j) => (
                              <span key={j} className="modal-skill-tag" style={{ padding: '6px 14px', fontSize: 12 }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {proj.link && (
                          <a href={proj.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            View Project
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Navbar >
  );
}

/* ─── Resume Upload Form Component ─── */
function ResumeUploadForm({
  file, setFile, uploading, message, onSubmit, buttonText, loadingText,
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  uploading: boolean;
  message: { text: string; type: string } | null;
  onSubmit: (e: React.FormEvent) => void;
  buttonText: string;
  loadingText: string;
}) {
  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="resume-upload" className="dropzone">
        <input
          id="resume-upload"
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ display: 'none' }}
        />
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
        <span style={{ fontSize: 14, color: file ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: file ? 600 : 400 }}>
          {file ? file.name : 'Click to select PDF resume'}
        </span>
      </label>

      {message && (
        <div
          className={`badge ${message.type === 'success' ? 'badge-success' : 'badge-error'}`}
          style={{ marginTop: 16, padding: '8px 16px', fontSize: 13 }}
        >
          {message.text}
        </div>
      )}

      <button
        type="submit"
        className="tsenta-apply-btn"
        disabled={!file || uploading}
        style={{ marginTop: 24, padding: '14px 24px', width: '100%', fontSize: 15 }}
      >
        {uploading ? (
          <>
            <div style={{
              width: 18, height: 18,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginRight: 10,
              display: 'inline-block',
              verticalAlign: 'middle'
            }} />
            {loadingText}
          </>
        ) : buttonText}
      </button>
    </form>
  );
}

function EditButton({ onClick, color = 'var(--text-muted)' }: { onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 8,
        color, display: 'flex', alignItems: 'center', opacity: 0.6, transition: 'opacity 0.2s'
      }}
      className="edit-hover"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 14,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  item: {
    marginBottom: 14,
  },
  itemSub: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
};