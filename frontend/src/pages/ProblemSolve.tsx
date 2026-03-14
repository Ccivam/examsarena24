import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

interface Problem {
  _id: string;
  title: string;
  content: string;
  options: { label: string; text: string }[];
  subject: string;
  difficulty: string;
  explanation?: string;
  correctOption?: string;
}

interface SubmitResult {
  correct: boolean;
  correctOption: string;
  explanation: string;
}

const ProblemSolve: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios
      .get(`/api/problems/${id}`, { withCredentials: true })
      .then(r => setProblem(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!selected || !problem) return;
    setSubmitting(true);
    try {
      const r = await axios.post(
        `/api/problems/${problem._id}/practice-submit`,
        { selectedOption: selected },
        { withCredentials: true }
      );
      setResult(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-container">Loading problem...</div>;
  if (!problem) return <div className="loading-container">Problem not found.</div>;

  return (
    <section className="view-section">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/problems" style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to Problems
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', padding: '3px 10px', border: '1px solid var(--c-border)', background: 'var(--c-paper-dark)' }}>
          {problem.subject}
        </span>
        <span style={{ fontSize: '0.75rem', padding: '3px 10px', border: '1px solid var(--c-border)', background: 'var(--c-paper-dark)' }}>
          {problem.difficulty}
        </span>
      </div>

      <h2 style={{ fontFamily: 'var(--f-serif)', fontSize: '1.4rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
        {problem.title}
      </h2>

      <div
        style={{ marginBottom: '2rem', lineHeight: 1.8, fontSize: '0.95rem' }}
        dangerouslySetInnerHTML={{ __html: problem.content }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {problem.options.map(opt => {
          let bg = 'var(--c-paper-dark)';
          let border = 'var(--c-border)';
          if (result) {
            if (opt.label === result.correctOption) {
              bg = 'rgba(16,185,129,0.12)';
              border = '#10b981';
            } else if (opt.label === selected && !result.correct) {
              bg = 'rgba(239,68,68,0.1)';
              border = '#ef4444';
            }
          } else if (selected === opt.label) {
            bg = 'rgba(var(--c-accent-rgb, 0,0,0),0.08)';
            border = 'var(--c-ink)';
          }

          return (
            <div
              key={opt.label}
              onClick={() => !result && setSelected(opt.label)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                padding: '1rem 1.25rem',
                border: `1px solid ${border}`,
                background: bg,
                cursor: result ? 'default' : 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <span style={{ fontWeight: 700, minWidth: 20, color: 'var(--c-ink)' }}>{opt.label}.</span>
              <span style={{ lineHeight: 1.6 }}>{opt.text}</span>
              {result && opt.label === result.correctOption && (
                <span style={{ marginLeft: 'auto', color: '#10b981', fontWeight: 700 }}>✓</span>
              )}
              {result && opt.label === selected && !result.correct && opt.label !== result.correctOption && (
                <span style={{ marginLeft: 'auto', color: '#ef4444', fontWeight: 700 }}>✗</span>
              )}
            </div>
          );
        })}
      </div>

      {!result ? (
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!selected || submitting}
          style={{ padding: '10px 28px' }}
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      ) : (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            border: `1px solid ${result.correct ? '#10b981' : '#ef4444'}`,
            background: result.correct ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: '0.5rem', color: result.correct ? '#10b981' : '#ef4444', fontSize: '1rem' }}>
            {result.correct ? '✓ Correct!' : '✗ Incorrect'}
          </p>
          {!result.correct && (
            <p style={{ fontSize: '0.88rem', marginBottom: '0.5rem', color: 'var(--c-ink-soft)' }}>
              Correct answer: <strong style={{ color: 'var(--c-ink)' }}>{result.correctOption}</strong>
            </p>
          )}
          {result.explanation && (
            <p style={{ fontSize: '0.88rem', lineHeight: 1.7, marginTop: '0.5rem' }}>
              <strong>Explanation:</strong> {result.explanation}
            </p>
          )}
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={() => { setSelected(null); setResult(null); }}
            style={{ padding: '8px 20px' }}
          >
            Try Again
          </button>
          <Link to="/problems" className="btn" style={{ padding: '8px 20px' }}>
            Back to Problems
          </Link>
        </div>
      )}
    </section>
  );
};

export default ProblemSolve;
