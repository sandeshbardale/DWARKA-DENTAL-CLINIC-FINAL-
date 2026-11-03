import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { closeMobileSidebar } from '../app/store';
import Sidebar from '../components/common/Sidebar/Sidebar';
import Header from '../components/common/Header';
import ToastContainer from '../components/ui/Toast';

/**
 * Main dashboard layout shell — sidebar + header + content area.
 * Premium layout with subtle gradient background and proper scroll handling.
 */
export default function DashboardLayout() {
  const dispatch = useDispatch();
  const { sidebarCollapsed, sidebarMobileOpen } = useSelector(state => state.ui);

  // Matches CSS sidebar widths: 260px expanded, 68px collapsed
  const sidebarWidth = sidebarCollapsed ? 68 : 260;

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Mobile sidebar backdrop */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => dispatch(closeMobileSidebar())}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — fixed, always locked in place */}
      <Sidebar />

      {/* Main content — pushed right by sidebar width on desktop, full-width on mobile */}
      <div
        className="main-content-area flex flex-col min-h-screen transition-all duration-300 overflow-x-hidden"
        style={{ '--sidebar-offset': `${sidebarWidth}px` }}
      >
        <Header />
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden animate-fade-in"
          style={{ padding: 'clamp(12px, 3vw, 24px) clamp(14px, 3.5vw, 28px)' }}
        >
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
