"use client";

import React from 'react';
import './Sidebar.css'; // Import the CSS file for styling

const Sidebar = () => {
  return (
    <nav className="sidebar">
      {/* Top Section */}
      <ul className="sidebar-section top-section">
        <li className="nav-item"><a href="/main">Packaging Dashboard</a></li>
        <li className="nav-item"><a href="/main/dashboardlam">Lamination Dashboard</a></li>
        <li className="nav-item"><a href="/main/dashboardyarn">Yarn Dashboard</a></li>

              <hr className="sidebar-separator" />

        <li className="nav-item"><a href="/main/searchpackaging">Search (Packaging)</a></li>
        <li className="nav-item"><a href="/main/searchlamination">Search (Lamination)</a></li>
        <li className="nav-item"><a href="/main/searchyarn">Search (Yarn)</a></li>
      </ul>

      {/* Separator */}
      <hr className="sidebar-separator" />

      {/* Main Section */}
      <ul className="sidebar-section main-section">
        <li className="nav-item"><a href="/main/packaging">Packaging</a></li>
        <li className='nav-item'><a href='/main/lamination'>Industrial Lamination</a></li>
        <li className='nav-item'><a href='/main/yarn'>Yarn</a></li>
      </ul>

      {/* Bottom Section (Pushed to the bottom) */}
      <ul className="sidebar-section bottom-section">
        <li className="nav-item register"><a href="/main/register">Register (Admin)</a></li>
        <li className="nav-item signin"><a href="/auth/signin">Sign Out</a></li>
      </ul>
    </nav>
  );
};

export default Sidebar;