import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Gavel, FolderOpen, PieChart, CreditCard, Settings, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const LOGO_URL = 'https://kxvminodzhcsdwrmucdj.supabase.co/storage/v1/object/public/Verto%20imagens/logo-verto.jpeg';

export const Sidebar = ({ open, onClose }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isFinance = user?.role === 'finance';

  return (
    <>
      <aside className={`sidebar glass-panel ${open ? 'sidebar--open' : ''}`}>
        {/* Close button on mobile */}
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Fechar menu">
          <X size={20} />
        </button>

        <div className="logo-area">
          <img
            src={LOGO_URL}
            alt="Verto Logo"
            style={{ maxHeight: '56px', maxWidth: '180px', objectFit: 'contain' }}
            onError={e => { e.target.onerror = null; e.target.src = '/logo.png'; }}
          />
        </div>

        <nav className="nav-links" onClick={onClose}>
          <NavLink to="/" end className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20}/> Dashboard
          </NavLink>
          <NavLink to="/clients" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <Users size={20}/> Clientes
          </NavLink>
          <NavLink to="/bids" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <FileText size={20}/> Editais
          </NavLink>
          <NavLink to="/disputes" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <Gavel size={20}/> Disputas
          </NavLink>
          <NavLink to="/contracts" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <FolderOpen size={20}/> Contratos
          </NavLink>

          {(isAdmin || isFinance) && (
            <>
              <div className="nav-divider"></div>
              <span className="nav-section-title">FINANCEIRO</span>
              <NavLink to="/cash-flow" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <PieChart size={20}/> Fluxo de Caixa
              </NavLink>
              <NavLink to="/client-payments" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <CreditCard size={20}/> Pagamentos Clientes
              </NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <div className="nav-divider"></div>
              <span className="nav-section-title">ADMIN</span>
              <NavLink to="/settings" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
                <Settings size={20}/> Gestão de Usuários
              </NavLink>
            </>
          )}
        </nav>
      </aside>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: calc(100vh - 40px);
          position: fixed;
          top: 20px;
          left: 20px;
          display: flex;
          flex-direction: column;
          border-radius: 20px;
          z-index: 250;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .sidebar-close-btn {
          display: none;
          position: absolute;
          top: 12px;
          right: 12px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          color: #64748b;
          flex-shrink: 0;
        }
        .logo-area {
          display: flex;
          justify-content: center;
          padding: 28px 20px 16px;
        }
        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 0 16px 20px;
          overflow-y: auto;
          flex: 1;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          color: var(--text-muted);
          text-decoration: none;
          border-radius: 10px;
          transition: all 0.25s ease;
          font-weight: 500;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .nav-link:hover {
          color: var(--text-main);
          background: rgba(33,60,122,0.05);
        }
        .nav-link.active {
          background: linear-gradient(90deg, rgba(33,60,122,0.12) 0%, transparent 100%);
          color: var(--primary);
          border-left: 3px solid var(--primary);
        }
        .nav-divider {
          height: 1px;
          background: var(--surface-border);
          margin: 12px 0;
        }
        .nav-section-title {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-bottom: 4px;
          padding-left: 14px;
          letter-spacing: 1px;
          font-weight: 600;
        }

        /* ─── Tablet ─── */
        @media (max-width: 1024px) {
          .sidebar {
            top: 16px;
            left: 16px;
            height: calc(100vh - 32px);
          }
        }

        /* ─── Mobile ─── */
        @media (max-width: 768px) {
          .sidebar {
            top: 0;
            left: 0;
            height: 100vh;
            border-radius: 0 16px 16px 0;
            width: 280px !important;
            transform: translateX(-100%);
            box-shadow: 4px 0 30px rgba(0,0,0,0.15);
          }
          .sidebar--open {
            transform: translateX(0);
          }
          .sidebar-close-btn {
            display: flex;
          }
          .logo-area {
            padding-top: 52px;
          }
        }
      `}</style>
    </>
  );
};
