import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal component rendered via React Portal at document.body level.
 * This ensures it always covers the entire viewport — including sidebar and navbar.
 * 
 * Usage:
 *   <Modal title="Editar Disputa" onClose={() => setShowModal(false)}>
 *     <form>...</form>
 *   </Modal>
 */
export const Modal = ({ title, onClose, children, maxWidth = '600px' }) => {
  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const overlay = (
    <div
      className="modal-portal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-portal-box"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '28px 32px 20px',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#1e3a5f',
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.color = '#1e293b'}
            onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 32px 32px' }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .modal-portal-overlay {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 10vh 10vw;
        }
        .modal-portal-box {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.2);
          border: 1px solid #e2e8f0;
          width: 100%;
          height: 100%;
          max-height: 80vh;
          overflow-y: auto;
          overflow-x: hidden;
          animation: modalFadeIn 0.2s ease-out;
          display: flex;
          flex-direction: column;
        }
        .modal-portal-box > div:last-of-type {
          flex: 1;
          overflow-y: auto;
        }
        @media (max-width: 768px) {
          .modal-portal-overlay {
            padding: 0;
            align-items: flex-end;
          }
          .modal-portal-box {
            border-radius: 20px 20px 0 0;
            max-height: 92vh;
            height: auto;
            animation: modalSlideUp 0.25s ease-out;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(overlay, document.body);
};
