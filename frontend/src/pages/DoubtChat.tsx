import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Message {
  _id: string;
  sender: { _id: string; name: string; picture: string; role: string };
  content: string;
  createdAt: string;
}

interface Doubt {
  _id: string;
  title: string;
  description: string;
  subject: string;
  status: 'open' | 'awaiting_payment' | 'accepted' | 'pending_closure' | 'resolved' | 'flagged';
  fee: number;
  paymentStatus: 'free' | 'pending' | 'verified';
  utrNumber?: string;
  student: { _id: string; name: string; picture: string };
  acceptedBy?: { _id: string; name: string; picture: string };
  messages: Message[];
  createdAt: string;
}

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  open:             { label: 'Open — waiting for a teacher',          color: '#92400e', bg: '#fef3c7' },
  awaiting_payment: { label: 'Awaiting Payment',                      color: '#6d28d9', bg: '#ede9fe' },
  accepted:         { label: 'In Progress',                           color: '#1d4ed8', bg: '#dbeafe' },
  pending_closure:  { label: 'Teacher marked as cleared',             color: '#6d28d9', bg: '#ede9fe' },
  resolved:         { label: 'Resolved — doubt cleared ✓',           color: '#065f46', bg: '#d1fae5' },
  flagged:          { label: 'Closed by teacher — doubt not cleared', color: '#991b1b', bg: '#fee2e2' },
};

const OWNER_UPI = import.meta.env.VITE_OWNER_UPI || '7339989719@ptsbi';

const DoubtChat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isTeacher = user?.role === 'teacher';
  const isStaff = isAdmin || isTeacher;

  const [doubt, setDoubt] = useState<Doubt | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [utrInput, setUtrInput] = useState('');
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDoubt = useCallback(async () => {
    try {
      const res = await axios.get(`/api/doubts/${id}`, { withCredentials: true });
      setDoubt(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load doubt');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDoubt(); }, [fetchDoubt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [doubt?.messages.length]);

  useEffect(() => {
    if (!doubt) return;
    if (['accepted', 'pending_closure'].includes(doubt.status)) {
      pollRef.current = setInterval(fetchDoubt, 4000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [doubt?.status, fetchDoubt]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await axios.post(`/api/doubts/${id}/message`, { content: input.trim() }, { withCredentials: true });
      setInput('');
      await fetchDoubt();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const doAction = async (endpoint: string) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/doubts/${id}/${endpoint}`, {}, { withCredentials: true });
      await fetchDoubt();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const submitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput.trim()) return;
    setUtrSubmitting(true);
    try {
      await axios.post(`/api/doubts/${id}/pay`, { utrNumber: utrInput.trim() }, { withCredentials: true });
      setUtrInput('');
      await fetchDoubt();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit UTR');
    } finally {
      setUtrSubmitting(false);
    }
  };

  if (loading) return <div className="loading-container">Loading...</div>;
  if (error && !doubt) return (
    <div className="view-section">
      <div className="alert alert-error">{error}</div>
      <button className="btn" onClick={() => navigate('/doubts')}>← Back to Doubts</button>
    </div>
  );
  if (!doubt) return null;

  const isStudent = doubt.student._id === user?._id;
  const isAcceptedStaff = isStaff && doubt.acceptedBy?._id === user?._id;
  const chatOpen = ['accepted', 'pending_closure'].includes(doubt.status);
  const statusInfo = STATUS_INFO[doubt.status] || STATUS_INFO.open;

  return (
    <section className="view-section" style={{ maxWidth: 780 }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button className="btn" onClick={() => navigate('/doubts')} style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ padding: '2px 8px', fontSize: '0.72rem', background: 'var(--c-paper-dark)', border: '1px solid var(--c-border)', fontWeight: 500 }}>
                {doubt.subject}
              </span>
              {doubt.fee > 0 && (
                <span style={{ padding: '2px 8px', fontSize: '0.72rem', background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>
                  ₹{doubt.fee}
                </span>
              )}
            </div>
            <h2 style={{ fontFamily: 'var(--f-serif)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>{doubt.title}</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--c-ink-soft)' }}>
              By <strong>{doubt.student.name}</strong>
              {doubt.acceptedBy && <> · Teacher: <strong>{doubt.acceptedBy.name}</strong></>}
              · {new Date(doubt.createdAt).toLocaleDateString('en-IN')}
            </p>
          </div>
          <span style={{ padding: '4px 12px', fontSize: '0.78rem', fontWeight: 600, background: statusInfo.bg, color: statusInfo.color, borderRadius: 2, flexShrink: 0 }}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Original doubt description */}
      <div style={{ border: '1px solid var(--c-border)', padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--c-paper-dark)' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--c-ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Doubt Description</div>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{doubt.description}</p>
      </div>

      {/* Staff accept button */}
      {isStaff && doubt.status === 'open' && (
        <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed var(--c-border)', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--c-ink-soft)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            No teacher has accepted this doubt yet. Be the first to help!
          </p>
          <button className="btn btn-primary" style={{ padding: '12px 32px' }}
            onClick={() => doAction('accept')} disabled={actionLoading}>
            {actionLoading ? 'Accepting...' : 'Accept & Start Helping'}
          </button>
        </div>
      )}

      {/* Awaiting payment — student pays */}
      {doubt.status === 'awaiting_payment' && (
        <div style={{ border: '1px solid #7c3aed', background: '#ede9fe', padding: '1.5rem', marginBottom: '1.5rem', borderRadius: 2 }}>
          <div style={{ fontWeight: 600, color: '#4c1d95', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
            💳 Payment Required — ₹{doubt.fee}
          </div>
          <p style={{ fontSize: '0.85rem', color: '#5b21b6', marginBottom: '1rem' }}>
            Your teacher has accepted this doubt. Pay <strong>₹{doubt.fee}</strong> to UPI <strong>{OWNER_UPI}</strong> to start the chat.
          </p>
          {isStudent && (
            doubt.utrNumber ? (
              <div style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: 600 }}>
                ✓ UTR <strong>{doubt.utrNumber}</strong> submitted — waiting for admin verification.
              </div>
            ) : (
              <form onSubmit={submitUtr} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input className="form-input" style={{ flex: 1, minWidth: 200 }}
                  value={utrInput} onChange={e => setUtrInput(e.target.value)}
                  placeholder="Enter UTR / Transaction ID" required />
                <button type="submit" className="btn btn-primary" disabled={utrSubmitting}>
                  {utrSubmitting ? '...' : 'Submit Payment'}
                </button>
              </form>
            )
          )}
          {isAdmin && doubt.utrNumber && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                UTR submitted: <strong>{doubt.utrNumber}</strong>
              </div>
              <button className="btn btn-primary" style={{ fontSize: '0.82rem' }}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await axios.post(`/api/admin/doubts/${id}/verify-payment`, {}, { withCredentials: true });
                    await fetchDoubt();
                  } catch (err: any) {
                    setError(err.response?.data?.message || 'Failed to verify');
                  } finally {
                    setActionLoading(false);
                  }
                }} disabled={actionLoading}>
                ✓ Verify Payment & Start Chat
              </button>
            </div>
          )}
          {isStaff && !isAdmin && (
            <p style={{ fontSize: '0.82rem', color: '#6d28d9', marginTop: '0.75rem' }}>
              Waiting for student to pay and admin to verify.
            </p>
          )}
        </div>
      )}

      {/* Chat area */}
      {doubt.status !== 'open' && doubt.status !== 'awaiting_payment' && (
        <>
          {/* Pending closure banner */}
          {doubt.status === 'pending_closure' && (
            <div style={{ background: '#ede9fe', border: '1px solid #7c3aed', padding: '1rem 1.25rem', marginBottom: '1rem', borderRadius: 2 }}>
              <div style={{ fontWeight: 600, color: '#4c1d95', marginBottom: '0.5rem' }}>
                {isStudent ? '🎓 Teacher says your doubt is cleared — do you agree?' : '⏳ Waiting for student to confirm doubt is cleared...'}
              </div>
              {isStudent && (
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px 20px' }}
                    onClick={() => doAction('student-agree')} disabled={actionLoading}>
                    Yes, doubt is cleared ✓
                  </button>
                  <button className="btn" style={{ fontSize: '0.85rem', padding: '8px 20px', borderColor: '#dc2626', color: '#dc2626' }}
                    onClick={() => doAction('student-disagree')} disabled={actionLoading}>
                    No, I still have doubts
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div style={{
            border: '1px solid var(--c-border)', background: '#fff',
            minHeight: 200, maxHeight: 460, overflowY: 'auto',
            padding: '1rem', marginBottom: '1rem',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
          }}>
            {doubt.messages.length === 0 ? (
              <div style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
                Chat started — say hello!
              </div>
            ) : doubt.messages.map(msg => {
              const isMe = msg.sender._id === user?._id;
              const msgIsTeacher = msg.sender.role === 'admin' || msg.sender.role === 'super_admin' || msg.sender.role === 'teacher';
              return (
                <div key={msg._id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '72%' }}>
                    {!isMe && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--c-ink-soft)', marginBottom: '2px', paddingLeft: '4px' }}>
                        {msg.sender.name} {msgIsTeacher && <span style={{ color: '#1d4ed8', fontWeight: 600 }}>· Teacher</span>}
                      </div>
                    )}
                    <div style={{
                      padding: '0.6rem 0.9rem', borderRadius: 2,
                      background: isMe ? 'var(--c-ink)' : 'var(--c-paper-dark)',
                      color: isMe ? 'var(--c-paper)' : 'var(--c-ink)',
                      fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                      border: isMe ? 'none' : '1px solid var(--c-border)',
                    }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--c-ink-soft)', marginTop: '2px', textAlign: isMe ? 'right' : 'left', paddingLeft: 4, paddingRight: 4 }}>
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          {chatOpen && (isStudent || isAcceptedStaff) && (
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.75rem' }}>
              <input className="form-input" style={{ flex: 1 }}
                value={input} onChange={e => setInput(e.target.value)}
                placeholder="Type a message..." disabled={sending} />
              <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()}>
                {sending ? '...' : 'Send'}
              </button>
            </form>
          )}

          {/* Staff action buttons */}
          {isAcceptedStaff && chatOpen && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--c-border)' }}>
              {doubt.status === 'accepted' && (
                <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '8px 18px' }}
                  onClick={() => doAction('mark-cleared')} disabled={actionLoading}>
                  ✓ Mark Doubt as Cleared
                </button>
              )}
              <button className="btn" style={{ fontSize: '0.8rem', padding: '8px 18px', borderColor: '#dc2626', color: '#dc2626' }}
                onClick={() => {
                  if (window.confirm('Close this session? It will be flagged as "not cleared".'))
                    doAction('force-close');
                }} disabled={actionLoading}>
                ✕ Close Session
              </button>
            </div>
          )}

          {/* Closed/resolved state */}
          {['resolved', 'flagged'].includes(doubt.status) && (
            <div style={{
              textAlign: 'center', padding: '1.5rem', marginTop: '1rem',
              border: '1px solid var(--c-border)', background: 'var(--c-paper-dark)',
              color: 'var(--c-ink-soft)', fontSize: '0.88rem',
            }}>
              {doubt.status === 'resolved'
                ? '✅ This session is closed. The student confirmed the doubt was resolved.'
                : '⚑ This session was closed by the teacher. The doubt was not confirmed as cleared.'}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default DoubtChat;
