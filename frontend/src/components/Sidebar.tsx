import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <NavLink to="/dashboard" className="brand">JEE Arena</NavLink>

      <nav className="nav-menu">
        <span className="section-label">Main</span>
        <div className="nav-item">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Dashboard
          </NavLink>
        </div>
        <div className="nav-item">
          <NavLink
            to="/upcoming"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Upcoming Exams
          </NavLink>
        </div>
        <div className="nav-item">
          <NavLink
            to="/past"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Past Competitions
          </NavLink>
        </div>
        <div className="nav-item">
          <NavLink
            to="/leaderboard"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Leaderboard
          </NavLink>
        </div>

        <span className="section-label" style={{ marginTop: '2rem' }}>Account</span>
        <div className="nav-item">
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Profile
          </NavLink>
        </div>
        {(user?.role === 'admin' || user?.role === 'contributor') && (
          <div className="nav-item">
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {user.role === 'admin' ? 'Admin Panel' : 'Submit Problem'}
            </NavLink>
          </div>
        )}
        <div className="nav-item">
          <button
            onClick={handleLogout}
            className="nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="user-profile">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {user?.picture && (
            <img src={user.picture} alt={user.name} style={{ width: 28, height: 28, borderRadius: '50%' }} />
          )}
          <div>
            <div style={{ fontSize: '0.75rem' }}>Logged in as</div>
            <div style={{ fontWeight: 600, color: 'var(--c-ink)', fontSize: '0.85rem' }}>
              {user?.name?.split(' ')[0] || 'Student'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
