import React from 'react';

interface ModalProps {
  title: string | React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  size?: 'default' | 'large' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ title, children, onClose, footer, size = 'default' }) => {
  const modalClass = size === 'large' ? 'modal modal-large' : size === 'xl' ? 'modal modal-xl' : 'modal';
  
  return (
    <div className="modal-overlay">
      <div className={modalClass} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {typeof title === 'string' ? <h2>{title}</h2> : title}
          </div>
          <button className="icon-btn modal-close" onClick={onClose} aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
