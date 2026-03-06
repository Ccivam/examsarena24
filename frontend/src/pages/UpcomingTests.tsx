import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Test, Registration } from '../types';

const UpcomingTests: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<Record<string, Registration>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [upcomingRes, liveRes] = await Promise.all([
          axios.get('/api/tests?status=upcoming', { withCredentials: true }),
          axios.get('/api/tests?status=live', { withCredentials: true }),
        ]);
        const now = new Date();
        const all = [...liveRes.data, ...upcomingRes.data].filter(
          (t: Test) => now < new Date(t.endTime)
        );
        setTests(all);

        // Fetch registrations for each test
        const regMap: Record<string, Registration> = {};
        await Promise.all(
          all.map(async (t: Test) => {
            try {
              const r = await axios.get(`/api/payments/status/${t._id}`, { withCredentials: true });
              regMap[t._id] = r.data;
            } catch {
              // Not registered
            }
          })
        );
        setMyRegistrations(regMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const typeLabel: Record<string, string> = {
    JEE_MAINS: 'JEE MAINS',
    JEE_ADVANCED: 'JEE ADVANCED',
    TOPIC_TEST: 'TOPIC TEST',
    FULL_LENGTH: 'FULL LENGTH',
  };

  const isRegistered = (testId: string) => {
    const reg = myRegistrations[testId];
    return reg?.paymentStatus === 'verified' || reg?.paymentStatus === 'free';
  };

  if (loading) return <div className="loading-container">Loading tests...</div>;

  return (
    <section className="view-section">
      <div className="view-header">
        <div>
          <h2 className="view-title">Upcoming Competitions</h2>
          <p className="view-subtitle">Open for registration. Pay to secure your spot.</p>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="empty-state">No upcoming tests at the moment. Check back soon!</div>
      ) : (
        <div className="card-grid">
          {tests.map((test) => {
            const registered = isRegistered(test._id);
            const now = new Date();
            const isLive = test.status === 'live' ||
              (now >= new Date(test.startTime) && now < new Date(test.endTime));

            return (
              <div key={test._id} className="comp-card">
                <div className="date-badge" style={{ background: isLive ? 'var(--c-accent)' : 'var(--c-ink)', color: isLive ? 'var(--c-ink)' : 'var(--c-paper)' }}>
                  {isLive ? 'LIVE' : new Date(test.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </div>
                <div className="comp-meta">
                  <span>{typeLabel[test.type] || test.type}</span>
                  <span>•</span>
                  <span>{test.fee > 0 ? `₹${test.fee}` : 'Free'}</span>
                  <span>•</span>
                  <span>
                    {new Date(test.startTime).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <h3 className="comp-title">{test.title}</h3>
                {test.description && (
                  <p className="serif-text" style={{ color: 'var(--c-ink-soft)', fontSize: '0.95rem' }}>
                    {test.description}
                  </p>
                )}

                <p style={{ fontSize: '0.8rem', color: 'var(--c-ink-soft)', marginTop: '1rem' }}>
                  Register by{' '}
                  {new Date(test.registrationDeadline).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </p>

                <div className="comp-footer">
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="tag-pill">{test.duration} Min</span>
                    <span className="tag-pill">{test.problems?.length || '?'} Qs</span>
                    {registered && (
                      <span className="status-badge status-verified">✓ Registered</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {isLive && registered ? (
                      <Link to={`/test/${test._id}/room`} className="btn btn-primary">
                        Enter Test →
                      </Link>
                    ) : registered ? (
                      <span
                        className="btn"
                        style={{ cursor: 'default', background: 'rgba(57,255,20,0.1)', borderColor: 'var(--c-accent)' }}
                      >
                        Already Registered
                      </span>
                    ) : (
                      <Link to={`/test/${test._id}`} className="btn btn-primary">
                        {test.fee > 0 ? `Pay ₹${test.fee} & Register` : 'Register Free'}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default UpcomingTests;
