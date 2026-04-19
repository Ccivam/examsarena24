import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Test, Submission } from '../types';
import { sanitizeHtml } from '../utils/sanitize';

// ── NTA section ordering ──────────────────────────────────────────────────
const SECTION_ORDER: { subject: string; type: 'mcq' | 'numerical' }[] = [
  { subject: 'Mathematics', type: 'mcq' },
  { subject: 'Mathematics', type: 'numerical' },
  { subject: 'Physics',     type: 'mcq' },
  { subject: 'Physics',     type: 'numerical' },
  { subject: 'Chemistry',   type: 'mcq' },
  { subject: 'Chemistry',   type: 'numerical' },
];

const SUBJECT_COLOR: Record<string, { bg: string; text: string; light: string }> = {
  Mathematics: { bg: '#1e3a8a', text: '#fff',    light: '#dbeafe' },
  Physics:     { bg: '#14532d', text: '#fff',    light: '#dcfce7' },
  Chemistry:   { bg: '#7c2d12', text: '#fff',    light: '#ffedd5' },
  Other:       { bg: '#374151', text: '#fff',    light: '#f3f4f6' },
};

interface Section {
  subject: string;
  type: 'mcq' | 'numerical';
  label: string;
  shortLabel: string;
  indices: number[];          // global indices in the sorted problems array
}

function buildSections(rawProblems: Test['problems']): { sorted: Test['problems']; sections: Section[] } {
  const used = new Set<string>();
  const sorted: Test['problems'] = [];
  const sections: Section[] = [];

  for (const { subject, type } of SECTION_ORDER) {
    const group = rawProblems
      .filter(tp => {
        const p = tp.problem as any;
        const matchSubject = p.subject === subject;
        const pType = p.problemType || 'mcq';
        return matchSubject && pType === type;
      })
      .sort((a, b) => a.order - b.order);

    if (group.length === 0) continue;

    const startIdx = sorted.length;
    group.forEach(tp => { used.add(tp.problem._id); sorted.push(tp); });

    sections.push({
      subject,
      type,
      label: `${subject} — ${type === 'mcq' ? 'MCQ' : 'Integer Type'}`,
      shortLabel: `${subject.slice(0, 4)} ${type === 'mcq' ? 'MCQ' : 'INT'}`,
      indices: Array.from({ length: group.length }, (_, i) => startIdx + i),
    });
  }

  // Any unmatched problems go at end
  const remaining = rawProblems.filter(tp => !used.has(tp.problem._id)).sort((a, b) => a.order - b.order);
  if (remaining.length > 0) {
    const startIdx = sorted.length;
    remaining.forEach(tp => sorted.push(tp));
    sections.push({
      subject: 'Other', type: 'mcq', label: 'Other', shortLabel: 'Other',
      indices: Array.from({ length: remaining.length }, (_, i) => startIdx + i),
    });
  }

  return { sorted, sections };
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set([0]));
  const [showInstructions, setShowInstructions] = useState(true);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const submittingRef = useRef(false);
  const fullscreenEnteredRef = useRef(false);
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load test
  useEffect(() => {
    const startTest = async () => {
      try {
        const res = await axios.post(`/api/tests/${id}/start`, {}, { withCredentials: true });
        setTest(res.data.test);
        setSubmission(res.data.submission);
        const endTime = new Date(res.data.test.endTime).getTime();
        setTimeLeft(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
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
    if (showInstructions || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); handleFinalSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showInstructions, timeLeft > 0]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getAnswer = (problemId: string) =>
    submission?.answers.find(a => a.problem === problemId)?.selectedOption || null;

  // ── INSTANT optimistic update — no delay ─────────────────────────────────
  const handleAnswer = (problemId: string, option: string, isNumerical = false) => {
    if (!submission || submission.isSubmitted) return;

    // Update local state immediately (no API wait)
    setSubmission(prev => {
      if (!prev) return prev;
      const exists = prev.answers.some(a => a.problem === problemId);
      const newAnswers = exists
        ? prev.answers.map(a =>
            a.problem === problemId
              ? { ...a, selectedOption: option || null }
              : a
          )
        : [...prev.answers, { problem: problemId, selectedOption: option, submittedAt: new Date().toISOString() }];
      return { ...prev, answers: newAnswers };
    });

    // Sync to server in background — debounce for numerical input (typing)
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(() => {
      axios.put(`/api/tests/${id}/answer`, { problemId, selectedOption: option }, { withCredentials: true })
        .catch(() => {}); // silent fail; answers will be re-confirmed on submit
    }, isNumerical ? 600 : 0);
  };

  const handleFinalSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    try {
      await axios.post(`/api/tests/${id}/submit`, {}, { withCredentials: true });
      navigate(`/test/${id}/submitted`);
    } catch {
      navigate('/dashboard');
    }
  }, [id, navigate]);

  // Auto-submit on tab switch
  useEffect(() => {
    if (showInstructions) return;
    const handle = () => { if (document.hidden) handleFinalSubmit(); };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [showInstructions, handleFinalSubmit]);

  // Fullscreen exit warning
  useEffect(() => {
    if (showInstructions) return;
    const handle = () => {
      if (!document.fullscreenElement && fullscreenEnteredRef.current && !submittingRef.current)
        setShowFullscreenWarning(true);
    };
    document.addEventListener('fullscreenchange', handle);
    return () => document.removeEventListener('fullscreenchange', handle);
  }, [showInstructions]);

  const handleEnterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      fullscreenEnteredRef.current = true;
    } catch {}
    setShowInstructions(false);
  };

  const goToQuestion = (i: number) => {
    setCurrentQ(i);
    setVisitedQuestions(prev => new Set([...prev, i]));
  };

  // ── Build section-sorted problems ────────────────────────────────────────
  const { sorted: problems, sections } = useMemo(() =>
    test ? buildSections(test.problems) : { sorted: [], sections: [] },
  [test]);

  // Find which section the current question belongs to
  const currentSection = sections.find(s => s.indices.includes(currentQ));

  if (loading) return <div className="loading-container">Loading test...</div>;

  if (error) {
    const alreadySubmitted = error.includes('already submitted');
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '500px', width: '100%', textAlign: 'center', border: '2px solid var(--c-ink)', padding: '3rem' }}>
          {alreadySubmitted ? (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
              <h2 style={{ fontFamily: 'var(--f-serif)', fontSize: '1.8rem', marginBottom: '1rem' }}>Test Already Submitted</h2>
              <p style={{ color: 'var(--c-ink-soft)', marginBottom: '2rem', lineHeight: 1.6 }}>
                Your test was submitted because you exited fullscreen or switched tabs.<br />Re-entry is not allowed.
              </p>
            </>
          ) : (
            <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>
          )}
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">Go to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!test) return null;

  // ── Instructions Screen ───────────────────────────────────────────────────
  if (showInstructions) {
    // Build section summary for instructions
    const sectionSummary = sections.map(s => ({
      label: s.label,
      count: s.indices.length,
      color: SUBJECT_COLOR[s.subject] || SUBJECT_COLOR.Other,
    }));

    return (
      <div style={{ minHeight: '100vh', background: 'var(--c-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '640px', width: '100%', border: '2px solid var(--c-ink)', padding: '3rem' }}>
          <h1 style={{ fontFamily: 'var(--f-serif)', fontSize: '2rem', marginBottom: '0.25rem' }}>{test.title}</h1>
          <p style={{ color: 'var(--c-ink-soft)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            {problems.length} questions &bull; {test.duration} minutes &bull; {test.type.replace(/_/g, ' ')}
          </p>

          {/* Section breakdown */}
          {sectionSummary.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', color: 'var(--c-ink-soft)' }}>Sections</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {sectionSummary.map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid var(--c-border)', background: s.color.light, fontSize: '0.82rem' }}>
                    <div style={{ width: 10, height: 10, background: s.color.bg, borderRadius: 1, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{s.label}</span>
                    <strong>{s.count} Q</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: '#fff8e1', border: '1px solid #f59e0b', padding: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.85rem', color: '#92400e' }}>⚠ Proctoring Rules</div>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.82rem', color: '#78350f', lineHeight: 1.8, margin: 0 }}>
              <li>Test runs in <strong>fullscreen mode</strong> — do not exit.</li>
              <li><strong>Do not switch tabs</strong> or open another window.</li>
              <li>Any violation will <strong>immediately auto-submit</strong> your test.</li>
              <li>Answers are saved automatically — no manual save needed.</li>
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '2rem', textAlign: 'center', fontSize: '0.82rem' }}>
            {[
              { label: 'MCQ Correct',      value: '+4 marks', bg: '#dcfce7', color: '#14532d' },
              { label: 'MCQ Incorrect',    value: '−1 mark',  bg: '#fee2e2', color: '#991b1b' },
              { label: 'Integer Correct',  value: '+4 marks', bg: '#dcfce7', color: '#14532d' },
              { label: 'Integer Incorrect',value: '0 marks',  bg: '#fef3c7', color: '#92400e' },
              { label: 'Unattempted',      value: '0 marks',  bg: '#f3f4f6', color: '#374151' },
            ].slice(0, 3).map(({ label, value, bg, color }) => (
              <div key={label} style={{ padding: '0.75rem', border: '1px solid var(--c-border)', background: bg }}>
                <div style={{ color, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                <div style={{ fontWeight: 700, marginTop: '0.25rem', fontSize: '1rem', color }}>{value}</div>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem' }} onClick={handleEnterFullscreen}>
            Enter Fullscreen & Start Test →
          </button>
          <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--c-ink-soft)' }}>
            By starting, you agree to the proctoring rules above.
          </p>
        </div>
      </div>
    );
  }

  // ── Test UI ───────────────────────────────────────────────────────────────
  const currentProblem = problems[currentQ]?.problem as any;
  const answeredCount = submission?.answers.filter(a => a.selectedOption).length || 0;
  const subjectColor = currentSection ? (SUBJECT_COLOR[currentSection.subject] || SUBJECT_COLOR.Other) : SUBJECT_COLOR.Other;

  return (
    <>
      {/* Fullscreen exit warning */}
      {showFullscreenWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '2rem' }}>
          <div style={{ background: 'var(--c-paper)', border: '2px solid var(--c-ink)', padding: '2.5rem', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ fontFamily: 'var(--f-serif)', fontSize: '1.4rem', marginBottom: '0.75rem' }}>You exited fullscreen</h3>
            <p style={{ color: 'var(--c-ink-soft)', lineHeight: 1.6, marginBottom: '2rem', fontSize: '0.9rem' }}>
              Exiting fullscreen will <strong>automatically submit your exam</strong>. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-primary" style={{ padding: '10px 24px' }}
                onClick={async () => { setShowFullscreenWarning(false); try { await document.documentElement.requestFullscreen(); } catch {} }}>
                ↩ Go Back
              </button>
              <button className="btn" style={{ padding: '10px 24px', borderColor: '#dc2626', color: '#dc2626' }}
                onClick={() => { setShowFullscreenWarning(false); handleFinalSubmit(); }}>
                Submit & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: '100vh', background: '#f8f7f2' }}>

        {/* ── Left: Question area ── */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '2px solid #d0cdc0' }}>

          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', background: '#1a1a1a', color: '#fff', flexShrink: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.9 }}>{test.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>{answeredCount}/{problems.length} answered</span>
              <div style={{
                fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700,
                color: timeLeft < 300 ? '#f87171' : '#4ade80',
                background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 3,
              }}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* Section header bar */}
          {currentSection && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.5rem 1.5rem',
              background: subjectColor.bg, color: subjectColor.text,
              fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', flexShrink: 0,
            }}>
              <span style={{ textTransform: 'uppercase' }}>{currentSection.label}</span>
              <span style={{ opacity: 0.7 }}>·</span>
              <span style={{ fontWeight: 400, opacity: 0.85 }}>
                Q{currentSection.indices.indexOf(currentQ) + 1} of {currentSection.indices.length} in this section
                &nbsp;(Overall Q{currentQ + 1})
              </span>
            </div>
          )}

          {/* Question content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem 1rem' }}>
            {currentProblem && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-ink)' }}>
                    Question {currentQ + 1}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--c-ink-soft)' }}>
                    +{currentProblem.marks} / {currentProblem.problemType === 'numerical' ? '0' : `−${currentProblem.negativeMarks}`}
                  </span>
                  {currentProblem.problemType === 'numerical' && (
                    <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1e40af', padding: '2px 7px', borderRadius: 2, fontWeight: 600 }}>
                      INTEGER TYPE
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', background: subjectColor.light, color: subjectColor.bg, padding: '2px 7px', borderRadius: 2, fontWeight: 600 }}>
                    {currentProblem.subject}
                  </span>
                </div>

                <div style={{ fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '1.5rem', color: '#1a1a1a' }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentProblem.content) }} />

                {/* Integer input */}
                {currentProblem.problemType === 'numerical' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--c-ink-soft)', marginBottom: '0.5rem', fontWeight: 500 }}>
                      Enter your answer:
                    </label>
                    <input
                      type="number"
                      style={{
                        width: 200, padding: '10px 14px', fontSize: '1.3rem', fontWeight: 700,
                        border: '2px solid #d0cdc0', borderRadius: 2, outline: 'none',
                        fontFamily: 'monospace', background: '#fff',
                      }}
                      value={getAnswer(currentProblem._id) ?? ''}
                      onChange={e => handleAnswer(currentProblem._id, e.target.value, true)}
                      placeholder="—"
                    />
                    {getAnswer(currentProblem._id) && (
                      <button onClick={() => handleAnswer(currentProblem._id, '', true)}
                        style={{ display: 'block', marginTop: '0.6rem', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}>
                        Clear Answer
                      </button>
                    )}
                  </div>
                ) : (
                  /* MCQ options */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {currentProblem.options.map((opt: any) => {
                      const selected = getAnswer(currentProblem._id) === opt.label;
                      return (
                        <div key={opt.label}
                          onClick={() => handleAnswer(currentProblem._id, selected ? '' : opt.label)}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                            padding: '0.85rem 1rem', cursor: 'pointer',
                            border: `2px solid ${selected ? subjectColor.bg : '#d0cdc0'}`,
                            background: selected ? subjectColor.light : '#fff',
                            borderRadius: 3, transition: 'border-color 0.08s, background 0.08s',
                          }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.82rem',
                            background: selected ? subjectColor.bg : '#e8e6de',
                            color: selected ? subjectColor.text : '#555',
                          }}>
                            {opt.label}
                          </div>
                          <span style={{ fontSize: '0.9rem', lineHeight: 1.6, paddingTop: '2px', color: '#1a1a1a' }}>
                            {opt.text}
                          </span>
                        </div>
                      );
                    })}
                    {getAnswer(currentProblem._id) && (
                      <button onClick={() => handleAnswer(currentProblem._id, '')}
                        style={{ alignSelf: 'flex-start', marginTop: '0.25rem', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}>
                        Clear Selection
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Navigation bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', borderTop: '1px solid #d0cdc0', background: '#fff', flexShrink: 0 }}>
            <button className="btn" onClick={() => goToQuestion(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
              style={{ minWidth: 100 }}>
              ← Previous
            </button>
            <button className="btn btn-primary"
              style={{ minWidth: 120, background: '#dc2626', border: '1px solid #dc2626', padding: '8px 20px' }}
              onClick={() => { if (confirm(`Submit test? You've answered ${answeredCount}/${problems.length} questions.`)) handleFinalSubmit(); }}
              disabled={submitting}>
              {submitting ? 'Submitting...' : '⏏ Submit'}
            </button>
            {currentQ < problems.length - 1 ? (
              <button className="btn btn-primary" onClick={() => goToQuestion(currentQ + 1)}
                style={{ minWidth: 100 }}>
                Next →
              </button>
            ) : (
              <button className="btn" style={{ minWidth: 100 }} disabled>End</button>
            )}
          </div>
        </div>

        {/* ── Right: Question palette ── */}
        <div style={{ background: '#f0ede4', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Legend */}
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #d0cdc0', background: '#e8e4d8', flexShrink: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: '0.68rem', color: '#555' }}>
              {[
                { bg: '#39ff14', border: '#1a8c00', label: 'Answered' },
                { bg: '#fff3cd', border: '#f59e0b', label: 'Visited' },
                { bg: '#fff',    border: '#d0cdc0', label: 'Not visited' },
                { bg: '#1a1a1a', border: '#1a1a1a', label: 'Current' },
              ].map(({ bg, border, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: 14, height: 14, background: bg, border: `2px solid ${border}`, flexShrink: 0 }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Section groups */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
            {sections.map(section => {
              const sc = SUBJECT_COLOR[section.subject] || SUBJECT_COLOR.Other;
              return (
                <div key={section.label} style={{ marginBottom: '1rem' }}>
                  {/* Section header */}
                  <div style={{
                    background: sc.bg, color: sc.text, padding: '4px 8px',
                    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
                    textTransform: 'uppercase', marginBottom: '0.4rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span>{section.label}</span>
                    <span style={{ opacity: 0.75, fontWeight: 400 }}>
                      {section.indices.filter(i => {
                        const p = problems[i]?.problem;
                        return p ? !!getAnswer(p._id) : false;
                      }).length}/{section.indices.length}
                    </span>
                  </div>

                  {/* Question buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {section.indices.map(globalIdx => {
                      const p = problems[globalIdx]?.problem;
                      const answered = p ? !!getAnswer(p._id) : false;
                      const visited = visitedQuestions.has(globalIdx);
                      const isCurrent = globalIdx === currentQ;
                      const qNum = globalIdx + 1;

                      let bg = '#fff', border = '#d0cdc0', color = '#333', fw = 400;
                      if (isCurrent)      { bg = '#1a1a1a'; border = '#1a1a1a'; color = '#fff'; fw = 700; }
                      else if (answered)  { bg = '#39ff14'; border = '#1a8c00'; color = '#1a1a1a'; }
                      else if (visited)   { bg = '#fff3cd'; border = '#f59e0b'; color = '#1a1a1a'; }

                      return (
                        <button key={globalIdx} onClick={() => goToQuestion(globalIdx)}
                          style={{
                            height: 34, border: `2px solid ${border}`, background: bg,
                            color, fontWeight: fw, cursor: 'pointer',
                            fontFamily: 'var(--f-sans)', fontSize: '0.75rem',
                            borderRadius: 2,
                          }}>
                          {qNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit button */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid #d0cdc0', background: '#e8e4d8', flexShrink: 0 }}>
            <button className="btn btn-primary"
              style={{ width: '100%', padding: '10px', background: '#dc2626', border: '1px solid #dc2626', fontWeight: 700 }}
              onClick={() => { if (confirm(`Submit test? You've answered ${answeredCount}/${problems.length} questions.`)) handleFinalSubmit(); }}
              disabled={submitting}>
              {submitting ? 'Submitting...' : '⏏ Submit Test'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TestRoom;
