import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Discussion, Comment } from '../types';

const DiscussionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get(`/api/discussions/${id}`, { withCredentials: true })
      .then(r => setDiscussion(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const r = await axios.post(
        `/api/discussions/${id}/comments`,
        { content: commentText.trim() },
        { withCredentials: true }
      );
      setDiscussion(prev => prev ? { ...prev, comments: [...prev.comments, r.data] } : prev);
      setCommentText('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await axios.delete(`/api/discussions/${id}/comments/${commentId}`, { withCredentials: true });
      setDiscussion(prev =>
        prev ? { ...prev, comments: prev.comments.filter(c => c._id !== commentId) } : prev
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  if (loading) return <div className="loading-container">Loading...</div>;
  if (!discussion) return <div className="loading-container">Discussion not found.</div>;

  const isAdminUser = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <section className="view-section">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/discussions" style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to Discussions
        </Link>
      </div>

      {/* Header badges */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{
          fontSize: '0.65rem', padding: '2px 8px', color: '#fff', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          background: discussion.type === 'editorial' ? '#7c3aed' : discussion.type === 'announcement' ? '#0369a1' : '#374151',
        }}>
          {discussion.type}
        </span>
        {discussion.test && (
          <span style={{ fontSize: '0.75rem', color: 'var(--c-ink-soft)', border: '1px solid var(--c-border)', padding: '1px 8px', background: 'var(--c-paper-dark)' }}>
            {discussion.test.title}
          </span>
        )}
        {discussion.pinned && (
          <span style={{ fontSize: '0.72rem', color: 'var(--c-ink-soft)', fontWeight: 600 }}>📌 Pinned</span>
        )}
      </div>

      <h2 style={{ fontFamily: 'var(--f-serif)', fontSize: '1.6rem', marginBottom: '0.75rem', lineHeight: 1.3 }}>
        {discussion.title}
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', fontSize: '0.8rem', color: 'var(--c-ink-soft)' }}>
        {discussion.author.picture && (
          <img src={discussion.author.picture} alt={discussion.author.name} style={{ width: 22, height: 22, borderRadius: '50%' }} />
        )}
        <span style={{ fontWeight: 500, color: 'var(--c-ink)' }}>{discussion.author.name}</span>
        <span>·</span>
        <span>{new Date(discussion.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>

      {/* Content */}
      <div
        style={{
          padding: '1.5rem',
          border: '1px solid var(--c-border)',
          background: 'var(--c-paper-dark)',
          marginBottom: '3rem',
          lineHeight: 1.8,
          fontSize: '0.95rem',
          whiteSpace: 'pre-wrap',
        }}
        dangerouslySetInnerHTML={{ __html: discussion.content }}
      />

      {/* Comments */}
      <span className="section-label">
        {discussion.comments.length} Comment{discussion.comments.length !== 1 ? 's' : ''}
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1rem 0 2rem' }}>
        {discussion.comments.length === 0 ? (
          <div style={{ color: 'var(--c-ink-soft)', fontSize: '0.9rem', padding: '1rem 0' }}>
            No comments yet. Be the first to discuss!
          </div>
        ) : (
          discussion.comments.map((c: Comment) => {
            const canDelete = user?._id === c.author._id || isAdminUser;
            return (
              <div
                key={c._id}
                style={{
                  padding: '1rem 1.25rem',
                  border: '1px solid var(--c-border)',
                  background: 'var(--c-paper-dark)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    {c.author.picture && (
                      <img src={c.author.picture} alt={c.author.name} style={{ width: 20, height: 20, borderRadius: '50%' }} />
                    )}
                    <span style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{c.author.name}</span>
                    {(c.author.role === 'admin' || c.author.role === 'super_admin') && (
                      <span style={{ fontSize: '0.6rem', background: 'var(--c-ink)', color: 'var(--c-paper)', padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {c.author.role === 'super_admin' ? 'Owner' : 'Admin'}
                      </span>
                    )}
                    <span style={{ color: 'var(--c-ink-soft)' }}>·</span>
                    <span style={{ color: 'var(--c-ink-soft)' }}>
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteComment(c._id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-ink-soft)', fontSize: '0.75rem' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{c.content}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Add comment */}
      <form onSubmit={handleComment}>
        <span className="section-label" style={{ marginBottom: '0.75rem' }}>Add a Comment</span>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{error}</div>
        )}
        <textarea
          className="form-input"
          rows={4}
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          placeholder="Share your thoughts, ask a doubt, or discuss the solution..."
          style={{ marginBottom: '0.75rem', resize: 'vertical' }}
          maxLength={2000}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!commentText.trim() || submitting}
          style={{ padding: '10px 24px' }}
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
    </section>
  );
};

export default DiscussionDetail;
