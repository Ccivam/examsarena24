import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

type View =
  | 'home'
  | 'sign-in'        // email + password login
  | 'sign-up'        // email + password + name
  | 'verify-otp'     // OTP after sign-up
  | 'forgot-email'   // enter email for reset
  | 'forgot-otp'     // enter OTP
  | 'new-password'   // enter new password
  | 'reset-done';    // success

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const Landing: React.FC = () => {
  const { user, loading, refetch } = useAuth();

  const [view, setView] = useState<View>('home');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Sign-up fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpOtp, setSignUpOtp] = useState('');

  // Sign-in fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  if (loading) return <div className="loading-container">Loading...</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const go = (v: View) => { setView(v); setError(''); setInfo(''); };

  // ── Sign-up: send OTP ────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await axios.post('/api/auth/email/send-otp', {
        name: signUpName, email: signUpEmail, password: signUpPassword,
      });
      setInfo(`OTP sent to ${signUpEmail}`);
      go('verify-otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setBusy(false); }
  };

  // ── Sign-up: verify OTP ──────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await axios.post('/api/auth/email/verify-otp', {
        name: signUpName, email: signUpEmail, password: signUpPassword, otp: signUpOtp,
      }, { withCredentials: true });
      await refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed');
      setBusy(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    setBusy(true); setError(''); setInfo('');
    try {
      await axios.post('/api/auth/email/send-otp', {
        name: signUpName, email: signUpEmail, password: signUpPassword,
      });
      setInfo('New OTP sent to your email');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend');
    } finally { setBusy(false); }
  };

  // ── Sign-in ──────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await axios.post('/api/auth/email/login', { email: signInEmail, password: signInPassword }, { withCredentials: true });
      await refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Sign-in failed');
      setBusy(false);
    }
  };

  // ── Forgot: send reset OTP ───────────────────────────────────────────────
  const handleForgotSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await axios.post('/api/auth/email/forgot-password', { email: forgotEmail });
      setInfo(res.data.message);
      go('forgot-otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  };

  // ── Forgot: verify OTP ───────────────────────────────────────────────────
  const handleForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    // Just move to new-password step; actual verify happens at reset
    if (resetOtp.length < 6) { setError('Enter the 6-digit OTP'); return; }
    go('new-password');
  };

  // ── Forgot: set new password ─────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) { setError('Passwords do not match'); return; }
    setBusy(true); setError('');
    try {
      await axios.post('/api/auth/email/reset-password', { email: forgotEmail, otp: resetOtp, newPassword });
      go('reset-done');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Reset failed');
      setBusy(false);
    }
  };

  const Divider = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.25rem 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--c-border)' }} />
      <span style={{ fontSize: '0.72rem', color: 'var(--c-ink-soft)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or</span>
      <div style={{ flex: 1, height: 1, background: 'var(--c-border)' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '2rem', borderBottom: '1px solid var(--c-ink)' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', maxWidth: '560px', marginBottom: '3rem' }}>
        <div className="brand" style={{ fontSize: '3rem', marginBottom: '1.25rem', display: 'inline-block' }}>JEE Arena</div>
        <p className="serif-text" style={{ fontSize: '1.2rem', fontStyle: 'italic', color: 'var(--c-ink-soft)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
          Problems curated by alumni of <span className="highlight-block">IIT Bombay</span>. Compete at the national level.
        </p>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: '400px', border: '1px solid var(--c-ink)', padding: '2.5rem', background: 'var(--c-paper)' }}>

        {/* ── Home ── */}
        {view === 'home' && (
          <>
            <h3 className="view-title" style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Get Started</h3>
            <p style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem', marginBottom: '2rem' }}>Sign in or create a new account</p>

            <a href="/api/auth/google" className="btn btn-primary" style={{ width: '100%', padding: '13px', marginBottom: '0.75rem', gap: '10px' }}>
              <GoogleIcon /> Continue with Google
            </a>

            <Divider />

            <button className="btn btn-primary" style={{ width: '100%', padding: '13px', marginBottom: '0.75rem' }} onClick={() => go('sign-in')}>
              Sign In with Email
            </button>
            <button className="btn" style={{ width: '100%', padding: '13px' }} onClick={() => go('sign-up')}>
              Create Account
            </button>
          </>
        )}

        {/* ── Sign In ── */}
        {view === 'sign-in' && (
          <form onSubmit={handleSignIn}>
            <h3 className="view-title" style={{ fontSize: '1.5rem', marginBottom: '1.75rem' }}>Sign In</h3>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" required autoFocus
                value={signInEmail} onChange={e => setSignInEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                Password
                <button type="button" onClick={() => go('forgot-email')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-ink-soft)', fontSize: '0.72rem', textDecoration: 'underline', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--f-sans)' }}>
                  Forgot password?
                </button>
              </label>
              <input className="form-input" type="password" required
                value={signInPassword} onChange={e => setSignInPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: '100%', padding: '13px', marginBottom: '0.75rem' }}>
              {busy ? 'Signing in...' : 'Sign In'}
            </button>
            <Divider />
            <a href="/api/auth/google" className="btn" style={{ width: '100%', padding: '12px', marginBottom: '0.75rem', gap: '8px' }}>
              <GoogleIcon /> Continue with Google
            </a>
            <button type="button" className="btn" style={{ width: '100%', padding: '10px', fontSize: '0.75rem' }} onClick={() => go('home')}>← Back</button>
            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--c-ink-soft)' }}>
              No account?{' '}
              <button type="button" onClick={() => go('sign-up')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-ink)', textDecoration: 'underline', fontFamily: 'var(--f-sans)', fontSize: '0.8rem' }}>
                Create one
              </button>
            </p>
          </form>
        )}

        {/* ── Sign Up ── */}
        {view === 'sign-up' && (
          <form onSubmit={handleSignUp}>
            <h3 className="view-title" style={{ fontSize: '1.5rem', marginBottom: '1.75rem' }}>Create Account</h3>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" required autoFocus
                value={signUpName} onChange={e => setSignUpName(e.target.value)} placeholder="Arjun Sharma" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" required
                value={signUpEmail} onChange={e => setSignUpEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" required minLength={6}
                value={signUpPassword} onChange={e => setSignUpPassword(e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: '100%', padding: '13px', marginBottom: '0.75rem' }}>
              {busy ? 'Sending OTP...' : 'Send Verification OTP'}
            </button>
            <Divider />
            <a href="/api/auth/google" className="btn" style={{ width: '100%', padding: '12px', marginBottom: '0.75rem', gap: '8px' }}>
              <GoogleIcon /> Continue with Google
            </a>
            <button type="button" className="btn" style={{ width: '100%', padding: '10px', fontSize: '0.75rem' }} onClick={() => go('home')}>← Back</button>
            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--c-ink-soft)' }}>
              Have an account?{' '}
              <button type="button" onClick={() => go('sign-in')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-ink)', textDecoration: 'underline', fontFamily: 'var(--f-sans)', fontSize: '0.8rem' }}>
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* ── Verify OTP (registration) ── */}
        {view === 'verify-otp' && (
          <form onSubmit={handleVerifyOtp}>
            <h3 className="view-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Verify Email</h3>
            <p style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Enter the 6-digit OTP sent to <strong>{signUpEmail}</strong>
            </p>
            {info && <div className="alert alert-info" style={{ marginBottom: '1rem' }}>{info}</div>}
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">OTP</label>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                required
                autoFocus
                placeholder="••••••"
                maxLength={6}
                value={signUpOtp}
                onChange={e => setSignUpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ fontSize: '1.75rem', letterSpacing: '0.5em', textAlign: 'center' }}
              />
            </div>
            <button type="submit" disabled={busy || signUpOtp.length < 6} className="btn btn-primary" style={{ width: '100%', padding: '13px', marginBottom: '0.75rem' }}>
              {busy ? 'Verifying...' : 'Verify & Create Account'}
            </button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn" style={{ flex: 1, padding: '10px', fontSize: '0.75rem' }}
                onClick={() => go('sign-up')}>← Change Details</button>
              <button type="button" className="btn" style={{ flex: 1, padding: '10px', fontSize: '0.75rem' }}
                onClick={handleResendOtp} disabled={busy}>Resend OTP</button>
            </div>
          </form>
        )}

        {/* ── Forgot: enter email ── */}
        {view === 'forgot-email' && (
          <form onSubmit={handleForgotSend}>
            <h3 className="view-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Forgot Password</h3>
            <p style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Enter your email and we'll send an OTP to reset your password.
            </p>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" required autoFocus
                value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: '100%', padding: '13px', marginBottom: '0.75rem' }}>
              {busy ? 'Sending...' : 'Send Reset OTP'}
            </button>
            <button type="button" className="btn" style={{ width: '100%', padding: '10px', fontSize: '0.75rem' }} onClick={() => go('sign-in')}>← Back to Sign In</button>
          </form>
        )}

        {/* ── Forgot: enter OTP ── */}
        {view === 'forgot-otp' && (
          <form onSubmit={handleForgotOtp}>
            <h3 className="view-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Enter OTP</h3>
            <p style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              {info || `Check your email at ${forgotEmail}`}
            </p>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">OTP</label>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                required
                autoFocus
                placeholder="••••••"
                maxLength={6}
                value={resetOtp}
                onChange={e => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ fontSize: '1.75rem', letterSpacing: '0.5em', textAlign: 'center' }}
              />
            </div>
            <button type="submit" disabled={resetOtp.length < 6} className="btn btn-primary" style={{ width: '100%', padding: '13px', marginBottom: '0.75rem' }}>
              Continue →
            </button>
            <button type="button" className="btn" style={{ width: '100%', padding: '10px', fontSize: '0.75rem' }}
              onClick={() => go('forgot-email')}>← Resend / Change Email</button>
          </form>
        )}

        {/* ── Forgot: new password ── */}
        {view === 'new-password' && (
          <form onSubmit={handleResetPassword}>
            <h3 className="view-title" style={{ fontSize: '1.5rem', marginBottom: '1.75rem' }}>Set New Password</h3>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" required minLength={6} autoFocus
                value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" required
                value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} placeholder="Repeat password" />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: '100%', padding: '13px' }}>
              {busy ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {/* ── Reset done ── */}
        {view === 'reset-done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: 'var(--c-accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.5rem' }}>✓</div>
            <h3 className="view-title" style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Password Updated!</h3>
            <p style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              Your password has been changed. Sign in with your new password.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', padding: '13px' }} onClick={() => go('sign-in')}>
              Sign In Now →
            </button>
          </div>
        )}
      </div>

      {/* Features */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', maxWidth: '900px', width: '100%', marginTop: '4rem' }}>
        {[
          { label: 'IIT Curated', desc: 'Problems handpicked and verified by IIT Bombay alumni.' },
          { label: 'Live Contests', desc: 'Compete in real-time with thousands of students across India.' },
          { label: 'Detailed Solutions', desc: 'Full explanations published after every test.' },
        ].map(f => (
          <div key={f.label} className="stat-card">
            <span className="stat-label" style={{ display: 'block', marginBottom: '0.75rem' }}>{f.label}</span>
            <p style={{ fontSize: '0.9rem', color: 'var(--c-ink-soft)', lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Landing;
