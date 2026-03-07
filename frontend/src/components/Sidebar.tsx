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
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🏠</span>
            <span>Home</span>
          </NavLink>
        </div>
        <div className="nav-item">
          <NavLink to="/upcoming" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">📅</span>
            <span>Upcoming</span>
          </NavLink>
        </div>
        <div className="nav-item">
          <NavLink to="/past" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">📋</span>
            <span>Past</span>
          </NavLink>
        </div>
        <div className="nav-item">
          <NavLink to="/leaderboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🏆</span>
            <span>Ranks</span>
          </NavLink>
        </div>

        <span className="section-label" style={{ marginTop: '2rem' }}>Account</span>
        <div className="nav-item">
          <NavLink to="/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">👤</span>
            <span>Profile</span>
          </NavLink>
        </div>
        {(user?.role === 'admin' || user?.role === 'contributor') && (
          <div className="nav-item">
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span className="nav-icon">⚙️</span>
              <span>{user.role === 'admin' ? 'Admin' : 'Submit'}</span>
            </NavLink>
          </div>
        )}
        <div className="nav-item">
          <button onClick={handleLogout} className="nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            <span className="nav-icon">🚪</span>
            <span>Sign Out</span>
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
