import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const UsernameSetup: React.FC = () => {
  const { user, refetch } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If user already has a username, send to dashboard
  useEffect(() => {
    if (user?.username) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const validate = (v: string) => /^[a-z0-9_]{3,8}$/.test(v);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 8);
    setUsername(val);
    setError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 3) {
      setStatus(val.length === 0 ? 'idle' : 'invalid');
      return;
    }
    if (!validate(val)) { setStatus('invalid'); return; }

    setStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await axios.get(`/api/users/check-username?u=${val}`, { withCredentials: true });
        setStatus(r.data.available ? 'available' : 'taken');
      } catch {
        setStatus('idle');
      }
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'available') return;
    setSubmitting(true);
    setError('');
    try {
      await axios.put('/api/users/set-username', { username }, { withCredentials: true });
      await refetch();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set username');
      setSubmitting(false);
    }
  };

  const statusColor = status === 'available' ? '#10b981' : status === 'taken' || status === 'invalid' ? '#ef4444' : 'var(--c-ink-soft)';
  const statusMsg = status === 'available' ? `@${username} is available!`
    : status === 'taken' ? 'Username already taken'
    : status === 'invalid' ? '3–8 chars, letters/numbers/underscore only'
    : status === 'checking' ? 'Checking...'
    : '';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--c-paper)' }}>
      <div style={{ width: '100%', maxWidth: 400, border: '1px solid var(--c-border)', padding: '2.5rem', background: 'var(--c-paper-dark)' }}>
        <div className="brand" style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'block' }}>JEE Arena</div>
        <h2 style={{ fontFamily: 'var(--f-serif)', fontSize: '1.5rem', marginBottom: '0.4rem' }}>
          Choose your username
        </h2>
        <p style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          This is how others will find you on JEE Arena. You can change it later.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--c-ink-soft)', fontSize: '0.95rem', pointerEvents: 'none',
              }}>@</span>
              <input
                className="form-input"
                type="text"
                autoFocus
                value={username}
                onChange={handleChange}
                placeholder="arjun08"
                style={{ paddingLeft: '1.75rem' }}
                maxLength={8}
              />
            </div>
            {statusMsg && (
              <p style={{ fontSize: '0.78rem', marginTop: '0.4rem', color: statusColor }}>{statusMsg}</p>
            )}
            <p style={{ fontSize: '0.72rem', color: 'var(--c-ink-soft)', marginTop: '0.3rem' }}>
              3–8 characters · letters, numbers, underscore only
            </p>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={status !== 'available' || submitting}
            style={{ width: '100%', padding: '13px' }}
          >
            {submitting ? 'Setting username...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UsernameSetup;
