'use client';

import { useSession } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Navbar from '@/components/Navbar';

interface Job {
  _id: string;
  title: string;
  company: string;
  companyWebsite: string;
  location: string;
  type: string;
  category: string;
  workplace: string;
  term: string;
  tags: string[];
  shortDescription: string;
  description: string;
  aboutCompany: string;
  aboutYou: string;
  applicationUrl: string;
  matchPercent: number;
  accentBg: string;
  accentText: string;
  applied?: boolean;
  postedAt: string;
}

type FilterState = {
  type: string;
  workplace: string;
  location: string;
  term: string;
  category: string;
};

export default function HomePage() {
  const { status, data } = useSession();
  const user = data?.user;
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [creatingCustomJob, setCreatingCustomJob] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    type: 'All',
    workplace: 'All',
    location: 'All',
    term: 'All',
    category: 'All',
  });

  const isLoggedIn = status === 'authenticated';
  const hasProfile = user?.hasProfile ?? false;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(`${backendUrl}/jobs`, { 
      headers,
      credentials: token ? 'omit' : 'include'
    })
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [backendUrl]);

  // Derive unique filter options from data
  const filterOptions = useMemo(() => ({
    types: ['All', ...Array.from(new Set(jobs.map((j) => j.type)))],
    workplaces: ['All', ...Array.from(new Set(jobs.map((j) => j.workplace)))],
    locations: ['All', ...Array.from(new Set(jobs.map((j) => j.location)))],
    terms: ['All', ...Array.from(new Set(jobs.filter(j => j.term).map((j) => j.term)))],
    categories: ['All', ...Array.from(new Set(jobs.filter(j => j.category && j.category !== 'Custom').map((j) => j.category)))],
  }), [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        if (search) {
          const q = search.toLowerCase();
          if (
            !job.title.toLowerCase().includes(q) &&
            !job.company.toLowerCase().includes(q) &&
            !job.tags.some((t) => t.toLowerCase().includes(q))
          ) return false;
        }
        if (filters.type !== 'All' && job.type !== filters.type) return false;
        if (filters.workplace !== 'All' && job.workplace !== filters.workplace) return false;
        if (filters.location !== 'All' && job.location !== filters.location) return false;
        if (filters.term !== 'All' && job.term !== filters.term) return false;
        if (filters.category !== 'All' && job.category !== filters.category) return false;

        // Filter out individual custom jobs to deduplicate
        if (job.category === 'Custom') return false;

        return true;
      })
      .sort((a, b) => {
        // Primary sort: Date Posted (desc)
        const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
        const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        // Secondary sort: Match Percent (desc)
        return (b.matchPercent || 0) - (a.matchPercent || 0);
      });
  }, [jobs, search, filters]);

  const customJobs = useMemo(() => jobs.filter(j => j.category === 'Custom'), [jobs]);

  const daysAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    return diff === 0 ? 'Today' : diff === 1 ? '1 day ago' : `${diff} days ago`;
  };

  const handleApply = (job: Job) => {
    const isElectron = typeof window !== 'undefined' && 
      (navigator.userAgent.toLowerCase().includes('electron') || !!(window as any).electronAPI);

    if (!isLoggedIn) {
      if (isElectron && window.location.protocol === 'file:') {
        window.location.href = './login/index.html';
      } else {
        router.push('/login?redirect=/');
      }
      return;
    }
    if (!hasProfile) {
      if (isElectron && window.location.protocol === 'file:') {
        window.location.href = './profile/index.html?setup_required=true';
      } else {
        router.push('/profile?setup_required=true');
      }
      return;
    }
    if (isElectron && window.location.protocol === 'file:') {
      window.location.href = `./apply/index.html?id=${job._id}`;
    } else {
      router.push(`/apply?id=${job._id}`);
    }
  };

  const handleCustomUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl) return;
    if (!isLoggedIn) {
      router.push('/login?redirect=/');
      return;
    }
    if (!hasProfile) {
      router.push('/profile?setup_required=true');
      return;
    }

    setCreatingCustomJob(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${backendUrl}/jobs/custom`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: customUrl })
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/apply?id=${data.job._id}`);
      }
    } catch (err) {
      console.error(err);
    }
    setCreatingCustomJob(false);
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== 'All').length;

  const clearFilters = () => {
    setFilters({ type: 'All', workplace: 'All', location: 'All', term: 'All', category: 'All' });
    setSearch('');
  };

  return (
    <Navbar>
      {/* Custom URL Input */}
      <form onSubmit={handleCustomUrlSubmit} style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
        <input
          type="url"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          placeholder="Paste any custom job portal URL to automate..."
          style={{ flex: 1, padding: '14px 20px', borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 16 }}
          required
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '0 32px', fontSize: 15, borderRadius: 12 }}
          disabled={creatingCustomJob}
        >
          {creatingCustomJob ? 'Preparing...' : 'Automate URL'}
        </button>
        <button
          type="button"
          onClick={() => setShowHowItWorks(true)}
          className="btn btn-secondary"
          style={{ padding: '0 24px', fontSize: 15, borderRadius: 12, background: 'var(--bg-card)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, display: 'inline-block', verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          How It Works
        </button>
      </form>

      {/* Search Bar */}
      <div className="search-bar" style={{ marginBottom: 16 }}>
        <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search by title, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <FilterDropdown
          label="Category"
          value={filters.category}
          options={filterOptions.categories}
          onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
        />
        <FilterDropdown
          label="Job Type"
          value={filters.type}
          options={filterOptions.types}
          onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
        />
        <FilterDropdown
          label="Workplace"
          value={filters.workplace}
          options={filterOptions.workplaces}
          onChange={(v) => setFilters((f) => ({ ...f, workplace: v }))}
        />
        <FilterDropdown
          label="Location"
          value={filters.location}
          options={filterOptions.locations}
          onChange={(v) => setFilters((f) => ({ ...f, location: v }))}
        />
        <FilterDropdown
          label="Term"
          value={filters.term}
          options={filterOptions.terms}
          onChange={(v) => setFilters((f) => ({ ...f, term: v }))}
        />

        {(activeFilterCount > 0 || search) && (
          <button className="filter-chip" onClick={clearFilters} style={{ color: '#DC2626' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            Clear
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
          {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <div style={{ width: 32, height: 32, margin: '0 auto 12px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Loading jobs...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}>
          {/* Deduplicated Custom Jobs Card */}
          {customJobs.length > 0 && (
            <JobCard
              job={{
                _id: 'custom-group',
                title: 'Custom Applications',
                company: 'User Provided Portals',
                companyWebsite: 'Multiple Sites',
                location: 'Remote',
                type: 'Full-time',
                category: 'Custom',
                workplace: 'Remote',
                term: '',
                tags: ['Automated', 'Custom URL'],
                shortDescription: `You have automated ${customJobs.length} custom job portal${customJobs.length === 1 ? '' : 's'}.`,
                description: '',
                aboutCompany: '',
                aboutYou: '',
                applicationUrl: '',
                matchPercent: 100,
                accentBg: '#f0f9ff',
                accentText: '#0369a1',
                applied: customJobs.every(j => j.applied),
                postedAt: new Date().toISOString()
              }}
              isLoggedIn={isLoggedIn}
              hasProfile={hasProfile}
              daysAgo={daysAgo}
              onClick={() => setSelectedJob(customJobs[0])} // Just open modal with list
              onApply={() => { }} // No direct apply
              onToggleApplied={() => { }} // Group card doesn't need toggle
            />
          )}

          {filteredJobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              isLoggedIn={isLoggedIn}
              hasProfile={hasProfile}
              daysAgo={daysAgo}
              onClick={() => setSelectedJob(job)}
              onApply={() => handleApply(job)}
              onToggleApplied={async () => {
                try {
                  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
                  const headers: Record<string, string> = {};
                  if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                  }
                  const res = await fetch(`${backendUrl}/jobs/${job._id}/toggle-applied`, {
                    method: 'PATCH',
                    headers
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setJobs(jobs.map(j => j._id === job._id ? { ...j, applied: data.applied } : j));
                  }
                } catch (err) {
                  console.error(err);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredJobs.length === 0 && (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 16, opacity: 0.4 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>No jobs match your filters</p>
          <p style={{ fontSize: 14 }}>Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobModal
          job={selectedJob}
          allJobs={jobs}
          isLoggedIn={isLoggedIn}
          hasProfile={hasProfile}
          onClose={() => setSelectedJob(null)}
          onApply={(j) => handleApply(j)}
        />
      )}

      {showHowItWorks && (
        <HowItWorksModal onClose={() => setShowHowItWorks(false)} />
      )}
    </Navbar>
  );
}

/* ─── Filter Dropdown Component ─── */
function FilterDropdown({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const isActive = value !== 'All';

  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`filter-chip ${isActive ? 'active' : ''}`}
        style={{
          appearance: 'none',
          paddingRight: 28,
          cursor: 'pointer',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='${isActive ? '%23fff' : '%236B7280'}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === 'All' ? label : o}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─── Job Card Component (Tsenta Style) ─── */
function JobCard({ job, isLoggedIn, hasProfile, daysAgo, onClick, onApply, onToggleApplied }: {
  job: Job;
  isLoggedIn: boolean;
  hasProfile: boolean;
  daysAgo: (d: string) => string;
  onClick: () => void;
  onApply: () => void;
  onToggleApplied: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const closeMenu = () => setShowMenu(false);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [showMenu]);
  const isWhite = job.accentBg === '#ffffff';
  const maxTags = 3;
  const extraCount = Math.max(0, job.tags.length - maxTags);

  return (
    <div
      className="tsenta-card"
      onClick={onClick}
    >
      {/* Colored Body */}
      <div
        className="tsenta-card-body"
        style={{
          background: job.accentBg,
          color: '#292727ff',
        }}
      >
        {/* Top Row: date + term + match */}
        <div className="tsenta-card-top">
          <span className="tsenta-posted">{daysAgo(job.postedAt)}</span>
          {job.term && (
            <span
              className="tsenta-term"
              style={{
                background: isWhite ? 'rgba(13,148,136,0.08)' : `rgba(0,0,0,0.07)`,
                color: isWhite ? 'var(--accent-primary)' : job.accentText,
              }}
            >
              {job.term}
            </span>
          )}
          {isLoggedIn ? (
            hasProfile ? (
              <div className="tsenta-match">
                <span className="tsenta-match-pct">{job.matchPercent}%</span>
                <span className="tsenta-match-label">match</span>
              </div>
            ) : (
              <div className="tsenta-match" style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.7)' }} title="Create a profile to preview match">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
            )
          ) : null}
        </div>

        {/* Title */}
        <h3 className="tsenta-title">{job.title}</h3>

        {/* Short Description (only on colored cards) */}
        {job.shortDescription && !isWhite && (
          <p
            className="tsenta-short-desc"
            style={{ background: `rgba(0,0,0,0.06)` }}
          >
            {job.shortDescription}
          </p>
        )}

        {/* Tags */}
        <div className="tsenta-tags">
          {job.tags.slice(0, maxTags).map((tag) => (
            <span key={tag} className="tsenta-tag">{tag}</span>
          ))}
          {extraCount > 0 && (
            <span className="tsenta-tag tsenta-tag-extra">+{extraCount}</span>
          )}
        </div>

        {/* Arrow */}
        <div className="tsenta-arrow-wrap">
          <button
            className="tsenta-arrow"
            style={{
              background: "#000",
              color: 'white',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>

      {/* White Footer */}
      <div className="tsenta-card-footer">
        <div className="tsenta-company-info">
          <span className="tsenta-company-name">{job.company}</span>
          <span className="tsenta-company-url">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {job.companyWebsite.length > 18 ? job.companyWebsite.slice(0, 18) + '...' : job.companyWebsite}
          </span>
        </div>
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <button
            className="tsenta-dots"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            aria-label="More options"
          >
            ⋮
          </button>
          {showMenu && (
            <div className="card-menu animate-fade-in" style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 10,
              minWidth: 160,
              marginBottom: 8
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleApplied(); setShowMenu(false); }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 6,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#1e293b'
                }}
                className="menu-item-hover"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {job.applied ? (
                    <path d="M18 6L6 18M6 6l12 12" />
                  ) : (
                    <polyline points="20 6 9 17 4 12" />
                  )}
                </svg>
                {job.applied ? 'Mark as Not Applied' : 'Mark as Applied'}
              </button>
            </div>
          )}
        </div>
        {job.category === 'Custom' ? (
          <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            {job.applied ? '✓ Applied' : 'Custom Portal'}
          </div>
        ) : (
          <button
            className="tsenta-apply-btn"
            disabled={job.applied}
            style={job.applied ? { background: '#10b981', color: 'white' } : {}}
            onClick={(e) => { e.stopPropagation(); onApply(); }}
          >
            {job.applied ? 'Applied' : (!isLoggedIn || hasProfile ? 'Apply' : 'Setup Profile')}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Job Detail Modal (Right Panel) ─── */
function JobModal({ job, allJobs, isLoggedIn, hasProfile, onClose, onApply }: {
  job: Job;
  allJobs: Job[];
  isLoggedIn: boolean;
  hasProfile: boolean;
  onClose: () => void;
  onApply: (job: Job) => void;
}) {
  const customJobs = useMemo(() => allJobs.filter(j => j.category === 'Custom'), [allJobs]);
  // Close on Escape & Lock Background Scroll
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);

    // Lock background scroll
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = originalStyle;
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="modal-overlay" onClick={onClose} />

      {/* Panel */}
      <div className="modal-panel">
        {/* Scrollable Content */}
        <div className="modal-content">
          {/* Close Button */}
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Title */}
          <h2 className="modal-title">{job.title}</h2>

          {/* Company */}
          <p className="modal-company">
            {job.company}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" style={{ marginLeft: 6, verticalAlign: 'middle' }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </p>

          {/* Info Chips */}
          <div className="modal-chips">
            <span className="modal-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
              {job.type}
            </span>
            <span className="modal-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              {job.workplace}
            </span>
            {job.category && (
              <span className="modal-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
                {job.category}
              </span>
            )}
          </div>

          {/* Skills & Technologies */}
          <div className="modal-section">
            <h3 className="modal-section-title">Skills & Technologies</h3>
            <div className="modal-skill-tags">
              {job.tags.map((tag) => (
                <span key={tag} className="modal-skill-tag">{tag}</span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="modal-section">
            <h3 className="modal-section-title">Description</h3>

            <div className="modal-desc-block">
              <h4 className="modal-desc-label">Job Title</h4>
              <p className="modal-desc-text">{job.title}</p>
            </div>

            <div className="modal-desc-block">
              <h4 className="modal-desc-label">Location(s)</h4>
              <p className="modal-desc-text">{job.location}</p>
            </div>

            {job.aboutCompany && (
              <div className="modal-desc-block">
                <h4 className="modal-desc-label">About Us</h4>
                <p className="modal-desc-text">{job.aboutCompany}</p>
              </div>
            )}

            {job.description && (
              <div className="modal-desc-block">
                <h4 className="modal-desc-label">Role Overview</h4>
                <p className="modal-desc-text">{job.description}</p>
              </div>
            )}

            {job.aboutYou && (
              <div className="modal-desc-block">
                <h4 className="modal-desc-label">About you</h4>
                <p className="modal-desc-text">{job.aboutYou}</p>
              </div>
            )}
          </div>

          {job.category === 'Custom' && customJobs.length > 0 && (
            <div className="modal-section" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24, marginTop: 24 }}>
              <h3 className="modal-section-title">All Custom Applications</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {customJobs.map(cj => (
                  <div key={cj._id} style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: cj._id === job._id ? '#f0f9ff' : 'white',
                    borderColor: cj._id === job._id ? '#bae6fd' : '#e2e8f0'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{cj.company}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{cj.companyWebsite}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {cj.applied ? (
                        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✓ Applied</span>
                      ) : (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 12px', fontSize: 12, borderRadius: 6 }}
                          onClick={() => onApply(cj)}
                        >
                          Apply Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="modal-footer-left">
            {job.applicationUrl && (
              <a
                href={job.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-footer-link"
                onClick={(e) => e.stopPropagation()}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                View original posting
              </a>
            )}
          </div>
          <div className="modal-footer-right">
            {job.category !== 'Custom' && (
              <button
                className="tsenta-apply-btn"
                onClick={() => onApply(job)}
                disabled={job.applied}
                style={job.applied ? { background: '#10b981', color: 'white' } : {}}
              >
                {job.applied ? 'Applied' : (!isLoggedIn || hasProfile ? 'Apply' : 'Finish Profile to Apply')}
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function HowItWorksModal({ onClose }: { onClose: () => void }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }} />
      <div className="modal-panel" style={{ zIndex: 10001, maxWidth: 600 }}>
        <button className="modal-close" onClick={onClose} style={{ position: 'absolute', top: 20, right: 20 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
        <div className="modal-body" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>How Fillica AI Works</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>1</div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Complete Your Profile</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>Upload your resume and enter your API Key in the Profile tab. The AI will extract your skills, experience, and details automatically.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>2</div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Find or Paste a Job</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>Browse our curated list of jobs or paste a link to any job application portal directly into the URL bar on the dashboard.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>3</div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Watch the Magic</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>The AI will launch a real browser window on your computer, navigate the site, read the questions, and fill in the application form for you using your profile data. All you have to do is hit Submit!</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 32, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
            <strong>Note:</strong> Fillica AI runs locally on your machine to protect your privacy. A real Chrome browser window will open when automation starts.
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
