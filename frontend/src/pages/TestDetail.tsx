import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Test, Registration } from '../types';
import { useAuth } from '../context/AuthContext';

// Razorpay global type
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const TestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [test, setTest] = useState<Test | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const testRes = await axios.get(`/api/tests/${id}`, { withCredentials: true });
        setTest(testRes.data.test);
        setRegistration(testRes.data.registration);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleFreeRegister = async () => {
    setPaying(true);
    setError('');
    try {
      const res = await axios.post('/api/payments/register-free', { testId: id }, { withCredentials: true });
      setRegistration(res.data.registration);
      setSuccess('Registered successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setPaying(false);
    }
  };

  const handlePayNow = async () => {
    if (!test || !user) return;
    setPaying(true);
    setError('');

    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        setError('Payment gateway failed to load. Check your internet connection.');
        setPaying(false);
        return;
      }

      // Create Razorpay order on backend
      const orderRes = await axios.post(
        '/api/payments/create-order',
        { testId: id },
        { withCredentials: true }
      );
      const { orderId, amount, currency, keyId, testTitle, userName, userEmail } = orderRes.data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: 'JEE Arena',
        description: testTitle,
        order_id: orderId,
        prefill: { name: userName, email: userEmail },
        theme: { color: '#39ff14', backdrop_color: '#fcfbf6' },
        modal: {
          ondismiss: () => setPaying(false),
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await axios.post(
              '/api/payments/verify',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                testId: id,
              },
              { withCredentials: true }
            );
            setRegistration(verifyRes.data.registration);
            setSuccess('Payment successful! You are now registered.');
          } catch (err: any) {
            setError(err.response?.data?.message || 'Payment verification failed. Contact support.');
          } finally {
            setPaying(false);
          }
        },
      };

      new window.Razorpay(options).open();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not initiate payment');
      setPaying(false);
    }
  };

  if (loading) return <div className="loading-container">Loading...</div>;
  if (!test) return <div className="loading-container">Test not found.</div>;

  const typeLabel: Record<string, string> = {
    JEE_MAINS: 'JEE MAINS',
    JEE_ADVANCED: 'JEE ADVANCED',
    TOPIC_TEST: 'TOPIC TEST',
    FULL_LENGTH: 'FULL LENGTH',
  };

  const isLive = test.status === 'live';
  const isCompleted = test.status === 'completed';
  const isRegistered =
    registration?.paymentStatus === 'verified' || registration?.paymentStatus === 'free';
  const canEnterTest = isLive && isRegistered;
  const deadlinePassed = new Date() > new Date(test.registrationDeadline);

  return (
    <section className="view-section">
      <div className="view-header">
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center' }}>
            <span className={`status-badge status-${test.status}`}>{test.status.toUpperCase()}</span>
            <span className="tag-pill">{typeLabel[test.type]}</span>
          </div>
          <h2 className="view-title">{test.title}</h2>
          <p className="view-subtitle">{test.description}</p>
        </div>
        <Link to="/upcoming" className="btn">← Back</Link>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Test info */}
      <div className="stats-grid" style={{ marginBottom: '3rem' }}>
        <div className="stat-card">
          <span className="stat-value">{test.duration}</span>
          <span className="stat-label">Minutes</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{test.problems?.length || '—'}</span>
          <span className="stat-label">Questions</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{test.fee > 0 ? `₹${test.fee}` : 'Free'}</span>
          <span className="stat-label">Entry Fee</span>
        </div>
      </div>

      {/* Schedule */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <div>
          <span className="section-label">Schedule</span>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <tbody>
              {[
                ['Start', new Date(test.startTime).toLocaleString('en-IN')],
                ['End', new Date(test.endTime).toLocaleString('en-IN')],
                ['Register by', new Date(test.registrationDeadline).toLocaleString('en-IN')],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: '0.75rem 1rem 0.75rem 0', color: 'var(--c-ink-soft)', borderBottom: '1px solid var(--c-border)' }}>{label}</td>
                  <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--c-border)', fontWeight: 500 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <span className="section-label">Marking Scheme</span>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <tbody>
              {[
                ['Correct', '+4 marks'],
                ['Incorrect', '–1 mark'],
                ['Skipped', '0 marks'],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: '0.75rem 1rem 0.75rem 0', color: 'var(--c-ink-soft)', borderBottom: '1px solid var(--c-border)' }}>{label}</td>
                  <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--c-border)', fontWeight: 500 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA */}
      {isCompleted ? (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {isRegistered && (
            <Link to={`/test/${test._id}/review`} className="btn btn-primary">
              View Solutions & Review
            </Link>
          )}
          {test.leaderboardPublishedAt && (
            <Link to={`/leaderboard/test/${test._id}`} className="btn">
              Leaderboard
            </Link>
          )}
        </div>
      ) : canEnterTest ? (
        <button onClick={() => navigate(`/test/${test._id}/room`)} className="btn btn-primary" style={{ padding: '14px 32px' }}>
          Enter Test Room →
        </button>
      ) : isRegistered ? (
        /* Already registered but test not live yet */
        <div>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
              padding: '12px 20px', border: '1px solid var(--c-accent)',
              background: 'rgba(57,255,20,0.08)',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>✓</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Already Registered</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--c-ink-soft)' }}>
                Test starts {new Date(test.startTime).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      ) : deadlinePassed ? (
        <div className="alert alert-info">Registration deadline has passed.</div>
      ) : test.fee > 0 ? (
        <button
          onClick={handlePayNow}
          disabled={paying}
          className="btn btn-primary"
          style={{ padding: '14px 32px', fontSize: '0.85rem' }}
        >
          {paying ? 'Opening payment...' : `Pay ₹${test.fee} & Register`}
        </button>
      ) : (
        <button
          onClick={handleFreeRegister}
          disabled={paying}
          className="btn btn-primary"
          style={{ padding: '14px 32px' }}
        >
          {paying ? 'Registering...' : 'Register for Free'}
        </button>
      )}
    </section>
  );
};

export default TestDetail;
