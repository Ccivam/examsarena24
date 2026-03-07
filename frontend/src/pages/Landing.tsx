import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../main';

const GOOGLE_AUTH_URL = `${API_BASE}/api/auth/google`;

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

const MockTestIllustration = () => (
  <svg viewBox="0 0 440 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 440 }}>
    {/* Desk */}
    <rect x="20" y="268" width="400" height="12" rx="6" fill="#d4c9b8" />
    {/* Monitor base */}
    <rect x="194" y="248" width="52" height="22" rx="3" fill="#c0b8ac" />
    <rect x="170" y="266" width="100" height="8" rx="4" fill="#b8b0a4" />
    {/* Monitor body */}
    <rect x="60" y="40" width="320" height="212" rx="14" fill="#2c2c3e" />
    <rect x="72" y="52" width="296" height="188" rx="8" fill="#1a1a2e" />
    {/* Browser top bar */}
    <rect x="72" y="52" width="296" height="28" rx="8" fill="#0f3460" />
    <rect x="72" y="66" width="296" height="14" fill="#0f3460" />
    {/* Browser dots */}
    <circle cx="90" cy="66" r="5" fill="#e94560" />
    <circle cx="108" cy="66" r="5" fill="#f5a623" />
    <circle cx="126" cy="66" r="5" fill="#22c55e" />
    {/* URL bar */}
    <rect x="144" y="59" width="160" height="14" rx="4" fill="#1a1a2e" />
    {/* Header bar inside */}
    <rect x="82" y="90" width="276" height="22" rx="4" fill="#0f3460" />
    {/* Timer badge */}
    <rect x="296" y="94" width="54" height="14" rx="3" fill="#e94560" />
    <rect x="300" y="97" width="8" height="8" rx="1" fill="#fff" opacity="0.9" />
    <rect x="312" y="99" width="30" height="4" rx="2" fill="#fff" opacity="0.85" />
    {/* Test title text blocks */}
    <rect x="90" y="95" width="90" height="6" rx="3" fill="#6b8cce" opacity="0.8" />
    <rect x="188" y="95" width="40" height="6" rx="3" fill="#6b8cce" opacity="0.4" />
    {/* Question text lines */}
    <rect x="82" y="124" width="200" height="7" rx="3" fill="#3a3a5c" />
    <rect x="82" y="136" width="170" height="7" rx="3" fill="#3a3a5c" />
    <rect x="82" y="148" width="130" height="7" rx="3" fill="#3a3a5c" />
    {/* MCQ Options */}
    {[0, 1, 2, 3].map(i => (
      <g key={i}>
        <circle cx="94" cy={172 + i * 20} r="7" fill={i === 2 ? '#22c55e' : 'none'} stroke={i === 2 ? '#22c55e' : '#44445a'} strokeWidth="1.5" />
        {i === 2 && <circle cx="94" cy={172 + i * 20} r="3.5" fill="#fff" />}
        <rect x="108" y={167 + i * 20} width={[110, 130, 90, 120][i]} height="7" rx="3" fill={i === 2 ? '#22c55e' : '#2e2e4e'} opacity={i === 2 ? 1 : 0.8} />
      </g>
    ))}
    {/* Next button */}
    <rect x="240" y="228" width="108" height="22" rx="5" fill="#22c55e" />
    <rect x="248" y="233" width="70" height="6" rx="3" fill="#fff" opacity="0.9" />
    <rect x="248" y="243" width="50" height="4" rx="2" fill="#fff" opacity="0.5" />
    {/* Question palette */}
    <rect x="316" y="120" width="52" height="102" rx="6" fill="#0f3460" />
    {[...Array(12)].map((_, i) => (
      <rect key={i}
        x={322 + (i % 3) * 15} y={128 + Math.floor(i / 3) * 15}
        width="11" height="11" rx="3"
        fill={i < 6 ? '#22c55e' : i === 6 ? '#f59e0b' : '#1e2a45'}
      />
    ))}
    {/* Floating decorations */}
    <circle cx="32" cy="80" r="18" fill="#e94560" opacity="0.08" />
    <circle cx="420" cy="200" r="24" fill="#6b8cce" opacity="0.08" />
    <circle cx="400" cy="50" r="10" fill="#f5a623" opacity="0.15" />
    {/* Small floating icons */}
    <rect x="22" y="140" width="20" height="20" rx="4" fill="#f5a623" opacity="0.12" transform="rotate(15 32 150)" />
    <rect x="408" y="110" width="16" height="16" rx="3" fill="#e94560" opacity="0.12" transform="rotate(-10 416 118)" />
    {/* Checkmark floating */}
    <circle cx="418" cy="280" r="14" fill="#22c55e" opacity="0.12" />
    <polyline points="412,280 416,285 425,274" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
  </svg>
);

const RankingIllustration = () => (
  <svg viewBox="0 0 440 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 440 }}>
    {/* Background glow circles */}
    <circle cx="220" cy="160" r="130" fill="#f5a623" opacity="0.05" />
    <circle cx="220" cy="160" r="90" fill="#f5a623" opacity="0.05" />
    {/* Podium */}
    {/* 2nd place */}
    <rect x="80" y="190" width="90" height="80" rx="6" fill="#c0c0c0" opacity="0.9" />
    <rect x="80" y="190" width="90" height="12" rx="6" fill="#a8a8a8" />
    {/* 1st place */}
    <rect x="175" y="150" width="90" height="120" rx="6" fill="#f5a623" opacity="0.9" />
    <rect x="175" y="150" width="90" height="12" rx="6" fill="#e09010" />
    {/* 3rd place */}
    <rect x="270" y="215" width="90" height="55" rx="6" fill="#cd7f32" opacity="0.85" />
    <rect x="270" y="215" width="90" height="12" rx="6" fill="#b86e28" />
    {/* Podium numbers */}
    <text x="125" y="240" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#fff" opacity="0.9">2</text>
    <text x="220" y="210" textAnchor="middle" fontSize="26" fontWeight="bold" fill="#fff">1</text>
    <text x="315" y="255" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#fff" opacity="0.9">3</text>
    {/* Avatar circles on podium */}
    <circle cx="125" cy="165" r="24" fill="#e8e0d4" stroke="#c0c0c0" strokeWidth="3" />
    <circle cx="125" cy="158" r="10" fill="#b8a898" />
    <path d="M103,188 Q103,178 125,178 Q147,178 147,188" fill="#b8a898" />
    <circle cx="220" cy="120" r="28" fill="#e8e0d4" stroke="#f5a623" strokeWidth="3" />
    <circle cx="220" cy="113" r="11" fill="#b8a898" />
    <path d="M196,146 Q196,135 220,135 Q244,135 244,146" fill="#b8a898" />
    <circle cx="315" cy="188" r="22" fill="#e8e0d4" stroke="#cd7f32" strokeWidth="3" />
    <circle cx="315" cy="182" r="9" fill="#b8a898" />
    <path d="M295,207 Q295,198 315,198 Q335,198 335,207" fill="#b8a898" />
    {/* Trophy on 1st */}
    <circle cx="220" cy="78" r="14" fill="#f5a623" opacity="0.25" />
    <text x="220" y="84" textAnchor="middle" fontSize="18">🏆</text>
    {/* Rank bar chart on left */}
    <rect x="18" y="80" width="48" height="190" rx="6" fill="#f8f4ee" stroke="#e8e0d4" strokeWidth="1" />
    <text x="42" y="100" textAnchor="middle" fontSize="7" fill="#999">RANK</text>
    {[180, 140, 160, 120, 100, 130, 90].map((y, i) => (
      <g key={i}>
        <circle cx="42" cy={y} r="3.5" fill={i === 6 ? '#22c55e' : '#c8b89a'} />
        {i > 0 && <line x1="42" y1={[180, 140, 160, 120, 100, 130, 90][i - 1]} x2="42" y2={y} stroke="#d4c4aa" strokeWidth="1.5" strokeDasharray={i === 6 ? '0' : '2,2'} />}
      </g>
    ))}
    <line x1="42" y1="180" x2="42" y2="90" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.4" />
    {/* Floating star/confetti */}
    <circle cx="390" cy="60" r="6" fill="#f5a623" opacity="0.4" />
    <circle cx="48" cy="50" r="4" fill="#e94560" opacity="0.3" />
    <rect x="378" y="230" width="8" height="8" rx="2" fill="#6b8cce" opacity="0.3" transform="rotate(20 382 234)" />
    <rect x="52" y="280" width="10" height="10" rx="2" fill="#f5a623" opacity="0.25" transform="rotate(-15 57 285)" />
    {/* Upward arrow indicating improvement */}
    <path d="M390,170 L390,130" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    <path d="M384,138 L390,130 L396,138" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <text x="390" y="185" textAnchor="middle" fontSize="7" fill="#22c55e" opacity="0.8">+12</text>
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

  const go = (v: View) => { setView(v); setError(''); setInfo(''); setBusy(false); };

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
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── HERO SECTION ── */}
      <section style={{ background: '#111', position: 'relative', padding: '3.5rem 2rem 7rem' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="brand" style={{ fontSize: '2.4rem', color: '#fff', display: 'inline-block' }}>JEE Arena</div>
          <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.3rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Powered by IIT Bombay Alumni
          </p>
        </div>

        {/* Two-column layout: hero text + auth card */}
        <div style={{ display: 'flex', gap: '3rem', maxWidth: '1020px', margin: '0 auto', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>

          {/* Left: hero copy */}
          <div style={{ flex: '1 1 360px', color: '#fff', maxWidth: '460px' }}>
            <h1 style={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
              Compete.<br />
              Rank.<br />
              <span style={{ color: '#f5a623' }}>Crack JEE.</span>
            </h1>
            <p style={{ color: '#aaa', fontSize: '1rem', lineHeight: 1.9, marginBottom: '2rem' }}>
              Full-length mock tests crafted by IIT Bombay alumni.
              Know exactly where you stand among thousands of aspirants across India — before the real exam.
            </p>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
              {[{ num: '50+', label: 'Mock Tests' }, { num: 'National', label: 'Rankings' }].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{s.num}</div>
                  <div style={{ fontSize: '0.7rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.15rem' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: auth card */}
          <div style={{ flex: '0 0 370px', width: '100%', maxWidth: '370px', border: '1px solid #2a2a2a', padding: '2.5rem', background: 'var(--c-paper)' }}>

        {/* ── Home ── */}
        {view === 'home' && (
          <>
            <h3 className="view-title" style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Get Started</h3>
            <p style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem', marginBottom: '2rem' }}>Sign in or create a new account</p>

            <a href={GOOGLE_AUTH_URL} className="btn btn-primary" style={{ width: '100%', padding: '13px', marginBottom: '0.75rem', gap: '10px' }}>
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
            <a href={GOOGLE_AUTH_URL} className="btn" style={{ width: '100%', padding: '12px', marginBottom: '0.75rem', gap: '8px' }}>
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
            <a href={GOOGLE_AUTH_URL} className="btn" style={{ width: '100%', padding: '12px', marginBottom: '0.75rem', gap: '8px' }}>
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

        {/* ── Forgot: enter OTP + new password ── */}
        {(view === 'forgot-otp' || view === 'new-password') && (
          <form onSubmit={handleResetPassword}>
            <h3 className="view-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Reset Password</h3>
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
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" required minLength={6}
                value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" required
                value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} placeholder="Repeat password" />
            </div>
            <button type="submit" disabled={busy || resetOtp.length < 6} className="btn btn-primary" style={{ width: '100%', padding: '13px', marginBottom: '0.75rem' }}>
              {busy ? 'Updating...' : 'Update Password'}
            </button>
            <button type="button" className="btn" style={{ width: '100%', padding: '10px', fontSize: '0.75rem' }}
              onClick={() => go('forgot-email')}>← Resend / Change Email</button>
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
          </div>{/* end auth card */}
        </div>{/* end two-col */}

        {/* Curved wave bottom */}
        <svg viewBox="0 0 1440 70" preserveAspectRatio="none"
          style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 70, display: 'block' }}>
          <path d="M0,35 C360,70 1080,0 1440,35 L1440,70 L0,70 Z" fill="var(--c-paper)" />
        </svg>
      </section>{/* end hero */}

      {/* ── SECTION: Mock Test Experience ── */}
      <section style={{ padding: '6rem 2rem 5rem', background: 'var(--c-paper)' }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto', display: 'flex', gap: '4rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: '1 1 320px', maxWidth: 440 }}>
            <MockTestIllustration />
          </div>
          <div style={{ flex: '1 1 300px', maxWidth: 440 }}>
            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--c-ink-soft)', marginBottom: '0.75rem' }}>Real exam feel</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.25, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
              Take tests that feel<br />like the real JEE
            </h2>
            <p style={{ color: 'var(--c-ink-soft)', lineHeight: 1.9, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Full 3-hour timed sessions. MCQ with negative marking. Physics, Chemistry, and Mathematics — identical to the actual exam pattern. No surprises on exam day.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {['Auto-submit when time runs out', 'Save & review any question anytime', 'Detailed step-by-step solutions after test'].map(item => (
                <li key={item} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.9rem', color: 'var(--c-ink-soft)' }}>
                  <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '1rem' }}>✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Wave separator */}
      <div style={{ lineHeight: 0, background: 'var(--c-paper)' }}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ width: '100%', height: 60, display: 'block' }}>
          <path d="M0,0 C480,60 960,0 1440,60 L1440,60 L0,60 Z" fill="#f0ece4" />
        </svg>
      </div>

      {/* ── SECTION: Rankings ── */}
      <section style={{ padding: '5rem 2rem 6rem', background: '#f0ece4' }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto', display: 'flex', gap: '4rem', alignItems: 'center', flexWrap: 'wrap', flexDirection: 'row-reverse', justifyContent: 'center' }}>
          <div style={{ flex: '1 1 320px', maxWidth: 440 }}>
            <RankingIllustration />
          </div>
          <div style={{ flex: '1 1 300px', maxWidth: 440 }}>
            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--c-ink-soft)', marginBottom: '0.75rem' }}>National competition</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.25, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
              See exactly where<br />you lie in the race
            </h2>
            <p style={{ color: 'var(--c-ink-soft)', lineHeight: 1.9, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              After every test, your national rank among all participants is published. Stop guessing your preparation level — see cold hard numbers and know exactly which students are ahead of you.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {['National rank published after every test', 'Subject-wise score breakdown', 'Rank history graph — track your rise'].map(item => (
                <li key={item} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.9rem', color: 'var(--c-ink-soft)' }}>
                  <span style={{ color: '#f5a623', fontWeight: 700, fontSize: '1rem' }}>★</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Wave into features */}
      <div style={{ lineHeight: 0, background: '#f0ece4' }}>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ width: '100%', height: 60, display: 'block' }}>
          <path d="M0,60 C360,0 1080,60 1440,0 L1440,60 L0,60 Z" fill="var(--c-paper)" />
        </svg>
      </div>

      {/* ── FEATURES GRID ── */}
      <section style={{ padding: '5rem 2rem 6rem', background: 'var(--c-paper)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Everything you need to crack JEE</h2>
          <p style={{ color: 'var(--c-ink-soft)', marginTop: '0.75rem', fontSize: '0.95rem' }}>Built by toppers, for toppers.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          {[
            { icon: '🎯', label: 'IIT Curated', desc: 'Problems handpicked and verified by IIT Bombay alumni.' },
            { icon: '⚡', label: 'Live Contests', desc: 'Compete in real-time with thousands of aspirants across India.' },
            { icon: '📖', label: 'Full Solutions', desc: 'Step-by-step explanations published after every test.' },
            { icon: '📊', label: 'Track Progress', desc: 'See your rank history, weak topics, and improvement over time.' },
          ].map(f => (
            <div key={f.label} className="stat-card" style={{ padding: '2rem' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{f.icon}</div>
              <span className="stat-label" style={{ display: 'block', marginBottom: '0.5rem' }}>{f.label}</span>
              <p style={{ fontSize: '0.88rem', color: 'var(--c-ink-soft)', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default Landing;
