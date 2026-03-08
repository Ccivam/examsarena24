import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Test, Problem } from '../types';

type Tab = 'overview' | 'tests' | 'problems' | 'create-test' | 'create-problem' | 'post-discussion' | 'users';

const emptyProblemForm = {
  title: '', content: '', subject: 'Physics',
  options: [
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
    { label: 'D', text: '' },
  ],
  correctOption: 'A', explanation: '',
  marks: 4, negativeMarks: 1, difficulty: 'Medium', tags: '',
};

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Test form
  const [testForm, setTestForm] = useState({
    title: '', description: '', type: 'JEE_MAINS',
    startTime: '', endTime: '', duration: 180,
    fee: 0, registrationDeadline: '', maxParticipants: 10000,
  });

  // Problem form
  const [problemForm, setProblemForm] = useState(emptyProblemForm);

  // Discussion form
  const [discussionForm, setDiscussionForm] = useState({ title: '', content: '', type: 'general', test: '', pinned: false });
  const [completedTests, setCompletedTests] = useState<Test[]>([]);

  // Users management (super_admin)
  const [users, setUsers] = useState<any[]>([]);

  // Problem picker for a test
  const [managingTest, setManagingTest] = useState<Test | null>(null);
  const [approvedProblems, setApprovedProblems] = useState<Problem[]>([]);
  const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>([]);

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
  };

  useEffect(() => {
    if (tab === 'overview') {
      axios.get('/api/admin/stats', { withCredentials: true }).then(r => setStats(r.data));
    } else if (tab === 'tests') {
      axios.get('/api/admin/my-tests', { withCredentials: true }).then(r => setTests(r.data));
    } else if (tab === 'problems') {
      axios.get('/api/admin/problems', { withCredentials: true }).then(r => setProblems(r.data));
    } else if (tab === 'post-discussion') {
      axios.get('/api/tests', { withCredentials: true }).then(r =>
        setCompletedTests(r.data.filter((t: Test) => new Date(t.endTime) < new Date()))
      );
    } else if (tab === 'users') {
      axios.get('/api/users', { withCredentials: true }).then(r => setUsers(r.data));
    }
  }, [tab]);

  // ── Create Test ──────────────────────────────────────────────────────────
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/tests', testForm, { withCredentials: true });
      showMessage('Test created! Now add questions to it from the Tests tab.');
      setTestForm({
        title: '', description: '', type: 'JEE_MAINS',
        startTime: '', endTime: '', duration: 180,
        fee: 0, registrationDeadline: '', maxParticipants: 10000,
      });
      // Refresh tests and switch to tests tab
      const testsRes = await axios.get('/api/admin/my-tests', { withCredentials: true });
      setTests(testsRes.data);
      setTab('tests');
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to create test', 'error');
    }
  };

  // ── Create Problem ───────────────────────────────────────────────────────
  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/problems', {
        ...problemForm,
        tags: problemForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: 'approved',
      }, { withCredentials: true });
      showMessage('Problem created!');
      setProblemForm(emptyProblemForm); // reset form
      // Reload problems list
      axios.get('/api/admin/problems', { withCredentials: true }).then(r => setProblems(r.data));
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to create problem', 'error');
    }
  };

  // ── Manage Test Problems ─────────────────────────────────────────────────
  const openProblemPicker = async (test: Test) => {
    setManagingTest(test);
    const res = await axios.get('/api/admin/problems/approved', { withCredentials: true });
    setApprovedProblems(res.data);
    // Pre-select already added problems
    const currentIds = (test.problems || []).map((tp: any) =>
      typeof tp.problem === 'object' ? tp.problem._id : tp.problem
    );
    setSelectedProblemIds(currentIds);
  };

  const toggleProblem = (problemId: string) => {
    setSelectedProblemIds(prev =>
      prev.includes(problemId) ? prev.filter(id => id !== problemId) : [...prev, problemId]
    );
  };

  const saveTestProblems = async () => {
    if (!managingTest) return;
    try {
      await axios.put(`/api/admin/tests/${managingTest._id}/problems`,
        { problemIds: selectedProblemIds },
        { withCredentials: true }
      );
      showMessage(`${selectedProblemIds.length} questions saved to "${managingTest.title}"`);
      setManagingTest(null);
      // Refresh tests
      const res = await axios.get('/api/admin/my-tests', { withCredentials: true });
      setTests(res.data);
    } catch (err: any) {
      showMessage('Failed to save questions', 'error');
    }
  };

  // ── Problem moderation ───────────────────────────────────────────────────
  const handleProblemStatus = async (problemId: string, status: string) => {
    await axios.put(`/api/problems/${problemId}/status`, { status }, { withCredentials: true });
    setProblems(problems.map(p => p._id === problemId ? { ...p, status: status as any } : p));
    showMessage(`Problem ${status}`);
  };

  // ── Test actions ─────────────────────────────────────────────────────────
  const handleTestStatus = async (testId: string, status: string) => {
    await axios.put(`/api/admin/tests/${testId}/status`, { status }, { withCredentials: true });
    setTests(tests.map(t => t._id === testId ? { ...t, status: status as any } : t));
    showMessage(`Test set to ${status}`);
  };

  const handleCalculateResults = async (testId: string) => {
    try {
      const r = await axios.post(`/api/tests/${testId}/calculate-results`, {}, { withCredentials: true });
      showMessage(r.data.message);
      const res = await axios.get('/api/admin/my-tests', { withCredentials: true });
      setTests(res.data);
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Error', 'error');
    }
  };

  const handlePublishSolutions = async (testId: string) => {
    try {
      await axios.put(`/api/admin/tests/${testId}/publish-solutions`, {}, { withCredentials: true });
      showMessage('Solutions published!');
      const res = await axios.get('/api/admin/my-tests', { withCredentials: true });
      setTests(res.data);
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Error publishing solutions', 'error');
    }
  };

  const handlePublishLeaderboard = async (testId: string) => {
    try {
      await axios.put(`/api/admin/tests/${testId}/publish-leaderboard`, {}, { withCredentials: true });
      showMessage('Leaderboard published!');
      const res = await axios.get('/api/admin/my-tests', { withCredentials: true });
      setTests(res.data);
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Error publishing leaderboard', 'error');
    }
  };

  // ── Post Discussion ──────────────────────────────────────────────────────
  const handlePostDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/discussions', {
        ...discussionForm,
        test: discussionForm.test || undefined,
      }, { withCredentials: true });
      showMessage('Discussion posted!');
      setDiscussionForm({ title: '', content: '', type: 'general', test: '', pinned: false });
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to post discussion', 'error');
    }
  };

  // ── User role change ─────────────────────────────────────────────────────
  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const res = await axios.put(`/api/users/${userId}/role`, { role }, { withCredentials: true });
      setUsers(users.map(u => u._id === userId ? res.data : u));
      showMessage(`Role updated to ${role}`);
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to update role', 'error');
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'tests', label: 'Tests' },
    { id: 'problems', label: 'Problems' },
    { id: 'create-test', label: '+ New Test' },
    { id: 'create-problem', label: '+ New Problem' },
    { id: 'post-discussion', label: '+ Post Discussion' },
    ...(isSuperAdmin ? [{ id: 'users' as Tab, label: 'Users' }] : []),
  ];

  return (
    <section className="view-section">
      <div className="view-header">
        <div>
          <h2 className="view-title">Admin Panel</h2>
          <p className="view-subtitle">Manage tests, problems, and registrations.</p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${messageType === 'error' ? 'error' : 'success'}`} style={{ marginBottom: '1.5rem' }}>
          {message}
          <button onClick={() => setMessage('')} style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--c-ink)', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 20px', background: tab === t.id ? 'var(--c-ink)' : 'transparent',
            color: tab === t.id ? 'var(--c-paper)' : 'var(--c-ink-soft)', border: 'none',
            cursor: 'pointer', fontFamily: 'var(--f-sans)', fontSize: '0.8rem',
            fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && stats && (
        <div>
          <div className="stats-grid" style={{ marginBottom: '3rem' }}>
            {[
              { label: 'Total Users', value: stats.totalUsers },
              { label: 'Total Tests', value: stats.totalTests },
              { label: 'Total Problems', value: stats.totalProblems },
              { label: 'Pending Problems', value: stats.pendingProblems },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <span className="stat-value">{s.value}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
          {stats.liveTests?.length > 0 && (
            <>
              <span className="section-label">Live Tests</span>
              {stats.liveTests.map((t: Test) => (
                <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--c-border)', marginBottom: '0.5rem' }}>
                  <strong>{t.title}</strong>
                  <span className="status-badge status-live">LIVE</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Tests ── */}
      {tab === 'tests' && (
        <div>
          <table className="table-container">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Date</th>
                <th>Fee</th>
                <th>Qs</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 500 }}>{t.title}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--c-ink-soft)' }}>{t.type}</td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(t.startTime).toLocaleDateString('en-IN')}</td>
                  <td>{t.fee > 0 ? `₹${t.fee}` : 'Free'}</td>
                  <td style={{ fontWeight: 600 }}>{t.problems?.length || 0}</td>
                  <td><span className={`status-badge status-${t.status}`}>{t.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button className="btn" style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                        onClick={() => openProblemPicker(t)}>
                        Manage Qs
                      </button>
                      {t.status === 'upcoming' && (
                        <button className="btn" style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                          onClick={() => handleTestStatus(t._id, 'live')}>Go Live</button>
                      )}
                      {(t.status === 'live' || t.status === 'completed') && (
                        <button className="btn" style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                          onClick={() => handleCalculateResults(t._id)}>
                          Calc Results
                        </button>
                      )}
                      {t.status === 'completed' && !t.solutionPublishedAt && (
                        <button className="btn btn-primary" style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                          onClick={() => handlePublishSolutions(t._id)}>
                          Publish Solutions
                        </button>
                      )}
                      {t.status === 'completed' && t.solutionPublishedAt && !t.leaderboardPublishedAt && (
                        <button className="btn btn-primary" style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                          onClick={() => handlePublishLeaderboard(t._id)}>
                          Publish Leaderboard
                        </button>
                      )}
                      {t.leaderboardPublishedAt && (
                        <span className="status-badge status-verified" style={{ fontSize: '0.65rem' }}>
                          Leaderboard Live
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Problem picker modal */}
          {managingTest && (
            <div className="modal-overlay" onClick={() => setManagingTest(null)}>
              <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontFamily: 'var(--f-serif)', fontSize: '1.4rem', marginBottom: '0.25rem' }}>
                    Manage Questions
                  </h3>
                  <p style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem' }}>
                    {managingTest.title} — {selectedProblemIds.length} selected
                  </p>
                </div>

                {approvedProblems.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem 0' }}>
                    No approved problems yet. Create problems first.
                  </div>
                ) : (
                  <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                    {(['Physics', 'Chemistry', 'Mathematics'] as const).map(subject => {
                      const subjectProblems = approvedProblems.filter(p => p.subject === subject);
                      if (subjectProblems.length === 0) return null;
                      return (
                        <div key={subject} style={{ marginBottom: '1.5rem' }}>
                          <span className="section-label" style={{ marginBottom: '0.75rem' }}>{subject}</span>
                          {subjectProblems.map(p => {
                            const selected = selectedProblemIds.includes(p._id);
                            return (
                              <div key={p._id}
                                onClick={() => toggleProblem(p._id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                                  padding: '0.75rem', marginBottom: '0.4rem', cursor: 'pointer',
                                  border: `1px solid ${selected ? 'var(--c-ink)' : 'var(--c-border)'}`,
                                  background: selected ? 'rgba(57,255,20,0.08)' : '#fff',
                                  transition: 'all 0.15s',
                                }}
                              >
                                <div style={{
                                  width: 20, height: 20, border: `2px solid ${selected ? 'var(--c-ink)' : 'var(--c-border)'}`,
                                  background: selected ? 'var(--c-ink)' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  {selected && <span style={{ color: 'var(--c-accent)', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.title}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--c-ink-soft)', marginTop: '2px' }}>
                                    {p.difficulty} • +{p.marks}/−{p.negativeMarks}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-primary" onClick={saveTestProblems} style={{ flex: 1 }}>
                    Save {selectedProblemIds.length} Questions
                  </button>
                  <button className="btn" onClick={() => setManagingTest(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Problems ── */}
      {tab === 'problems' && (
        <div>
          {problems.length === 0 ? (
            <div className="empty-state">No problems yet. Create one from the + New Problem tab.</div>
          ) : (
            <table className="table-container">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Difficulty</th>
                  <th>By</th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {problems.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 500, maxWidth: 250 }}>{p.title}</td>
                    <td style={{ fontSize: '0.85rem' }}>{p.subject}</td>
                    <td style={{ fontSize: '0.85rem' }}>{p.difficulty}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--c-ink-soft)' }}>
                      {typeof p.author === 'object' ? p.author.name : 'Unknown'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--c-ink-soft)' }}>
                      {p.tags?.join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Create Test ── */}
      {tab === 'create-test' && (
        <form onSubmit={handleCreateTest} style={{ maxWidth: '620px' }}>
          <span className="section-label">Create New Test</span>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" required value={testForm.title}
              onChange={e => setTestForm({ ...testForm, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={testForm.description}
              onChange={e => setTestForm({ ...testForm, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-input" value={testForm.type}
              onChange={e => setTestForm({ ...testForm, type: e.target.value })}>
              {['JEE_MAINS', 'JEE_ADVANCED', 'TOPIC_TEST', 'FULL_LENGTH'].map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { label: 'Start Time *', key: 'startTime', type: 'datetime-local' },
              { label: 'End Time *', key: 'endTime', type: 'datetime-local' },
              { label: 'Registration Deadline *', key: 'registrationDeadline', type: 'datetime-local' },
              { label: 'Duration (minutes) *', key: 'duration', type: 'number' },
              { label: 'Entry Fee ₹ (0 = free)', key: 'fee', type: 'number' },
              { label: 'Max Participants', key: 'maxParticipants', type: 'number' },
            ].map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label">{f.label}</label>
                <input className="form-input" type={f.type} required={f.label.includes('*')}
                  value={(testForm as any)[f.key]}
                  onChange={e => setTestForm({ ...testForm, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--c-ink-soft)', marginBottom: '1.5rem' }}>
            After creating the test, go to the <strong>Tests</strong> tab and click <strong>"Manage Qs"</strong> to add questions.
          </p>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px' }}>
            Create Test
          </button>
        </form>
      )}

      {/* ── Create Problem ── */}
      {tab === 'create-problem' && (
        <form onSubmit={handleCreateProblem} style={{ maxWidth: '700px' }}>
          <span className="section-label">Create Problem</span>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" required value={problemForm.title}
              onChange={e => setProblemForm({ ...problemForm, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Question Content * (plain text or HTML)</label>
            <textarea className="form-input" required rows={4} value={problemForm.content}
              onChange={e => setProblemForm({ ...problemForm, content: e.target.value })}
              placeholder="A particle of mass m is projected..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <select className="form-input" value={problemForm.subject}
                onChange={e => setProblemForm({ ...problemForm, subject: e.target.value })}>
                {['Physics', 'Chemistry', 'Mathematics'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="form-input" value={problemForm.difficulty}
                onChange={e => setProblemForm({ ...problemForm, difficulty: e.target.value })}>
                {['Easy', 'Medium', 'Hard'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <span className="section-label">Answer Options *</span>
          {problemForm.options.map((opt, i) => (
            <div key={opt.label} className="form-group">
              <label className="form-label">Option {opt.label}</label>
              <input className="form-input" required value={opt.text}
                onChange={e => {
                  const opts = [...problemForm.options];
                  opts[i] = { ...opts[i], text: e.target.value };
                  setProblemForm({ ...problemForm, options: opts });
                }} />
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Correct Option *</label>
              <select className="form-input" value={problemForm.correctOption}
                onChange={e => setProblemForm({ ...problemForm, correctOption: e.target.value })}>
                {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Marks for Correct</label>
              <input className="form-input" type="number" value={problemForm.marks}
                onChange={e => setProblemForm({ ...problemForm, marks: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Negative Marks</label>
              <input className="form-input" type="number" value={problemForm.negativeMarks}
                onChange={e => setProblemForm({ ...problemForm, negativeMarks: Number(e.target.value) })} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Explanation / Solution</label>
            <textarea className="form-input" rows={3} value={problemForm.explanation}
              onChange={e => setProblemForm({ ...problemForm, explanation: e.target.value })}
              placeholder="Step-by-step solution..." />
          </div>
          <div className="form-group">
            <label className="form-label">Tags (comma-separated)</label>
            <input className="form-input" value={problemForm.tags}
              onChange={e => setProblemForm({ ...problemForm, tags: e.target.value })}
              placeholder="kinematics, projectile, mechanics" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px' }}>
            Create Problem
          </button>
        </form>
      )}

      {/* ── Post Discussion ── */}
      {tab === 'post-discussion' && (
        <form onSubmit={handlePostDiscussion} style={{ maxWidth: '700px' }}>
          <span className="section-label">Post Discussion / Editorial</span>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" required value={discussionForm.title}
              onChange={e => setDiscussionForm({ ...discussionForm, title: e.target.value })}
              placeholder="e.g. JEE Mains Mock #3 — Full Editorial" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input" value={discussionForm.type}
                onChange={e => setDiscussionForm({ ...discussionForm, type: e.target.value })}>
                <option value="editorial">Editorial</option>
                <option value="announcement">Announcement</option>
                <option value="general">General</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Link to Test (optional)</label>
              <select className="form-input" value={discussionForm.test}
                onChange={e => setDiscussionForm({ ...discussionForm, test: e.target.value })}>
                <option value="">— No test —</option>
                {completedTests.map(t => (
                  <option key={t._id} value={t._id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Content * (plain text or HTML)</label>
            <textarea className="form-input" required rows={12} value={discussionForm.content}
              onChange={e => setDiscussionForm({ ...discussionForm, content: e.target.value })}
              placeholder="Write the editorial, solution approach, or announcement here..." />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="checkbox" id="pinned" checked={discussionForm.pinned}
              onChange={e => setDiscussionForm({ ...discussionForm, pinned: e.target.checked })} />
            <label htmlFor="pinned" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>Pin this post (shows at top)</label>
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px' }}>
            Post Discussion
          </button>
        </form>
      )}

      {/* ── Users (super_admin only) ── */}
      {tab === 'users' && (
        <div>
          <p style={{ color: 'var(--c-ink-soft)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Manage user roles. Promote trusted members to admin to co-organize tests.
          </p>
          {users.length === 0 ? (
            <div className="empty-state">No users found.</div>
          ) : (
            <table className="table-container">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Joined</th>
                  <th>Change Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u._id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {u.picture && <img src={u.picture} alt={u.name} style={{ width: 24, height: 24, borderRadius: '50%' }} />}
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--c-ink-soft)' }}>{u.email}</td>
                    <td>
                      <span className={`status-badge status-${u.role === 'super_admin' ? 'live' : u.role === 'admin' ? 'verified' : 'free'}`}
                        style={{ textTransform: 'capitalize' }}>
                        {u.role === 'super_admin' ? 'Owner' : u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--c-ink-soft)' }}>
                      {new Date(u.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      {u._id !== user?._id ? (
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u._id, e.target.value)}
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
                        >
                          <option value="student">Student</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Owner</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--c-ink-soft)' }}>You</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
};

export default AdminPanel;
