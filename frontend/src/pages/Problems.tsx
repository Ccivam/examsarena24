import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface ProblemRow {
  _id: string;
  title: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  solved: boolean;
  correct: boolean;
}

const SUBJECT_COLOR: Record<string, string> = {
  Physics: '#3b82f6',
  Chemistry: '#10b981',
  Mathematics: '#f59e0b',
};

const DIFF_COLOR: Record<string, string> = {
  Easy: '#10b981',
  Medium: '#f59e0b',
  Hard: '#ef4444',
};

const Problems: React.FC = () => {
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`/api/problems/practice?page=${page}`, { withCredentials: true })
      .then(r => {
        setProblems(r.data.problems);
        setPages(r.data.pages);
        setTotal(r.data.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <section className="view-section">
      <div className="view-header">
        <div>
          <h2 className="view-title">Problems</h2>
          <p className="view-subtitle">Practice problems from past contests. {total > 0 && `${total} total`}</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">Loading problems...</div>
      ) : problems.length === 0 ? (
        <div className="empty-state">No problems available yet.</div>
      ) : (
        <>
          <table className="table-container">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Subject</th>
                <th>Difficulty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((p, i) => (
                <tr
                  key={p._id}
                  style={{
                    background: p.correct ? 'rgba(16,185,129,0.08)' : undefined,
                  }}
                >
                  <td style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem' }}>
                    {(page - 1) * 10 + i + 1}
                  </td>
                  <td>
                    <Link
                      to={`/problems/${p._id}`}
                      style={{ fontWeight: 500, color: 'var(--c-ink)', textDecoration: 'none' }}
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td>
                    <span style={{ color: SUBJECT_COLOR[p.subject], fontSize: '0.82rem', fontWeight: 500 }}>
                      {p.subject}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: DIFF_COLOR[p.difficulty], fontSize: '0.82rem' }}>
                      {p.difficulty}
                    </span>
                  </td>
                  <td>
                    {p.correct ? (
                      <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.82rem' }}>✓ Solved</span>
                    ) : p.solved ? (
                      <span style={{ color: '#f59e0b', fontSize: '0.82rem' }}>Attempted</span>
                    ) : (
                      <span style={{ color: 'var(--c-ink-soft)', fontSize: '0.82rem' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', alignItems: 'center' }}>
              <button
                className="btn"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                ← Prev
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  className={`btn${n === page ? ' btn-primary' : ''}`}
                  onClick={() => setPage(n)}
                  style={{ padding: '6px 12px', fontSize: '0.85rem', minWidth: 36 }}
                >
                  {n}
                </button>
              ))}
              <button
                className="btn"
                disabled={page === pages}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default Problems;
