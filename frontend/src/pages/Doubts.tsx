import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Doubt {
  _id: string;
  title: string;
  description: string;
  subject: string;
  status: 'open' | 'awaiting_payment' | 'accepted' | 'pending_closure' | 'resolved' | 'flagged';
  fee: number;
  student: { _id: string; name: string; picture: string };
  acceptedBy?: { _id: string; name: string; picture: string };
  createdAt: string;
}

interface TeacherApplication {
  _id: string;
  status: 'pending' | 'approved' | 'rejected';
  motivation: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  open:             { label: 'Open',                   color: '#92400e', bg: '#fef3c7' },
  awaiting_payment: { label: 'Awaiting Payment',       color: '#6d28d9', bg: '#ede9fe' },
  accepted:         { label: 'In Progress',            color: '#1d4ed8', bg: '#dbeafe' },
  pending_closure:  { label: 'Awaiting Confirmation',  color: '#6d28d9', bg: '#ede9fe' },
  resolved:         { label: 'Resolved ✓',             color: '#065f46', bg: '#d1fae5' },
  flagged:          { label: 'Not Cleared ⚑',         color: '#991b1b', bg: '#fee2e2' },
};

const Doubts: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isTeacher = user?.role === 'teacher';
  const isStaff = isAdmin || isTeacher;
  const isStudent = user?.role === 'student';

  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [staffView, setStaffView] = useState<'all' | 'mine'>('all');
  const [message, setMessage] = useState('');

  // Raise doubt form
  const [form, setForm] = useState({ title: '', description: '', subject: 'General' });
  const [submitting, setSubmitting] = useState(false);

  // Teacher application
  const [application, setApplication] = useState<TeacherApplication | null | false>(false); // false = not loaded
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);

  // Teacher profile editing
  const [showTeacherProfile, setShowTeacherProfile] = useState(false);
  const [teacherFee, setTeacherFee] = useState(String((user as any)?.feePerDoubt || 0));
  const [teacherUpi, setTeacherUpi] = useState((user as any)?.teacherUpiId || '');
  const [teacherBio, setTeacherBio] = useState((user as any)?.teacherBio || '');
  const [profileSaving, setProfileSaving] = useState(false);

  const fetchDoubts = async (view?: string) => {
    setLoading(true);
    try {
      const params = isStaff && view === 'mine' ? '?view=mine' : '';
      const res = await axios.get(`/api/doubts${params}`, { withCredentials: true });
      setDoubts(res.data);
    } catch {
      setMessage('Failed to load doubts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoubts(staffView); }, [staffView]);

  useEffect(() => {
    if (isStudent) {
      axios.get('/api/teacher-applications/my', { withCredentials: true })
        .then(r => setApplication(r.data))
        .catch(() => setApplication(null));
    }
  }, [isStudent]);

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

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplySubmitting(true);
    try {
      const res = await axios.post('/api/teacher-applications', { motivation }, { withCredentials: true });
      setApplication(res.data);
      setShowApplyForm(false);
      setMessage('Application submitted! You will be notified once reviewed.');
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleSaveTeacherProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await axios.put('/api/users/teacher/profile', {
        feePerDoubt: Number(teacherFee),
        teacherUpiId: teacherUpi,
        teacherBio,
      }, { withCredentials: true });
      setShowTeacherProfile(false);
      setMessage('Profile updated.');
    } catch {
      setMessage('Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <section className="view-section">
      <div className="view-header">
        <div>
          <h2 className="view-title">
            {isAdmin ? 'Student Doubts' : isTeacher ? 'Doubt Sessions' : 'Ask a Doubt'}
          </h2>
          <p className="view-subtitle">
            {isAdmin
              ? 'Review and manage student doubt sessions.'
              : isTeacher
              ? 'Accept open doubts and help students clear their concepts.'
              : 'Raise a doubt and a teacher will help you resolve it.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isTeacher && (
            <button className="btn" onClick={() => setShowTeacherProfile(!showTeacherProfile)}
              style={{ fontSize: '0.78rem' }}>
              ⚙ My Profile & Fee
            </button>
          )}
          {isStudent && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ Raise a Doubt'}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.includes('Failed') ? 'error' : 'success'}`}
          style={{ marginBottom: '1.5rem' }}>
          {message}
          <button onClick={() => setMessage('')}
            style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Teacher profile edit */}
      {isTeacher && showTeacherProfile && (
        <form onSubmit={handleSaveTeacherProfile}
          style={{ border: '1px solid var(--c-border)', padding: '2rem', marginBottom: '2rem', background: 'var(--c-paper-dark)' }}>
          <span className="section-label" style={{ marginBottom: '1.25rem' }}>Teacher Profile</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Fee per Doubt (₹) — set 0 for free</label>
              <input className="form-input" type="number" min="0" value={teacherFee}
                onChange={e => setTeacherFee(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Your UPI ID (for receiving monthly payout)</label>
              <input className="form-input" value={teacherUpi} placeholder="yourname@upi"
                onChange={e => setTeacherUpi(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Bio (shown to students)</label>
            <textarea className="form-input" rows={3} maxLength={500} value={teacherBio}
              onChange={e => setTeacherBio(e.target.value)}
              placeholder="Tell students about your expertise..." />
          </div>
          <button type="submit" className="btn btn-primary" disabled={profileSaving}>
            {profileSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      )}

      {/* Raise doubt form */}
      {showForm && isStudent && (
        <form onSubmit={handleSubmit}
          style={{ border: '1px solid var(--c-border)', padding: '2rem', marginBottom: '2rem', background: 'var(--c-paper-dark)' }}>
          <span className="section-label" style={{ marginBottom: '1.25rem' }}>New Doubt</span>
          <div className="form-group">
            <label className="form-label">Title * — summarise your doubt in one line</label>
            <input className="form-input" required maxLength={200}
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Why does projectile range become zero at 90°?" />
          </div>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <select className="form-input" value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}>
              {['Physics', 'Chemistry', 'Mathematics', 'General'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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

      {/* Become a teacher section (students only) */}
      {isStudent && application !== false && (
        <div style={{ border: '1px solid var(--c-border)', padding: '1.5rem', marginBottom: '2rem', background: 'var(--c-paper-dark)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Want to become a Doubt Solver?</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--c-ink-soft)' }}>
                Apply to become a teacher and earn by helping students.
              </div>
            </div>
            {!application ? (
              <button className="btn btn-primary" style={{ fontSize: '0.78rem' }}
                onClick={() => setShowApplyForm(!showApplyForm)}>
                {showApplyForm ? 'Cancel' : 'Apply Now'}
              </button>
            ) : (
              <span style={{
                padding: '4px 12px', fontSize: '0.78rem', fontWeight: 600, borderRadius: 2,
                background: application.status === 'approved' ? '#d1fae5' : application.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                color: application.status === 'approved' ? '#065f46' : application.status === 'rejected' ? '#991b1b' : '#92400e',
              }}>
                Application {application.status === 'pending' ? 'Under Review' : application.status === 'approved' ? 'Approved ✓' : 'Rejected'}
              </span>
            )}
          </div>
          {showApplyForm && (
            <form onSubmit={handleApply} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Why do you want to be a doubt solver? *</label>
                <textarea className="form-input" required rows={4} maxLength={2000}
                  value={motivation} onChange={e => setMotivation(e.target.value)}
                  placeholder="Describe your subject expertise and why you want to help students..." />
              </div>
              <button type="submit" className="btn btn-primary" disabled={applySubmitting}>
                {applySubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Staff view toggle */}
      {isStaff && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['all', 'mine'] as const).map(v => (
            <button key={v} onClick={() => setStaffView(v)} style={{
              padding: '6px 16px', fontSize: '0.8rem',
              background: staffView === v ? 'var(--c-ink)' : 'transparent',
              color: staffView === v ? 'var(--c-paper)' : 'var(--c-ink-soft)',
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
          {isStaff ? 'No doubts to show.' : "You haven't raised any doubts yet."}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {doubts.map(d => {
            const s = STATUS_LABELS[d.status] || STATUS_LABELS.open;
            return (
              <Link key={d._id} to={`/doubts/${d._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  border: '1px solid var(--c-border)', padding: '1.25rem 1.5rem',
                  background: 'var(--c-paper)', transition: 'border-color 0.15s',
                  display: 'flex', alignItems: 'flex-start', gap: '1rem',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--c-ink)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-border)')}>
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
                      {isStaff && <span>By <strong>{d.student?.name}</strong></span>}
                      {d.acceptedBy && <span>Teacher: <strong>{d.acceptedBy.name}</strong></span>}
                      {d.fee > 0 && <span style={{ color: '#1d4ed8' }}>₹{d.fee}</span>}
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
