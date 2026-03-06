import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Test, Submission } from '../types';

const TestRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const startTest = async () => {
      try {
        const res = await axios.post(`/api/tests/${id}/start`, {}, { withCredentials: true });
        setTest(res.data.test);
        setSubmission(res.data.submission);
        // Calculate time left
        const endTime = new Date(res.data.test.endTime).getTime();
        const now = Date.now();
        setTimeLeft(Math.max(0, Math.floor((endTime - now) / 1000)));
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to start test');
      } finally {
        setLoading(false);
      }
    };
    startTest();
  }, [id]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          handleFinalSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft > 0]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getAnswer = (problemId: string) => {
    return submission?.answers.find((a) => a.problem === problemId)?.selectedOption || null;
  };

  const handleAnswer = async (problemId: string, option: string) => {
    if (!submission || submission.isSubmitted) return;
    setSaving(true);
    try {
      const res = await axios.put(
        `/api/tests/${id}/answer`,
        { problemId, selectedOption: option },
        { withCredentials: true }
      );
      setSubmission(res.data.submission);
    } catch (err) {
      console.error('Failed to save answer', err);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await axios.post(`/api/tests/${id}/submit`, {}, { withCredentials: true });
      navigate(`/test/${id}/submitted`);
    } catch (err) {
      console.error('Submit error', err);
      navigate('/dashboard');
    }
  }, [id, navigate, submitting]);

  if (loading) return <div className="loading-container">Loading test...</div>;
  if (error) return (
    <div style={{ padding: '3rem', maxWidth: '600px', margin: '0 auto' }}>
      <div className="alert alert-error">{error}</div>
      <button onClick={() => navigate(-1)} className="btn">Go Back</button>
    </div>
  );
  if (!test) return null;

  const problems = test.problems.sort((a, b) => a.order - b.order);
  const currentProblem = problems[currentQ]?.problem;
  const answeredCount = submission?.answers.filter((a) => a.selectedOption).length || 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', minHeight: '100vh', maxWidth: '1600px', margin: '0 auto', border: '1px solid var(--c-border)' }}>
      {/* Main area */}
      <div style={{ padding: '2rem 3rem', borderRight: '1px solid var(--c-border)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem', background: 'var(--c-paper-dark)', border: '1px solid var(--c-border)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{test.title}</div>
            {saving && <div style={{ fontSize: '0.7rem', color: 'var(--c-ink-soft)' }}>Saving...</div>}
          </div>
          <div className={`test-timer${timeLeft < 300 ? ' warning' : ''}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {currentProblem && (
          <div className="question-block" style={{ marginBottom: '2rem' }}>
            <div className="q-meta">
              Question {currentQ + 1} of {problems.length} &bull; {currentProblem.subject} &bull; +{currentProblem.marks} / -{currentProblem.negativeMarks}
            </div>
            <div className="q-text" dangerouslySetInnerHTML={{ __html: currentProblem.content }} />
            <div className="q-options">
              {currentProblem.options.map((opt) => {
                const selected = getAnswer(currentProblem._id) === opt.label;
                return (
                  <div
                    key={opt.label}
                    className={`option-row${selected ? ' selected' : ''}`}
                    onClick={() => handleAnswer(currentProblem._id, opt.label)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="option-marker" style={selected ? { background: 'var(--c-ink)', color: 'var(--c-paper)' } : {}}>
                      {opt.label}
                    </div>
                    <div>{opt.text}</div>
                  </div>
                );
              })}
            </div>
            {getAnswer(currentProblem._id) && (
              <button
                onClick={() => handleAnswer(currentProblem._id, '')}
                style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--c-ink-soft)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
              >
                Clear Answer
              </button>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
          <button
            className="btn"
            onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
            disabled={currentQ === 0}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--c-ink-soft)' }}>
            {answeredCount}/{problems.length} answered
          </span>
          {currentQ < problems.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={() => setCurrentQ((q) => Math.min(problems.length - 1, q + 1))}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => {
                if (confirm(`Submit test? You've answered ${answeredCount}/${problems.length} questions.`)) {
                  handleFinalSubmit();
                }
              }}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Test'}
            </button>
          )}
        </div>
      </div>

      {/* Question panel */}
      <div style={{ padding: '2rem', background: 'var(--c-paper-dark)' }}>
        <span className="section-label">Question Navigator</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '2rem' }}>
          {problems.map((p, i) => {
            const answered = getAnswer(p.problem._id);
            return (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                style={{
                  width: '40px',
                  height: '40px',
                  border: `2px solid ${i === currentQ ? 'var(--c-ink)' : answered ? 'var(--c-accent)' : 'var(--c-border)'}`,
                  background: answered ? 'var(--c-accent)' : i === currentQ ? 'var(--c-ink)' : 'transparent',
                  color: i === currentQ ? 'var(--c-paper)' : 'var(--c-ink)',
                  cursor: 'pointer',
                  fontFamily: 'var(--f-sans)',
                  fontSize: '0.8rem',
                  fontWeight: i === currentQ ? 600 : 400,
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--c-ink-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 16, height: 16, background: 'var(--c-accent)', border: '1px solid var(--c-border)' }} />
            Answered
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 16, height: 16, background: 'var(--c-ink)', border: '1px solid var(--c-border)' }} />
            Current
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 16, height: 16, background: 'transparent', border: '1px solid var(--c-border)' }} />
            Not visited
          </div>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid var(--c-border)', background: '#fff', fontSize: '0.85rem' }}>
          <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Summary</div>
          <div style={{ color: 'var(--c-ink-soft)' }}>Answered: {answeredCount}</div>
          <div style={{ color: 'var(--c-ink-soft)' }}>Unanswered: {problems.length - answeredCount}</div>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '1.5rem' }}
          onClick={() => {
            if (confirm(`Submit test? You've answered ${answeredCount}/${problems.length} questions.`)) {
              handleFinalSubmit();
            }
          }}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Final Submit'}
        </button>
      </div>
    </div>
  );
};

export default TestRoom;
