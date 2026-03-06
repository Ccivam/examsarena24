import React from 'react';
import { Link, useParams } from 'react-router-dom';

const TestSubmitted: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '480px' }}>
        <div
          style={{
            width: 64,
            height: 64,
            background: 'var(--c-accent)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem',
            fontSize: '2rem',
          }}
        >
          ✓
        </div>
        <h2 className="view-title" style={{ marginBottom: '1rem' }}>Test Submitted!</h2>
        <p className="serif-text" style={{ color: 'var(--c-ink-soft)', marginBottom: '2rem', fontStyle: 'italic' }}>
          Your answers have been recorded. Results and solutions will be published after the test
          concludes and the admin processes the submissions.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/dashboard" className="btn btn-primary">
            Go to Dashboard
          </Link>
          <Link to={`/test/${id}/review`} className="btn">
            View Submission
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TestSubmitted;
