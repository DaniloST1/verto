import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Outlet } from 'react-router-dom';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close on route change or outside click
  useEffect(() => {
    const close = () => setSidebarOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  return (
    <div className="app-container">
      {/* Mobile overlay - clicking it closes the sidebar */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div className="page-content animate-fade-in">
          <Outlet />
        </div>
      </main>

      <style>{`
        .app-container {
          display: flex;
          min-height: 100vh;
          position: relative;
        }
        .main-content {
          flex: 1;
          margin-left: calc(var(--sidebar-width) + 40px);
          padding: 20px 20px 20px 0;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .page-content {
          flex: 1;
          min-width: 0;
        }
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.5);
          z-index: 200;
          backdrop-filter: blur(2px);
        }

        /* ─── Tablet (≤ 1024px) ─── */
        @media (max-width: 1024px) {
          :root { --sidebar-width: 220px; }
          .main-content {
            margin-left: calc(var(--sidebar-width) + 24px);
            padding: 16px 16px 16px 0;
          }
        }

        /* ─── Mobile (≤ 768px) ─── */
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0 !important;
            padding: 12px !important;
          }
          .sidebar-overlay {
            display: block;
          }
        }
      `}</style>
    </div>
  );
};
