import React from 'react';
import { Link, Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="public-shell">
      <header className="topbar">
        <Link to="/" className="brand-inline">
          <span className="brand-mark">S</span>
          <span>SPARTAN-G</span>
        </Link>
        <nav className="topnav">
          <Link to="/login">Login</Link>
          <Link to="/signup">Student Signup</Link>
          <Link to="/facilitator/signup">OGC Signup</Link>
          <Link to="/resources">Emergency Resources</Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}