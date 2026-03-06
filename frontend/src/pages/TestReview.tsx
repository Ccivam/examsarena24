import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Test, Submission, Result } from '../types';

const TestReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<Test | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [solutionsVisible, setSolutionsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get(`/api/tests/${id}/review`, { withCredentials: true })
      .then((r) => {
        setTest(r.data.test);
        setSubmission(r.data.submission);
        setResult(r.data.result);
        setSolutionsVisible(r.data.solutionsVisible ?? false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load review');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-container">Loading review...</div>;
  if (error) return (
    <section className="view-section">
      <div className="alert alert-info">{error}</div>
      <Link to="/past" className="btn">← Back to Past Tests</Link>
    </section>
  );
  if (!test) return null;

  const getAnswer = (problemId: string) => {
    return submission?.answers.find((a) => a.problem === problemId)?.selectedOption || null;
  };

  const problems = test.problems.sort((a, b) => a.order - b.order);

  return (
    <section className="view-section">
      <div className="view-header">
        <div>
          <h2 className="view-title">Review: {test.title}</h2>
          <p className="view-subtitle">
            {submission?.submittedAt
              ? `Submitted on ${new Date(submission.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : submission
              ? 'Not submitted'
              : 'You did not participate in this exam'}
            {result ? ` • Score: ${result.totalScore}/${result.maxScore}` : ''}
          </p>
        </div>
        <Link to="/past" className="btn">← Back to List</Link>
      </div>

      {/* Result summary */}
      {result && (
        <div className="stats-grid" style={{ marginBottom: '3rem' }}>
          <div className="stat-card">
            <span className="stat-value">
              {result.totalScore}/{result.maxScore}
            </span>
            <span className="stat-label">Score</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">#{result.rank}</span>
            <span className="stat-label">Rank</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{result.percentile}%ile</span>
            <span className="stat-label">Percentile</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: '#1a7a00' }}>{result.correctAnswers}</span>
            <span className="stat-label">Correct</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: '#7a0000' }}>{result.wrongAnswers}</span>
            <span className="stat-label">Wrong</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{result.unattempted}</span>
            <span className="stat-label">Unattempted</span>
          </div>
        </div>
      )}

      {!solutionsVisible && (
        <div className="alert alert-info" style={{ marginBottom: '2rem' }}>
          Solutions will be visible once the exam ends.
        </div>
      )}

      <div className="question-paper">
        {problems.map((tp, idx) => {
          const problem = tp.problem;
          const myAnswer = getAnswer(problem._id);
          const isCorrect = solutionsVisible && myAnswer === problem.correctOption;
          const isWrong = solutionsVisible && myAnswer && myAnswer !== problem.correctOption;

          return (
            <div key={problem._id} className="question-block">
              <div className="q-meta">
                Question {idx + 1} &bull; {problem.subject} &bull; +{problem.marks} / -{problem.negativeMarks}
              </div>
              <div
                className="q-text"
                dangerouslySetInnerHTML={{ __html: problem.content }}
              />
              <div className="q-options">
                {problem.options.map((opt) => {
                  let className = 'option-row';
                  if (solutionsVisible && opt.label === problem.correctOption) {
                    className += ' correct';
                  } else if (myAnswer === opt.label && isWrong) {
                    className += ' wrong';
                  } else if (!solutionsVisible && myAnswer === opt.label) {
                    className += ' selected';
                  }

                  return (
                    <div key={opt.label} className={className} style={{ cursor: 'default' }}>
                      <div className="option-marker">{opt.label}</div>
                      <div>
                        {opt.text}
                        {myAnswer === opt.label && !solutionsVisible && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--c-ink-soft)' }}>
                            (Your Answer)
                          </span>
                        )}
                        {myAnswer === opt.label && solutionsVisible && isWrong && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#7a0000' }}>
                            (Your Answer)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!myAnswer && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--c-ink-soft)', fontStyle: 'italic' }}>
                  Not attempted
                </p>
              )}

              {solutionsVisible && problem.explanation && (
                <div
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.85rem',
                    color: 'var(--c-ink-soft)',
                    borderTop: '1px solid var(--c-border)',
                    paddingTop: '1rem',
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--c-ink)' }}>Explanation: </span>
                  {problem.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {test.leaderboardPublishedAt && (
        <div style={{ marginTop: '3rem' }}>
          <Link to={`/leaderboard/test/${test._id}`} className="btn btn-primary">
            View Full Leaderboard
          </Link>
        </div>
      )}
    </section>
  );
};

export default TestReview;
