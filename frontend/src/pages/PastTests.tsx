import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Test } from '../types';

const PastTests: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Fetch completed tests + all others, then filter by endTime for real-time accuracy
        const [completedRes, liveRes, upcomingRes] = await Promise.all([
          axios.get('/api/tests?status=completed', { withCredentials: true }),
          axios.get('/api/tests?status=live', { withCredentials: true }),
          axios.get('/api/tests?status=upcoming', { withCredentials: true }),
        ]);
        const now = new Date();
        const all = [
          ...completedRes.data,
          // include live/upcoming tests whose endTime has passed (scheduler lag)
          ...liveRes.data.filter((t: Test) => now >= new Date(t.endTime)),
          ...upcomingRes.data.filter((t: Test) => now >= new Date(t.endTime)),
        ];
        // Deduplicate by _id
        const seen = new Set<string>();
        setTests(all.filter((t: Test) => { if (seen.has(t._id)) return false; seen.add(t._id); return true; }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const typeLabel: Record<string, string> = {
    JEE_MAINS: 'JEE MAINS',
    JEE_ADVANCED: 'JEE ADVANCED',
    TOPIC_TEST: 'TOPIC TEST',
    FULL_LENGTH: 'FULL LENGTH',
  };

  if (loading) return <div className="loading-container">Loading past tests...</div>;

  return (
    <section className="view-section">
      <div className="view-header">
        <div>
          <h2 className="view-title">Past Competitions</h2>
          <p className="view-subtitle">Review your performance and learn from solutions.</p>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="empty-state">No completed tests yet.</div>
      ) : (
        <div className="card-grid">
          {tests.map((test) => (
            <div key={test._id} className="comp-card">
              <div className="comp-meta">
                <span>{typeLabel[test.type] || test.type}</span>
                <span>•</span>
                <span>{new Date(test.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <h3 className="comp-title">{test.title}</h3>
              {test.description && (
                <p className="serif-text" style={{ color: 'var(--c-ink-soft)', fontSize: '0.95rem' }}>
                  {test.description}
                </p>
              )}
              <div className="comp-footer">
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="tag-pill">{test.duration} Min</span>
                  <span className="tag-pill">{test.problems?.length || '?'} Qs</span>
                  {test.solutionPublishedAt && (
                    <span className="status-badge status-verified">Solutions Available</span>
                  )}
                  {test.leaderboardPublishedAt && (
                    <span className="status-badge status-upcoming">Results Out</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Link to={`/test/${test._id}/review`} className="btn btn-primary">
                    Review
                  </Link>
                  {test.leaderboardPublishedAt && (
                    <Link to={`/leaderboard/test/${test._id}`} className="btn">
                      Leaderboard
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default PastTests;
