import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Premium Modal dialog — Portal-based, fully responsive.
 * On mobile: slides up from bottom (sheet-style).
 * On desktop: centered, scale-in animation.
 */
export default function Modal({ open, onClose, title, children, size = 'md', hideClose = false }) {
  const dialogRef = useRef(null);

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizeStyles = {
    sm:  'w-full max-w-sm',
    md:  'w-full max-w-lg',
    lg:  'w-full max-w-2xl',
    xl:  'w-full max-w-3xl',
    '2xl': 'w-full max-w-5xl',
  };

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(15,23,42,0.65)',
        backdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.2s ease',
        /* On mobile: flex-end to slide up; on larger: center */
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
        overflowY: 'hidden',
      }}
      className="sm:!items-center sm:!p-4"
    >
      <div
        ref={dialogRef}
        className={`
          relative z-10 flex flex-col
          bg-white
          w-full
          sm:rounded-2xl sm:border sm:border-slate-200/80
          rounded-t-2xl
          overflow-hidden
          ${sizeStyles[size]}
        `}
        style={{
          maxHeight: '92svh',
          boxShadow: '0 24px 64px rgba(15,23,42,0.18), 0 8px 24px rgba(15,23,42,0.08)',
          animation: 'scaleIn 0.22s ease',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 sticky top-0 z-20 flex-shrink-0"
          style={{ background: 'var(--color-bg-subtle)' }}
        >
          {/* Mobile drag handle */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />

          <h2
            id="modal-title"
            className="text-[0.9375rem] font-bold text-[var(--color-text)] tracking-tight pr-2"
          >
            {title}
          </h2>
          {!hideClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-transparent border-none text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={17} />
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <div
          className="flex-1 overflow-y-auto bg-white text-slate-900 p-4 sm:p-6"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}

/** Premium Confirm dialog */
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger', loading = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-slate-600 leading-relaxed mb-6">{message}</p>
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <button
          onClick={onClose}
          className="btn btn-secondary btn-sm"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`btn btn-sm ${variant === 'danger' ? 'btn-danger' : 'btn-primary'} ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
