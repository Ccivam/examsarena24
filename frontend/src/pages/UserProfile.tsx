import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import RankingGraph from '../components/RankingGraph';
import { Result, Test } from '../types';

interface SolvedProblem {
  _id: string;
  problem: { _id: string; title: string; subject: string; difficulty: string; tags: string[] };
  solvedAt: string;
}

interface PublicProfile {
  user: { _id: string; name: string; username?: string; picture: string; role: string; createdAt: string };
  stats: { totalTests: number; avgScore: number; bestRank: number; problemsSolved: number };
  results: Result[];
  solvedProblems: SolvedProblem[];
}

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    axios
      .get(`/api/users/${id}`, { withCredentials: true })
      .then(r => setData(r.data))
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-container">Loading profile...</div>;
  if (notFound || !data) return <div className="loading-container">User not found.</div>;

  const { user, stats, results, solvedProblems } = data;

  return (
    <section className="view-section">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/leaderboard" style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to Leaderboard
        </Link>
      </div>

      {/* User card */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '2rem',
        border: '1px solid var(--c-border)', background: 'var(--c-paper-dark)', marginBottom: '3rem',
      }}>
        {user.picture ? (
          <img src={user.picture} alt={user.name} style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid var(--c-border)' }} />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 700, color: 'var(--c-ink-soft)' }}>
            {user.name[0].toUpperCase()}
          </div>
        )}
        <div>
          <h3 style={{ fontFamily: 'var(--f-serif)', fontSize: '1.5rem', marginBottom: '0.15rem' }}>{user.name}</h3>
          {user.username && (
            <p style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>@{user.username}</p>
          )}
          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            <span style={{
              background: user.role === 'admin' || user.role === 'super_admin' ? 'var(--c-accent)' : 'var(--c-paper)',
              border: '1px solid var(--c-border)', padding: '2px 8px',
              textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em',
            }}>
              {user.role === 'super_admin' ? 'Owner' : user.role}
            </span>
            <span style={{ marginLeft: '1rem', color: 'var(--c-ink-soft)' }}>
              Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
            </span>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '3rem' }}>
        <div className="stat-card">
          <span className="stat-value">{stats.avgScore}<span style={{ fontSize: '1rem', color: 'var(--c-ink-soft)' }}>%</span></span>
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
          <span className="stat-value">{stats.problemsSolved}</span>
          <span className="stat-label">Problems Solved</span>
        </div>
      </div>

      {results.length > 0 && (
        <>
          <span className="section-label">Rank History</span>
          <RankingGraph results={results} />
        </>
      )}

      <span className="section-label" style={{ marginTop: '3rem' }}>Test History</span>
      {results.length === 0 ? (
        <div className="empty-state">No tests participated yet.</div>
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
            </tr>
          </thead>
          <tbody>
            {results.map(r => {
              const test = r.test as Test;
              return (
                <tr key={r._id}>
                  <td style={{ fontWeight: 500 }}>{typeof test === 'object' ? test.title : 'Test'}</td>
                  <td>{r.totalScore}/{r.maxScore}</td>
                  <td><span className="rank-cell">#{r.rank}</span></td>
                  <td>{r.percentile}%ile</td>
                  <td>{r.scores.physics}</td>
                  <td>{r.scores.chemistry}</td>
                  <td>{r.scores.mathematics}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {solvedProblems.length > 0 && (
        <>
          <span className="section-label" style={{ marginTop: '3rem' }}>Problems Solved</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {solvedProblems.map(sp => (
              <Link
                key={sp._id}
                to={`/problems?subject=${sp.problem.subject}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                  border: '1px solid var(--c-border)', background: 'var(--c-paper-dark)',
                  textDecoration: 'none', color: 'var(--c-ink)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.85rem', minWidth: 80 }}>{sp.problem.subject}</span>
                <span style={{ flex: 1, fontWeight: 500 }}>{sp.problem.title}</span>
                <span style={{
                  fontSize: '0.7rem', padding: '2px 8px',
                  background: sp.problem.difficulty === 'easy' ? '#dcfce7' : sp.problem.difficulty === 'medium' ? '#fef3c7' : '#fee2e2',
                  color: sp.problem.difficulty === 'easy' ? '#166534' : sp.problem.difficulty === 'medium' ? '#92400e' : '#991b1b',
                  textTransform: 'capitalize',
                }}>
                  {sp.problem.difficulty}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default UserProfile;
