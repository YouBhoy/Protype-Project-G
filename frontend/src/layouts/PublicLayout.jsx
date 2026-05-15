import React from 'react';
import { Link, Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="public-shell">
      <header className="public-navbar">
        <div className="public-navbar-brand">
          <img src="https://www.nutritionmasterclass.com.ph/sites/default/files/2023-03/Batangas%20State%20University.jpg" alt="BSU Seal" className="public-navbar-seal" />
          <div className="public-navbar-text">
            <h2>BATANGAS STATE UNIVERSITY</h2>
            <p>The National Engineering University</p>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}