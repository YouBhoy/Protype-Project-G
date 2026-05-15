import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const studentLinks = [
    { to: '/student/dashboard', label: 'Dashboard' },
    { to: '/student/assessments', label: 'Assessments' },
    { to: '/student/analytics', label: 'Analytics' },
    { to: '/student/appointments', label: 'Appointments' }
  ];

  const facilitatorLinks = [
    { to: '/facilitator/dashboard', label: 'Dashboard' },
    { to: '/facilitator/appointments', label: 'Appointments' }
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
          <span className="brand-mark">S</span>
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
          <NavLink to="/resources" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
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
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}