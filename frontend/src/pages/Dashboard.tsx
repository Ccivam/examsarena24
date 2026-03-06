import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Test, Result } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [upcomingTests, setUpcomingTests] = useState<Test[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [liveTests, setLiveTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [upcomingRes, pastRes, liveRes] = await Promise.all([
          axios.get('/api/tests?status=upcoming', { withCredentials: true }),
          axios.get('/api/users/profile', { withCredentials: true }),
          axios.get('/api/tests?status=live', { withCredentials: true }),
        ]);
        setUpcomingTests(upcomingRes.data.slice(0, 3));
        setRecentResults(pastRes.data.results?.slice(0, 3) || []);
        setLiveTests(liveRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const [profile, setProfile] = useState<{
    stats: { totalTests: number; avgScore: number; bestRank: number };
  } | null>(null);

  useEffect(() => {
    axios
      .get('/api/users/profile', { withCredentials: true })
      .then((r) => setProfile(r.data))
      .catch(() => {});
  }, []);

  if (loading) return <div className="loading-container">Loading dashboard...</div>;

  const stats = profile?.stats || { totalTests: 0, avgScore: 0, bestRank: 0 };

  const typeLabel: Record<string, string> = {
    JEE_MAINS: 'JEE MAINS',
    JEE_ADVANCED: 'JEE ADVANCED',
    TOPIC_TEST: 'TOPIC TEST',
    FULL_LENGTH: 'FULL LENGTH',
  };

  return (
    <section className="view-section">
      <div className="view-header">
        <div>
          <h2 className="view-title">Dashboard</h2>
          <p className="view-subtitle">
            Welcome back, {user?.name?.split(' ')[0]}. Overview of your preparation.
          </p>
        </div>
        {liveTests.length > 0 && (
          <span className="highlight-block" style={{ fontSize: '0.8rem' }}>
            {liveTests.length} Live Now
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">
            {stats.avgScore}
            <span style={{ fontSize: '1rem', color: 'var(--c-ink-soft)' }}>%</span>
          </span>
          <span className="stat-label">Avg. Score</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalTests}</span>
          <span className="stat-label">Exams Taken</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {stats.bestRank > 0 ? `#${stats.bestRank}` : '—'}
          </span>
          <span className="stat-label">Best Rank</span>
        </div>
      </div>

      {/* Live tests alert */}
      {liveTests.length > 0 && (
        <div className="alert alert-success" style={{ marginBottom: '2rem' }}>
          <strong>{liveTests.length} test(s) are currently live!</strong>{' '}
          {liveTests.map((t) => (
            <Link key={t._id} to={`/test/${t._id}`} style={{ color: 'inherit', textDecoration: 'underline', marginLeft: '0.5rem' }}>
              {t.title}
            </Link>
          ))}
        </div>
      )}

      {/* Upcoming tests */}
      <span className="section-label">Upcoming Competitions</span>
      {upcomingTests.length === 0 ? (
        <div className="empty-state">No upcoming tests at the moment.</div>
      ) : (
        <div className="card-grid">
          {upcomingTests.map((test) => (
            <div key={test._id} className="comp-card">
              {new Date(test.startTime) && (
                <div className="date-badge">
                  {new Date(test.startTime).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              )}
              <div className="comp-meta">
                <span>{typeLabel[test.type] || test.type}</span>
                <span>•</span>
                <span>{test.fee > 0 ? `₹${test.fee}` : 'Free'}</span>
              </div>
              <h3 className="comp-title">{test.title}</h3>
              {test.description && (
                <p className="serif-text" style={{ color: 'var(--c-ink-soft)', marginBottom: '0.5rem' }}>
                  {test.description}
                </p>
              )}
              <div className="comp-footer">
                <span className="tag-pill">{test.duration} Min</span>
                <Link to={`/test/${test._id}`} className="btn btn-primary">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent results */}
      {recentResults.length > 0 && (
        <>
          <span className="section-label" style={{ marginTop: '3rem' }}>Recent Results</span>
          <div className="card-grid">
            {recentResults.map((result) => {
              const test = result.test as Test;
              return (
                <div key={result._id} className="comp-card">
                  <div className="comp-meta">
                    <span>Rank #{result.rank}</span>
                    <span>•</span>
                    <span>{result.percentile}th percentile</span>
                  </div>
                  <h3 className="comp-title">{typeof test === 'object' ? test.title : 'Test'}</h3>
                  <div className="comp-footer">
                    <span className="tag-pill">
                      {result.totalScore}/{result.maxScore} pts
                    </span>
                    <Link to={`/test/${typeof test === 'object' ? test._id : test}/review`} className="btn">
                      Review
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};

export default Dashboard;
