import { useState } from 'react';
import { Bell, Menu, Search, X, ChevronRight } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { toggleMobileSidebar } from '../../app/store';
import { useNotifications } from '../../hooks/useNotifications';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import NotificationPanel from './NotificationPanel';
import { useLocation } from 'react-router-dom';

/** Derives a page title from the current route path. */
function usePageTitle() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2) return 'Dashboard';
  if (segments.includes('patients') && segments.length >= 3) return 'Patient Profile';
  const last = segments[segments.length - 1];
  return last.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Breadcrumb segments from path */
function useBreadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return [];
  return segments.slice(1).map(s => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
}

export default function Header() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pageTitle = usePageTitle();
  const breadcrumbs = useBreadcrumb();

  function handleClearSearch() {
    setSearchQuery('');
    setSearchOpen(false);
  }

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-2 sm:gap-3 px-3 sm:px-5"
      style={{
        height: '52px',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
        minWidth: 0,
      }}
    >
      {/* Mobile menu toggle */}
      <button
        onClick={() => dispatch(toggleMobileSidebar())}
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer flex-shrink-0"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div
          className="sm:hidden absolute inset-0 z-30 flex items-center px-3 gap-2"
          style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(12px)' }}
        >
          <Search size={15} className="text-[var(--color-text-subtle)] flex-shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search patients, doctors…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]"
          />
          <button
            onClick={handleClearSearch}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors flex-shrink-0"
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page title + breadcrumb */}
      <div className="hidden sm:flex flex-col justify-center min-w-0 flex-1">
        {breadcrumbs.length > 1 ? (
          <div className="flex items-center gap-1 text-xs text-[var(--color-text-subtle)] mb-0.5 truncate">
            {breadcrumbs.slice(0, -1).map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={10} />}
                <span className="truncate max-w-[80px]">{b}</span>
              </span>
            ))}
            <ChevronRight size={10} />
          </div>
        ) : null}
        <h1 className="text-[15px] font-bold text-[var(--color-text)] leading-tight tracking-tight truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Mobile: page title (compact) */}
      <div className="sm:hidden flex-1 min-w-0">
        <h1 className="text-[14px] font-bold text-[var(--color-text)] leading-tight truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Desktop Search Bar */}
      <div
        className="hidden sm:flex items-center gap-2.5 px-3.5 h-9 rounded-xl transition-all"
        style={{
          background: 'var(--color-bg-subtle)',
          border: '1.5px solid var(--color-border)',
          minWidth: '180px',
          maxWidth: '280px',
          boxShadow: 'var(--shadow-xs)',
          flexShrink: 1,
        }}
        onFocus={e => {
          e.currentTarget.style.background = '#fff';
          e.currentTarget.style.borderColor = 'var(--color-primary-400)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
        }}
        onBlur={e => {
          e.currentTarget.style.background = 'var(--color-bg-subtle)';
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
        }}
      >
        <Search size={14} className="text-[var(--color-text-subtle)] flex-shrink-0" />
        <input
          type="text"
          placeholder="Search patients, doctors…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-[13px] w-full text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] font-medium"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="w-4 h-4 flex items-center justify-center rounded-full bg-slate-300 hover:bg-slate-400 transition-colors cursor-pointer flex-shrink-0"
            title="Clear search"
          >
            <X size={9} className="text-slate-600" />
          </button>
        )}
      </div>

      {/* Mobile search icon */}
      <button
        onClick={() => setSearchOpen(true)}
        className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors flex-shrink-0"
        aria-label="Search"
      >
        <Search size={16} />
      </button>

      {/* Notification Bell */}
      <div className="relative flex-shrink-0">
        <button
          id="notifications-toggle"
          onClick={() => setNotifOpen(v => !v)}
          className="btn btn-ghost btn-sm relative w-8 h-8 rounded-lg flex-shrink-0"
          style={{ border: '1.5px solid var(--color-border)' }}
          aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
          aria-expanded={notifOpen}
          aria-controls="notifications-panel"
        >
          <Bell size={15} />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-white text-[9px] font-bold rounded-full"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                boxShadow: '0 1px 4px rgba(239,68,68,0.5)',
                minWidth: '16px',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <NotificationPanel onClose={() => setNotifOpen(false)} />
        )}
      </div>

      {/* User section */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 pl-2 border-l border-[var(--color-border)] flex-shrink-0">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[13px] font-semibold text-[var(--color-text)] leading-tight whitespace-nowrap">
            {user?.name?.split(' ')[0] || 'User'}
          </span>
          <span className="text-[10px] text-[var(--color-text-subtle)] capitalize">{user?.role || 'Staff'}</span>
        </div>
        <Avatar name={user?.name || ''} size="sm" />
      </div>
    </header>
  );
}
