import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { LeaderboardEntry, Result } from '../types';

const Leaderboard: React.FC = () => {
  const { testId } = useParams<{ testId?: string }>();
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[] | Result[]>([]);
  const [myResult, setMyResult] = useState<Result | null>(null);
  const [testTitle, setTestTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const url = testId
      ? `/api/leaderboard/test/${testId}?page=${page}&limit=50`
      : `/api/leaderboard/global?page=${page}&limit=50`;

    axios
      .get(url, { withCredentials: true })
      .then((r) => {
        if (testId) {
          setEntries(r.data.results);
          setMyResult(r.data.myResult);
          setTestTitle(r.data.test?.title || 'Test Leaderboard');
          setTotalPages(r.data.pages);
        } else {
          setEntries(r.data.leaderboard);
          setTotalPages(r.data.pages);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load leaderboard');
      })
      .finally(() => setLoading(false));
  }, [testId, page]);

  if (loading) return <div className="loading-container">Loading leaderboard...</div>;

  return (
    <section className="view-section" style={{ borderBottom: 'none' }}>
      <div className="view-header">
        <div>
          <h2 className="view-title">
            {testId ? testTitle : 'Global Leaderboard'}
          </h2>
          <p className="view-subtitle">
            {testId ? 'Top performers in this test.' : 'All-time rankings based on average performance.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {!testId && (
          <input
            type="text"
            placeholder="Search by name or @username"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input"
            style={{ width: 220, padding: '7px 12px', fontSize: '0.82rem' }}
          />
        )}
        {testId && <Link to="/leaderboard" className="btn">Global Rankings</Link>}
      </div>
      </div>

      {error ? (
        <div className="alert alert-info">{error}</div>
      ) : (
        <>
          {/* My position highlight */}
          {myResult && (
            <div className="alert alert-info" style={{ marginBottom: '2rem' }}>
              Your rank: <strong>#{myResult.rank}</strong> &bull; Score: <strong>{myResult.totalScore}/{myResult.maxScore}</strong> &bull; Percentile: <strong>{myResult.percentile}%ile</strong>
            </div>
          )}

          {(() => {
            const filtered = search.trim()
              ? (entries as any[]).filter(e => {
                  const u = e.user;
                  const q = search.toLowerCase();
                  return u?.name?.toLowerCase().includes(q) || u?.username?.toLowerCase().includes(q);
                })
              : entries;

            return (
          <table className="table-container">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Rank</th>
                <th>Student</th>
                {testId ? (
                  <>
                    <th>Physics</th>
                    <th>Chemistry</th>
                    <th>Math</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </>
                ) : (
                  <>
                    <th>Tests Taken</th>
                    <th>Best Rank</th>
                    <th style={{ textAlign: 'right' }}>Avg Score</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry: any, idx: number) => {
                const globalIdx = (page - 1) * 50 + idx + 1;
                const isMe = testId
                  ? (entry as Result).user && typeof (entry as Result).user === 'object'
                    ? ((entry as Result).user as any)._id === user?._id
                    : (entry as Result).user === user?._id
                  : (entry as LeaderboardEntry).user?._id === user?._id;

                return (
                  <tr
                    key={testId ? (entry as any)._id : (entry as any)._id || idx}
                    style={isMe ? { background: 'var(--c-paper-dark)' } : {}}
                  >
                    <td>
                      {globalIdx === 1
                        ? <span className="rank-1">1</span>
                        : <span className="rank-cell">{testId ? (entry as Result).rank : globalIdx}</span>
                      }
                    </td>
                    <td style={{ fontWeight: isMe ? 600 : 400 }}>
                      {(() => {
                        const u = testId
                          ? (typeof (entry as Result).user === 'object' ? (entry as Result).user as any : null)
                          : (entry as LeaderboardEntry).user;
                        const userId = u?._id;
                        const name = u?.name || 'Student';
                        const uname = u?.username;
                        return (
                          <span>
                            {userId ? (
                              <Link to={`/user/${userId}`} style={{ color: 'inherit', textDecoration: 'none' }}
                                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                                {name}
                              </Link>
                            ) : name}
                            {uname && <span style={{ color: 'var(--c-ink-soft)', fontSize: '0.75rem', marginLeft: '0.4rem' }}>@{uname}</span>}
                            {isMe && <span style={{ color: 'var(--c-ink-soft)', fontSize: '0.78rem', marginLeft: '0.4rem' }}>(You)</span>}
                          </span>
                        );
                      })()}
                    </td>
                    {testId ? (
                      <>
                        <td>{(entry as Result).scores?.physics || 0}</td>
                        <td>{(entry as Result).scores?.chemistry || 0}</td>
                        <td>{(entry as Result).scores?.mathematics || 0}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {(entry as Result).totalScore}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{(entry as LeaderboardEntry).totalTests || 0}</td>
                        <td>{(entry as LeaderboardEntry).bestRank != null ? `#${(entry as LeaderboardEntry).bestRank}` : '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {(entry as LeaderboardEntry).avgScore != null ? `${(entry as LeaderboardEntry).avgScore}%` : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
            );
          })()}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', alignItems: 'center' }}>
              <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                ← Prev
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--c-ink-soft)' }}>
                Page {page} of {totalPages}
              </span>
              <button className="btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default Leaderboard;
