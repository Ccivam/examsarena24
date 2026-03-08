import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RankingGraph from '../components/RankingGraph';
import { Result, Registration, Test } from '../types';

interface ProfileData {
  user: { _id: string; name: string; username?: string | null; email: string; picture: string; role: string; createdAt: string };
  stats: { totalTests: number; avgScore: number; bestRank: number; problemsSolved: number };
  results: Result[];
  registrations: Registration[];
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get('/api/users/profile', { withCredentials: true })
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container">Loading profile...</div>;
  if (!data) return null;

  const { stats, results, registrations } = data;

  return (
    <section className="view-section">
      <div className="view-header">
        <div>
          <h2 className="view-title">Profile</h2>
          <p className="view-subtitle">Your performance history and statistics.</p>
        </div>
      </div>

      {/* User card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          padding: '2rem',
          border: '1px solid var(--c-border)',
          background: 'var(--c-paper-dark)',
          marginBottom: '3rem',
        }}
      >
        {user?.picture && (
          <img
            src={user.picture}
            alt={user.name}
            style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid var(--c-border)' }}
          />
        )}
        <div>
          <h3 style={{ fontFamily: 'var(--f-serif)', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            {data.user.name}
          </h3>
          {data.user.username && (
            <p style={{ color: 'var(--c-ink-soft)', fontSize: '0.88rem', marginBottom: '0.15rem' }}>@{data.user.username}</p>
          )}
          <p style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem' }}>{data.user.email}</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            <span
              style={{
                background: data.user.role === 'admin' ? 'var(--c-accent)' : 'var(--c-paper)',
                border: '1px solid var(--c-border)',
                padding: '2px 8px',
                textTransform: 'uppercase',
                fontSize: '0.65rem',
                letterSpacing: '0.05em',
              }}
            >
              {data.user.role}
            </span>
            <span style={{ marginLeft: '1rem', color: 'var(--c-ink-soft)' }}>
              Member since {data.user.createdAt ? new Date(data.user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
            </span>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '3rem' }}>
        <div className="stat-card">
          <span className="stat-value">
            {stats.avgScore}
            <span style={{ fontSize: '1rem', color: 'var(--c-ink-soft)' }}>%</span>
          </span>
          <span className="stat-label">Avg. Score</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalTests}</span>
          <span className="stat-label">Tests Participated</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.bestRank > 0 ? `#${stats.bestRank}` : '—'}</span>
          <span className="stat-label">Best Rank</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.problemsSolved ?? 0}</span>
          <span className="stat-label">Problems Solved</span>
        </div>
      </div>

      {/* Ranking graph */}
      {results.length > 0 && (
        <>
          <span className="section-label">Rank History</span>
          <RankingGraph results={results} />
        </>
      )}

      {/* Test history */}
      <span className="section-label" style={{ marginTop: '3rem' }}>Test History</span>
      {results.length === 0 ? (
        <div className="empty-state">You haven't participated in any tests yet.</div>
      ) : (
        <table className="table-container">
          <thead>
            <tr>
              <th>Test</th>
              <th>Score</th>
              <th>Rank</th>
              <th>Percentile</th>
              <th>Physics</th>
              <th>Chemistry</th>
              <th>Math</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const test = r.test as Test;
              return (
                <tr key={r._id}>
                  <td style={{ fontWeight: 500 }}>
                    {typeof test === 'object' ? test.title : 'Test'}
                  </td>
                  <td>{r.totalScore}/{r.maxScore}</td>
                  <td><span className="rank-cell">#{r.rank}</span></td>
                  <td>{r.percentile}%ile</td>
                  <td>{r.scores.physics}</td>
                  <td>{r.scores.chemistry}</td>
                  <td>{r.scores.mathematics}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      to={`/test/${typeof test === 'object' ? test._id : test}/review`}
                      className="btn"
                      style={{ fontSize: '0.7rem', padding: '6px 12px' }}
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Registrations */}
      {registrations.length > 0 && (
        <>
          <span className="section-label" style={{ marginTop: '3rem' }}>Registration History</span>
          <table className="table-container">
            <thead>
              <tr>
                <th>Test</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Registered On</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => {
                const test = reg.test as Test;
                return (
                  <tr key={reg._id}>
                    <td>{typeof test === 'object' ? test.title : 'Test'}</td>
                    <td>{reg.amount > 0 ? `₹${reg.amount}` : 'Free'}</td>
                    <td>
                      <span className={`status-badge status-${reg.paymentStatus}`}>
                        {reg.paymentStatus === 'free' ? 'Registered' :
                         reg.paymentStatus === 'verified' ? 'Verified' :
                         reg.paymentStatus === 'pending' ? 'Pending' : 'Rejected'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem' }}>
                      {new Date(reg.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
};

export default Profile;
