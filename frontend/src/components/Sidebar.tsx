import React from 'react';
import '../styles/Sidebar.css';

// Define SVG Icons
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const CollectionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12L8 12M16 16L8 16M12 8L8 8M21 19.4a2 2 0 0 1-2 1.6H5a2 2 0 0 1-2-1.6V4.6A2 2 0 0 1 5 3h4.05a2 2 0 0 1 1.17.44L12 5h8a2 2 0 0 1 2 2z"></path>
  </svg>
);

const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const SupportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

interface SidebarProps {
  role: 'admin' | 'user';
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
  isMobileOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  role, 
  onLogout, 
  theme, 
  toggleTheme, 
  activeView, 
  setActiveView, 
  isMobileOpen, 
  onClose 
}) => {
  const adminNav = [
    { key: 'events', label: 'Events', icon: <CalendarIcon /> },
    { key: 'attendees', label: 'Attendees', icon: <UsersIcon /> },
    { key: 'groups', label: 'Groups', icon: <CollectionIcon /> },
    { key: 'cancellations', label: 'Cancellations', icon: <CollectionIcon /> },
    { key: 'allUsers', label: 'All Users', icon: <UsersIcon /> },
    { key: 'customization', label: 'Customization', icon: <CollectionIcon /> },
    { key: 'security', label: 'Security', icon: <UserIcon /> },
  ];
  
  const userNav = [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    //{ key: 'events', label: 'All Events', icon: <CalendarIcon /> },
    { key: 'profile', label: 'My Profile', icon: <UserIcon /> },
    { key: 'support', label: 'Support & Contact', icon: <SupportIcon /> },
  ];
  
  const navItems = role === 'admin' ? adminNav : userNav;

  return (
    <>
      {isMobileOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      <aside className={`sidebar ${isMobileOpen ? 'is-mobile-open' : ''}`}>
        <div>
          <div className="logo-container desktop-logo">
            <img src="/EFBClogo.png" alt="EFBC Conference" className="sidebar-logo" />
          </div>
          <div className="sidebar-header">
            <div className="logo-container">
              <img src="/EFBClogo.png" alt="EFBC Conference" className="sidebar-logo" />
            </div>
            <button className="icon-btn close-sidebar-btn" onClick={onClose} aria-label="Close menu">&times;</button>
          </div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button 
                key={item.key} 
                className={`nav-item ${activeView === item.key ? 'nav-item-active' : ''}`}
                onClick={() => setActiveView(item.key)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="user-info">
            Logged in as <strong>{role}</strong>
          </div>
          <div className="sidebar-actions">
            <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </aside>
    </>
  );
};
