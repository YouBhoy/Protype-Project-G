import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const resourcesPath = user?.role === 'ogc' ? '/facilitator/resources' : '/student/resources';

  const studentLinks = [
    { to: '/student/dashboard', label: 'Dashboard' },
    { to: '/student/assessments', label: 'Assessments' },
    { to: '/student/analytics', label: 'Analytics' },
    { to: '/student/appointments', label: 'Appointments' },
    { to: '/student/chat', label: 'Chat' }
  ];

  const facilitatorLinks = [
    { to: '/facilitator/dashboard', label: 'Dashboard' },
    { to: '/facilitator/appointments', label: 'Appointments' },
    { to: '/facilitator/chat', label: 'Chat' }
  ];

  const links = user?.role === 'ogc' ? facilitatorLinks : studentLinks;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand-block">
          <span className="brand-mark">B</span>
          <span>
            <strong>SPARTAN-G</strong>
            <small>Wellness monitoring</small>
          </span>
        </Link>

        <nav className="sidebar-nav">
          {links.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
          <NavLink to={resourcesPath} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            Emergency Resources
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div>
            <p className="muted">Signed in as</p>
            <strong>{user?.name || user?.email}</strong>
            <p className="muted">{user?.role === 'ogc' ? user.assignedCollege : user?.college}</p>
          </div>
          <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <header className="portal-header">
        <div className="portal-header-brand">
          <div className="portal-header-seal">B</div>
          <div className="portal-header-text">
            <h1>BATANGAS STATE UNIVERSITY</h1>
            <p>The National Engineering University</p>
          </div>
        </div>
        <div className="portal-header-logout">
          <span style={{ fontSize: '0.9rem' }}>{user?.name || user?.email}</span>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '8px 14px', fontSize: '0.9rem' }}>Logout</button>
        </div>
      </header>

      <main className="content">
        <div className="content-overlay">
          <Outlet />
        </div>
      </main>
    </div>
  );
}