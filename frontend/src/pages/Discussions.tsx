import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Discussion } from '../types';

const typeBadgeStyle = (type: string) => {
  const colors: Record<string, string> = {
    editorial: '#7c3aed',
    announcement: '#0369a1',
    general: '#374151',
  };
  return {
    fontSize: '0.65rem',
    padding: '2px 8px',
    background: colors[type] || '#374151',
    color: '#fff',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 600,
  };
};

const Discussions: React.FC = () => {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get('/api/discussions', { withCredentials: true })
      .then(r => setDiscussions(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container">Loading discussions...</div>;

  return (
    <section className="view-section">
      <div className="view-header">
        <div>
          <h2 className="view-title">Discussion</h2>
          <p className="view-subtitle">Editorials, announcements, and community discussion.</p>
        </div>
      </div>

      {discussions.length === 0 ? (
        <div className="empty-state">No discussions yet. Check back after a contest ends!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {discussions.map(d => (
            <Link
              key={d._id}
              to={`/discussions/${d._id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  border: `1px solid ${d.pinned ? 'var(--c-ink)' : 'var(--c-border)'}`,
                  background: d.pinned ? 'var(--c-paper-dark)' : 'transparent',
                  transition: 'border-color 0.15s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--c-ink)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = d.pinned ? 'var(--c-ink)' : 'var(--c-border)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  {d.pinned && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--c-ink-soft)', fontWeight: 600 }}>📌 PINNED</span>
                  )}
                  <span style={typeBadgeStyle(d.type)}>{d.type}</span>
                  {d.test && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-ink-soft)', background: 'var(--c-paper-dark)', border: '1px solid var(--c-border)', padding: '1px 7px' }}>
                      {d.test.title}
                    </span>
                  )}
                </div>

                <h3 style={{ fontFamily: 'var(--f-serif)', fontSize: '1.1rem', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  {d.title}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'var(--c-ink-soft)' }}>
                  {d.author.picture && (
                    <img src={d.author.picture} alt={d.author.name} style={{ width: 18, height: 18, borderRadius: '50%' }} />
                  )}
                  <span
                    onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/user/${d.author._id}`); }}
                    style={{ cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                  >{d.author.name}</span>
                  <span>·</span>
                  <span>{new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>·</span>
                  <span>{d.commentCount ?? 0} comment{(d.commentCount ?? 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default Discussions;
