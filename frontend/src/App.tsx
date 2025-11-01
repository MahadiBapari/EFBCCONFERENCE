
import React, { useState, useEffect } from 'react';
import { MOCK_REGISTRATIONS, MOCK_GROUPS } from './data/mockData';
import { LoginPage } from './pages/authentication/login';
import { RegistrationPage } from './pages/authentication/registration';
import ResetPasswordPage from './pages/authentication/resetPassword';
import { Sidebar } from './components/Sidebar';
import { UserDashboard } from './pages/user/userDashboard';
import { UserEvents } from './pages/user/userEvents';
import { UserProfile } from './pages/user/userProfile';
import { AdminEvents } from './pages/admin/adminEvents';
import { AdminAttendees } from './pages/admin/adminAttendees';
import { AdminGroups } from './pages/admin/adminGroups';
import { EventDetailsPage } from './pages/admin/eventsDetails';
import { Event, Registration, Group, User, RegisterForm } from './types';
import apiClient, { authApi } from './services/apiClient';

const AdminSecurity: React.FC = () => {
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword,   setNewPassword]   = React.useState('');
  const [confirm,       setConfirm]       = React.useState('');
  const [loading,       setLoading]       = React.useState(false);
  const [msg,           setMsg]           = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!newPassword || newPassword !== confirm) {
      setMsg('New password and confirmation must match');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setMsg('Password updated successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
    } catch (e: any) {
      setMsg(e?.response?.data?.error || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <div className="container">
      <div className="page-header"><h1>Security</h1></div>
      <div className="card" style={{ padding: '1rem', maxWidth: 520 }}>
        <h3>Change Password</h3>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="cur">Current Password</label>
            <input id="cur" type="password" className="form-control" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="npw">New Password</label>
            <input id="npw" type="password" className="form-control" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="cnf">Confirm New Password</label>
            <input id="cnf" type="password" className="form-control" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
          </div>
          {msg && <div style={{ margin: '0.5rem 0' }}>{msg}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [view, setView] = useState<string>('');
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>(MOCK_REGISTRATIONS);
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);
  const [viewingEventId, setViewingEventId] = useState<number | null>(null);
  const [user, setUser] = useState<User>({ id: 999, name: "Current User", email: "current.user@example.com" });
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    document.body.className = `${theme}-theme`;
  }, [theme]);

  // Loader shared so pages can trigger refresh after CRUD
  const loadEventsFromApi = async () => {
    try {
      const response = await apiClient.get<Event[]>(`/events`);
      const apiEvents = (response as any).data || [];
      const normalized: Event[] = apiEvents.map((e: any) => ({
        id: e.id,
        year: new Date(e.date).getFullYear(),
        name: e.name,
        date: e.date,
        eventId: e.id,
        activities: Array.isArray(e.activities)
          ? e.activities
          : (typeof e.activities === 'string' && e.activities.trim().startsWith('[')
              ? JSON.parse(e.activities)
              : []),
        location: e.location,
        description: e.description,
      }));
      setEvents(normalized);
    } catch (err) {
      console.error('Failed to load events from API:', err);
    }
  };

// Load once on mount
useEffect(() => {
  loadEventsFromApi();
  loadRegistrationsFromApi();
  // Restore session via token
  const restore = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await authApi.me();
      const me = (res as any).data || {};
      if (me.role) {
        setRole(me.role);
        setUser({ id: me.id || 999, name: me.name || 'Current User', email: me.email || 'current.user@example.com', role: me.role });
        setView(me.role === 'admin' ? 'events' : 'dashboard');
      }
    } catch (e) {
      localStorage.removeItem('token');
    }
  };
  restore();
}, []);

  // Load registrations from backend (persistence)
  const loadRegistrationsFromApi = async () => {
    try {
      const response = await apiClient.get<Registration[]>(`/registrations`);
      const apiRegs = (response as any).data || [];
      const normalized: Registration[] = apiRegs.map((r: any) => ({
        // Required
        id: r.id,
        userId: r.userId ?? r.user_id ?? 0,
        eventId: r.eventId ?? r.event_id ?? r.event ?? 0,
        // Personal
        firstName: r.firstName ?? r.first_name ?? '',
        lastName: r.lastName ?? r.last_name ?? '',
        badgeName: r.badgeName ?? r.badge_name ?? `${r.firstName || ''}`.trim(),
        email: r.email ?? '',
        secondaryEmail: r.secondaryEmail ?? '',
        organization: r.organization ?? '',
        jobTitle: r.jobTitle ?? '',
        address: r.address ?? '',
        mobile: r.mobile ?? '',
        officePhone: r.officePhone ?? '',
        isFirstTimeAttending: r.isFirstTimeAttending ?? true,
        companyType: r.companyType ?? '',
        companyTypeOther: r.companyTypeOther ?? '',
        emergencyContactName: r.emergencyContactName ?? '',
        emergencyContactPhone: r.emergencyContactPhone ?? '',
        // Conference
        wednesdayActivity: r.wednesdayActivity ?? r.category ?? 'None',
        golfHandicap: r.golfHandicap ?? '',
        golfClubPreference: r.golfClubPreference ?? 'Own Clubs',
        massageTimeSlot: r.massageTimeSlot ?? '8:00 AM- 10:00 AM',
        // Meals
        wednesdayReception: r.wednesdayReception ?? 'I will attend',
        thursdayBreakfast: r.thursdayBreakfast ?? 'I will attend',
        thursdayLuncheon: r.thursdayLuncheon ?? 'I will attend',
        thursdayDinner: r.thursdayDinner ?? 'I will attend',
        fridayBreakfast: r.fridayBreakfast ?? 'I will attend',
        dietaryRestrictions: r.dietaryRestrictions ?? '',
        // Spouse
        spouseDinnerTicket: !!(r.spouseDinnerTicket ?? false),
        spouseFirstName: r.spouseFirstName ?? '',
        spouseLastName: r.spouseLastName ?? '',
        // Payment
        totalPrice: Number(r.totalPrice ?? 675),
        paymentMethod: r.paymentMethod ?? 'Card',
        // Legacy
        name: r.name ?? `${r.firstName || ''} ${r.lastName || ''}`.trim(),
        category: r.category ?? (r.wednesdayActivity ?? 'Networking'),
      }));
      setRegistrations(normalized);
    } catch (err) {
      console.error('Failed to load registrations from API:', err);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = async (selectedRole: 'admin' | 'user') => {
    try {
      const res = await authApi.me();
      const me = (res as any).data || {};
      if (me && (me.id || me.email)) {
        setUser({ id: me.id || 0, name: me.name || 'Current User', email: me.email || '', role: me.role || selectedRole });
        setRole((me.role as any) || selectedRole);
      } else {
        setRole(selectedRole);
      }
    } catch {
      setRole(selectedRole);
    }
    // Ensure we load fresh data right after login
    await loadEventsFromApi();
    await loadRegistrationsFromApi();
    setView(selectedRole === 'admin' ? 'events' : 'dashboard');
  };

const handleLogout = () => {
    setRole(null);
    setView('');
    setShowRegistration(false);
  localStorage.removeItem('token');
  };

  const handleRegister = async (formData: RegisterForm) => {
    try {
      // Registration page already stored token after calling /users/register + login
      const res = await authApi.me();
      const payload: any = (res as any).data || res;
      const me = payload?.data || payload;
      const newUser: User = {
        id: me.id,
        name: me.name || formData.name,
        email: me.email || formData.email,
        role: me.role || 'user'
      };
      setUser(newUser);
      setRole(newUser.role as any);
      setView('dashboard');
      setShowRegistration(false);
      alert(`Welcome to EFBC Conference Portal, ${newUser.name}! Your account has been created successfully.`);
    } catch {
      // Fallback if /auth/me not available yet; still proceed with minimal state
      setUser({ id: 0, name: formData.name, email: formData.email, role: 'user' });
      setRole('user');
      setView('dashboard');
      setShowRegistration(false);
      alert(`Welcome to EFBC Conference Portal, ${formData.name}! Your account has been created successfully.`);
    }
  };

  const handleBackToLogin = () => {
    setShowRegistration(false);
  };

  const handleShowRegistration = () => {
    setShowRegistration(true);
  };
  
  const handleSaveRegistration = (regData: Registration, currentUserId?: number) => {
    const registrationId = regData.id || Date.now();
    const userId = regData.userId || currentUserId || user.id;

    const finalRegistration: Registration = { ...regData, id: registrationId, userId };

    // Persist to backend and then refresh list.
    const save = async () => {
      try {
        // Do not send timestamps on write
        const { createdAt, updatedAt, ...payload } = finalRegistration as any;
        if (regData.id) {
          await apiClient.put(`/registrations/${registrationId}`, payload);
        } else {
          await apiClient.post(`/registrations`, payload);
        }
      } catch (e) {
        console.error('Failed to save registration to API, falling back to local:', e);
        // Fallback local upsert if API fails
        setRegistrations(prev => {
          const exists = prev.some(r => r.id === registrationId);
          if (exists) return prev.map(r => (r.id === registrationId ? finalRegistration : r));
          return [...prev, finalRegistration];
        });
        return;
      }
      await loadRegistrationsFromApi();
    };
    save();
  };

  const handleCancelRegistration = (regId: number) => {
    if (window.confirm("Are you sure you want to cancel your registration for this event?")) {
      setRegistrations(regs => regs.filter(r => r.id !== regId));
      setGroups(grps => grps.map(g => ({
        ...g,
        members: g.members.filter(m => m !== regId)
      })));
    }
  };

  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    try {
      const res = await authApi.updateProfile({
        name: updatedData.name || user.name,
        email: updatedData.email || user.email
      });
      const payload: any = (res as any).data || {};
      const newUser = payload.user || payload;
      const newToken = payload.token;
      if (newToken) localStorage.setItem('token', newToken);
      if (newUser) setUser(prev => ({ ...prev, ...newUser }));

      setRegistrations(regs => regs.map(r => {
        if (r.userId === user.id) {
          return { ...r, name: newUser?.name || updatedData.name || r.name, email: newUser?.email || updatedData.email || r.email };
        }
        return r;
      }));
      alert('Profile updated successfully!');
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleDeleteEvent = (eventId: number) => {
    if (window.confirm("Are you sure you want to delete this event? This will also remove all associated registrations and groups.")) {
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setRegistrations(prev => prev.filter(r => r.eventId !== eventId));
      setGroups(prev => prev.filter(g => g.eventId !== eventId));
    }
  };

  const handleDeleteGroup = (groupId: number) => {
    if (window.confirm("Are you sure you want to delete this group? All members will become unassigned.")) {
      setGroups(prev => prev.filter(g => g.id !== groupId));
    }
  };

  const handleCreateGroup = (groupData: Omit<Group, 'id'>) => {
    setGroups(prev => [...prev, { ...groupData, id: Date.now() }]);
  };
  
  const handleDeleteRegistrations = (regIds: number[]) => {
    setRegistrations(regs => regs.filter(r => !regIds.includes(r.id)));
    setGroups(grps => grps.map(g => ({
      ...g,
      members: g.members.filter(m => !regIds.includes(m))
    })));
  };

  const handleBulkAssignGroup = (regIds: number[], targetGroupId: number) => {
    const targetGroup = groups.find(g => g.id === targetGroupId);
    if (!targetGroup) return;

    const validRegsToMove = registrations
      .filter(r => regIds.includes(r.id) && r.category === targetGroup.category)
      .map(r => r.id);

    if (validRegsToMove.length === 0) {
      alert(`None of the selected attendees are in the "${targetGroup.category}" category.`);
      return;
    }

    setGroups(currentGroups => {
      const cleanedGroups = currentGroups.map(g => {
        if (g.id === targetGroupId) return g;
        return { ...g, members: g.members.filter(m => !validRegsToMove.includes(m)) };
      });

      return cleanedGroups.map(g => {
        if (g.id === targetGroupId) {
          const newMembers = [...g.members];
          validRegsToMove.forEach(memberId => {
            if (!newMembers.includes(memberId)) newMembers.push(memberId);
          });
          return { ...g, members: newMembers };
        }
        return g;
      });
    });
    
    alert(`Successfully assigned ${validRegsToMove.length} attendee(s) to "${targetGroup.name}".`);
  };

  const handleSetActiveView = (newView: string) => {
    setViewingEventId(null);
    setView(newView);
    setMobileSidebarOpen(false);
  };

  const renderView = () => {
    if (role === 'user') {
      switch(view) {
        case 'events':
          return <UserEvents
            events={events}
            registrations={registrations}
            handleSaveRegistration={(regData) => handleSaveRegistration(regData, user.id)}
            handleCancelRegistration={handleCancelRegistration}
            user={user}
          />;
        case 'profile':
          return <UserProfile user={user} onUpdateProfile={handleUpdateProfile} />;
        case 'dashboard':
        default:
          return <UserDashboard 
            events={events} 
            registrations={registrations} 
            handleSaveRegistration={(regData) => handleSaveRegistration(regData, user.id)}
            handleCancelRegistration={handleCancelRegistration}
            user={user} 
          />;
      }
    }
    if (role === 'admin') {
      if (view === 'events' && viewingEventId) {
        const event = events.find(e => e.id === viewingEventId);
        if (!event) {
          setViewingEventId(null);
          return null;
        }
        return <EventDetailsPage 
          event={event} 
          registrations={registrations}
          groups={groups}
          onBack={() => setViewingEventId(null)}
        />;
      }

      switch(view) {
        case 'events':
          return <AdminEvents 
            onViewEvent={setViewingEventId}
            onRefreshEvents={loadEventsFromApi}
          />;
        case 'security':
          return <AdminSecurity />;
        case 'attendees':
          return <AdminAttendees 
            registrations={registrations}
            events={events}
            groups={groups}
            handleSaveRegistration={handleSaveRegistration}
            handleDeleteRegistrations={handleDeleteRegistrations}
            handleBulkAssignGroup={handleBulkAssignGroup}
          />;
        case 'groups':
          return <AdminGroups 
            registrations={registrations} 
            groups={groups} 
            events={events}
            setGroups={setGroups} 
            handleDeleteGroup={handleDeleteGroup}
            handleCreateGroup={handleCreateGroup}
          />;
        default:
          return <AdminEvents 
            onViewEvent={setViewingEventId}
            onRefreshEvents={loadEventsFromApi}
          />;
      }
    }
    return null;
  };

  if (!role) {
    if (window.location.pathname === '/reset-password') {
      return <ResetPasswordPage />;
    }
    if (showRegistration) {
      return <RegistrationPage onRegister={handleRegister} onBackToLogin={handleBackToLogin} />;
    }
    return <LoginPage onLogin={handleLogin} onShowRegistration={handleShowRegistration} />;
  }

  return (
    <div className="app-layout">
      <Sidebar 
        role={role} 
        onLogout={handleLogout} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        activeView={view}
        setActiveView={handleSetActiveView}
        isMobileOpen={isMobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <main className="main-content">
        <header className="mobile-header no-print">
          <div className="logo">EFBC</div>
          <button className="icon-btn menu-toggle" onClick={() => setMobileSidebarOpen(true)} aria-label="Open menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </header>
        {renderView()}
      </main>
    </div>
  );
};

export default App;
