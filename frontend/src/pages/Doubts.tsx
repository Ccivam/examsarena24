import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Doubt {
  _id: string;
  title: string;
  description: string;
  subject: string;
  status: 'open' | 'accepted' | 'pending_closure' | 'resolved' | 'flagged';
  student: { _id: string; name: string; picture: string };
  acceptedBy?: { _id: string; name: string; picture: string };
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  open:            { label: 'Open',            color: '#92400e', bg: '#fef3c7' },
  accepted:        { label: 'In Progress',     color: '#1d4ed8', bg: '#dbeafe' },
  pending_closure: { label: 'Awaiting Confirmation', color: '#6d28d9', bg: '#ede9fe' },
  resolved:        { label: 'Resolved ✓',      color: '#065f46', bg: '#d1fae5' },
  flagged:         { label: 'Not Cleared ⚑',  color: '#991b1b', bg: '#fee2e2' },
};

const Doubts: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [adminView, setAdminView] = useState<'all' | 'mine'>('all');

  // Raise doubt form
  const [form, setForm] = useState({ title: '', description: '', subject: 'General' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchDoubts = async (view?: string) => {
    setLoading(true);
    try {
      const params = isAdmin && view === 'mine' ? '?view=mine' : '';
      const res = await axios.get(`/api/doubts${params}`, { withCredentials: true });
      setDoubts(res.data);
    } catch {
      setMessage('Failed to load doubts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoubts(adminView);
  }, [adminView]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/api/doubts', form, { withCredentials: true });
      setForm({ title: '', description: '', subject: 'General' });
      setShowForm(false);
      setMessage('Doubt raised! A teacher will accept and help you soon.');
      fetchDoubts();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to raise doubt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="view-section">
      <div className="view-header">
        <div>
          <h2 className="view-title">{isAdmin ? 'Student Doubts' : 'Ask a Doubt'}</h2>
          <p className="view-subtitle">
            {isAdmin
              ? 'Accept open doubts and help students clear their concepts.'
              : 'Raise a doubt and a teacher will help you resolve it.'}
          </p>
        </div>
        {!isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Raise a Doubt'}
          </button>
        )}
      </div>

      {message && (
        <div className={`alert alert-${message.includes('Failed') ? 'error' : 'success'}`}
          style={{ marginBottom: '1.5rem' }}>
          {message}
          <button onClick={() => setMessage('')}
            style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Raise doubt form */}
      {showForm && !isAdmin && (
        <form onSubmit={handleSubmit}
          style={{ border: '1px solid var(--c-border)', padding: '2rem', marginBottom: '2rem', background: 'var(--c-paper-dark)' }}>
          <span className="section-label" style={{ marginBottom: '1.25rem' }}>New Doubt</span>
          <div className="form-group">
            <label className="form-label">Title * — summarise your doubt in one line</label>
            <input className="form-input" required maxLength={200}
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Why does projectile range become zero at 90°?" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select className="form-input" value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}>
                {['Physics', 'Chemistry', 'Mathematics', 'General'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description * — explain your doubt in detail</label>
            <textarea className="form-input" required rows={5} maxLength={3000}
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="I was solving a problem where... I don't understand why..." />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Raising...' : 'Raise Doubt'}
          </button>
        </form>
      )}

      {/* Admin view toggle */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['all', 'mine'] as const).map(v => (
            <button key={v} onClick={() => setAdminView(v)} style={{
              padding: '6px 16px', fontSize: '0.8rem',
              background: adminView === v ? 'var(--c-ink)' : 'transparent',
              color: adminView === v ? 'var(--c-paper)' : 'var(--c-ink-soft)',
              border: '1px solid var(--c-border)', cursor: 'pointer',
              fontFamily: 'var(--f-sans)',
            }}>
              {v === 'all' ? 'All Open Doubts' : 'My Sessions'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-container">Loading...</div>
      ) : doubts.length === 0 ? (
        <div className="empty-state">
          {isAdmin ? 'No doubts to show.' : "You haven't raised any doubts yet."}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {doubts.map(d => {
            const s = STATUS_LABELS[d.status];
            return (
              <Link key={d._id} to={`/doubts/${d._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  border: '1px solid var(--c-border)', padding: '1.25rem 1.5rem',
                  background: 'var(--c-paper)', transition: 'border-color 0.15s',
                  display: 'flex', alignItems: 'flex-start', gap: '1rem',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--c-ink)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-border)')}>
                  {/* Subject tag */}
                  <div style={{
                    flexShrink: 0, padding: '2px 8px', fontSize: '0.72rem',
                    background: 'var(--c-paper-dark)', border: '1px solid var(--c-border)',
                    fontWeight: 500, marginTop: '2px',
                  }}>
                    {d.subject}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.3rem' }}>
                      {d.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--c-ink-soft)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {isAdmin && (
                        <span>By <strong>{d.student?.name}</strong></span>
                      )}
                      {d.acceptedBy && (
                        <span>Teacher: <strong>{d.acceptedBy.name}</strong></span>
                      )}
                      <span>{new Date(d.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                  <span style={{
                    flexShrink: 0, padding: '3px 10px', fontSize: '0.72rem',
                    background: s.bg, color: s.color, fontWeight: 600, borderRadius: 2,
                  }}>
                    {s.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Doubts;
