import React, { useState, useEffect, useCallback } from 'react';
import { MOCK_REGISTRATIONS, MOCK_GROUPS } from './data/mockData';
import { LoginPage } from './pages/authentication/login';
import { RegistrationPage } from './pages/authentication/registration';
import ResetPasswordPage from './pages/authentication/resetPassword';
import { Sidebar } from './components/Sidebar';
import { Modal } from './components/Modal';
import { UserDashboard } from './pages/user/userDashboard';
import { UserEvents } from './pages/user/userEvents';
import { UserRegistration } from './pages/user/userRegistration';
import { UserProfile } from './pages/user/userProfile';
import { UserSupport } from './pages/user/userSupport';
import { AdminEvents } from './pages/admin/adminEvents';
import { AdminEventForm } from './pages/admin/adminEventForm';
import { AdminAttendees } from './pages/admin/adminAttendees';
import { AdminGroups } from './pages/admin/adminGroups';
import { AdminUsers } from './pages/admin/adminUsers';
import { AdminCustomization, EmailCustomization } from './pages/admin/adminCustomization';
import { EventDetailsPage } from './pages/admin/eventsDetails';
import { Event, Registration, Group, User, RegisterForm } from './types';
import apiClient, { authApi } from './services/apiClient';
import { cancelApi } from './services/apiClient';
import { AdminCancellations } from './pages/admin/adminCancellations';

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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [authInitializing, setAuthInitializing] = useState<boolean>(true);
  const [view, setView] = useState<string>('');
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>(MOCK_REGISTRATIONS);
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);
  const [viewingEventId, setViewingEventId] = useState<number | null>(null);
  const [user, setUser] = useState<User>({ id: 999, name: "Current User", email: "current.user@example.com" });
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationTargetEventId, setRegistrationTargetEventId] = useState<number | null>(null);
  const [adminEditingEvent, setAdminEditingEvent] = useState<Event | null>(null);
  const [adminEditingRegistrationId, setAdminEditingRegistrationId] = useState<number | null>(null);
  const [adminNewRegistrationUser, setAdminNewRegistrationUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [adminNewRegistrationEventId, setAdminNewRegistrationEventId] = useState<number | null>(null);
  const [pendingCancellationIds, setPendingCancellationIds] = useState<number[]>([]);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetRegId, setCancelTargetRegId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  const [cancellationPendingRows, setCancellationPendingRows] = useState<any[]>([]);
  const [cancellationApprovedRows, setCancellationApprovedRows] = useState<any[]>([]);
  const [cancellationsLoading, setCancellationsLoading] = useState<boolean>(false);
  const [emailCustomizationCache, setEmailCustomizationCache] = useState<EmailCustomization | null>(null);
  const [adminUsersCache, setAdminUsersCache] = useState<User[]>([]);
  const [adminUsersPaginationCache, setAdminUsersPaginationCache] = useState<any | null>(null);

  const handleAdminUsersCacheUpdate = useCallback(
    (users: User[], pagination: any | null) => {
      setAdminUsersCache(users);
      setAdminUsersPaginationCache(pagination);
    },
    []
  );

  useEffect(() => {
    document.body.className = `${theme}-theme`;
  }, [theme]);

  // Override default window.alert to use a centered modal
  useEffect(() => {
    const originalAlert = window.alert;
    (window as any).alert = (msg?: any) => {
      setAlertState({
        open: true,
        message: typeof msg === 'string' ? msg : String(msg),
      });
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  // Loader shared so pages can trigger refresh after CRUD
  const loadEventsFromApi = async () => {
    try {
      const response = await apiClient.get<Event[]>(`/events`);
      const apiEvents = (response as any).data || [];
      const parseArr = (v: any) => {
        if (Array.isArray(v)) return v;
        if (typeof v === 'string') {
          try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch { return []; }
        }
        return [];
      };
      const numOrUndef = (v: any) => {
        if (v === null || v === undefined || v === '') return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };
      const normalized: Event[] = apiEvents.map((e: any) => ({
        id: e.id,
        year: new Date(e.date || e.startDate || e.endDate).getFullYear(),
        name: e.name,
        date: e.date,
        startDate: e.startDate || undefined,
        endDate: e.endDate || e.date || undefined,
        eventId: e.id,
        activities: Array.isArray(e.activities)
          ? e.activities
          : (typeof e.activities === 'string' && e.activities.trim().startsWith('[')
              ? JSON.parse(e.activities)
              : []),
        location: e.location,
        description: e.description,
        // Normalize pricing fields (handle camelCase/snake_case and stringified JSON)
        registrationPricing: parseArr(e.registrationPricing ?? e.registration_pricing),
        spousePricing: parseArr(e.spousePricing ?? e.spouse_pricing),
        breakfastPrice: numOrUndef(e.breakfastPrice ?? e.breakfast_price),
        breakfastEndDate: (e.breakfastEndDate ?? e.breakfast_end_date) || undefined,
      }));
      setEvents(normalized);
    } catch (err) {
      console.error('Failed to load events from API:', err);
    }
  };

// Restore session and initial data once on mount
useEffect(() => {
  const init = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthInitializing(false);
      return;
    }

    try {
      const res = await authApi.me();
      const me = (res as any).data || {};
      if (me.role) {
        setRole(me.role);
        setUser({
          id: me.id || 999,
          name: me.name || 'Current User',
          email: me.email || 'current.user@example.com',
          role: me.role,
        });
        setView(me.role === 'admin' ? 'events' : 'dashboard');
        await Promise.all([loadEventsFromApi(), loadRegistrationsFromApi()]);
      } else {
        // If token is invalid or user not found, clear it
        localStorage.removeItem('token');
      }
    } catch (e) {
      localStorage.removeItem('token');
    } finally {
      setAuthInitializing(false);
    }
  };

  init();
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
        status: r.status ?? 'active',
        cancellationReason: r.cancellation_reason,
        cancellationAt: r.cancellation_at,
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
        clubRentals: r.clubRentals ?? r.club_rentals ?? '',
        massageTimeSlot: r.massageTimeSlot ?? r.massage_time_slot ?? '',
        // Meals
        tuesdayEarlyReception: r.tuesdayEarlyReception ?? r.tuesday_early_reception ?? '',
        wednesdayReception: r.wednesdayReception ?? 'I will attend',
        thursdayBreakfast: r.thursdayBreakfast ?? 'I will attend',
        thursdayLuncheon: r.thursdayLuncheon ?? 'I will attend',
        thursdayDinner: r.thursdayDinner ?? 'I will attend',
        fridayBreakfast: r.fridayBreakfast ?? 'I will attend',
        dietaryRestrictions: r.dietaryRestrictions ?? '',
        specialRequests: r.specialRequests ?? r.special_requests ?? '',
        // Spouse
        spouseDinnerTicket: !!(r.spouseDinnerTicket ?? false),
        spouseFirstName: r.spouseFirstName ?? '',
        spouseLastName: r.spouseLastName ?? '',
        // Payment
        totalPrice: Number(r.totalPrice ?? 675),
        paymentMethod: r.paymentMethod ?? 'Card',
        paid: r.paid ?? false,
        squarePaymentId: r.squarePaymentId ?? r.square_payment_id,
        // Legacy
        name: r.name ?? `${r.firstName || ''} ${r.lastName || ''}`.trim(),
        category: r.category ?? (r.wednesdayActivity ?? 'Networking'),
      }));
      setRegistrations(normalized);

      // Also load any pending cancellation requests for the current user
      try {
        const pendingRes: any = await cancelApi.listMinePending();
        const pendingData = (pendingRes as any).data || pendingRes?.data || [];
        const regIds = Array.isArray(pendingData)
          ? pendingData.map((r: any) => Number(r.registration_id)).filter((id: any) => Number.isFinite(id))
          : [];
        setPendingCancellationIds(regIds);
      } catch (err) {
        console.warn('Failed to load pending cancellation requests for user:', err);
      }
    } catch (err) {
      console.error('Failed to load registrations from API:', err);
    }
  };

  const loadCancellationRequestsFromApi = async () => {
    setCancellationsLoading(true);
    try {
      const resPending: any = await cancelApi.list('pending');
      const dataPending = (resPending as any).data || resPending?.data || [];
      setCancellationPendingRows(Array.isArray(dataPending) ? dataPending : []);
      const resApproved: any = await cancelApi.list('approved');
      const dataApproved = (resApproved as any).data || resApproved?.data || [];
      setCancellationApprovedRows(Array.isArray(dataApproved) ? dataApproved : []);
    } catch (err) {
      console.warn('Failed to load cancellation requests:', err);
    } finally {
      setCancellationsLoading(false);
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
  // Ensure auth pages default to light theme
  setTheme('light');
  };

  const handleRegister = async (formData: RegisterForm) => {
    try {
      // Registration page already stored token after calling /users/register + login
      const res = await authApi.me();
      const payload: any = (res as any).data || res;
      const me = payload?.data || payload;
      const newUser: User = {
        id: me.id,
        name: me.name || `${(formData as any).firstName} ${(formData as any).lastName}`.trim(),
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
      setUser({ id: 0, name: `${(formData as any).firstName} ${(formData as any).lastName}`.trim(), email: formData.email, role: 'user' });
      setRole('user');
      setView('dashboard');
      setShowRegistration(false);
      alert(`Welcome to EFBC Conference Portal, ${(formData as any).firstName}! Your account has been created successfully.`);
    }
  };

  const handleBackToLogin = () => {
    setShowRegistration(false);
  };

  const handleShowRegistration = () => {
    setShowRegistration(true);
  };

  const beginRegistration = (eventId?: number) => {
    setRegistrationTargetEventId(eventId ?? null);
    setView('registration');
  };
  
  const beginAdminEditRegistration = (registrationId: number) => {
    setAdminEditingRegistrationId(registrationId);
    setView('editRegistration');
  };

  const beginAdminCreateRegistrationForUser = (userInfo: { id: number; name: string; email: string }, eventId: number) => {
    setAdminNewRegistrationUser(userInfo);
    setAdminNewRegistrationEventId(eventId);
    setView('createRegistration');
  };
  const openAdminEventForm = (ev?: Event | null) => {
    setAdminEditingEvent(ev || null);
    setView('eventForm');
  };

  const handleSaveAdminEvent = async (eventData: Event) => {
    try {
      if (eventData.id && adminEditingEvent) {
        const { createdAt, updatedAt, ...updatePayload } = eventData as any;
        const res = await apiClient.put(`/events/${eventData.id}`, updatePayload);
        if (!res.success) throw new Error('Update failed');
        alert('Event updated successfully!');
      } else {
        const { id, createdAt, updatedAt, ...createPayload } = eventData as any;
        const res = await apiClient.post(`/events`, createPayload);
        if (!res.success) throw new Error('Create failed');
        alert('Event created successfully!');
      }
      await loadEventsFromApi();
      setAdminEditingEvent(null);
      setView('events');
    } catch (e) {
      console.error('Failed to save event', e);
      alert('Failed to save event');
    }
  };
  
  const handleSaveRegistration = (regData: Registration, currentUserId?: number) => {
    const userId = regData.userId || currentUserId || user.id;
    const finalRegistration: Registration = { ...regData, userId, id: regData.id || 0 } as any;

    // Persist to backend and then refresh list.
    const save = async () => {
      try {
        // Do not send timestamps on write
        const { createdAt, updatedAt, ...payload } = finalRegistration as any;

        // Decide create vs update based on existing local registration
        const existing = registrations.find(r => r.userId === userId && r.eventId === (payload.eventId as number));
        if (existing || regData.id) {
          const idToUpdate = regData.id || existing?.id;
          if (!idToUpdate) {
            // should not happen, but fall back to create
            const { id, ...createPayload } = payload as any;
            await apiClient.post(`/registrations`, createPayload);
          } else {
            try {
              await apiClient.put(`/registrations/${idToUpdate}`, { ...payload, id: idToUpdate });
            } catch (err: any) {
              if (err?.status === 404 || err?.response?.status === 404) {
                const { id, ...createPayload } = payload as any;
                await apiClient.post(`/registrations`, createPayload);
              } else {
                throw err;
              }
            }
          }
        } else {
          const { id, ...createPayload } = payload as any;
          await apiClient.post(`/registrations`, createPayload);
        }
      } catch (e) {
        console.error('Failed to save registration to API, falling back to local:', e);
        // Fallback local upsert if API fails
        const localId = regData.id || Date.now();
        const localFinal = { ...finalRegistration, id: localId } as Registration;
        setRegistrations(prev => {
          const exists = prev.some(r => r.id === localId);
          if (exists) return prev.map(r => (r.id === localId ? localFinal : r));
          return [...prev, localFinal];
        });
        return;
      }
      await loadRegistrationsFromApi();
    };
    save();
  };

  const handleCancelRegistration = (regId: number) => {
    setCancelTargetRegId(regId);
    setCancelReason('');
    setCancelError(null);
    setCancelModalOpen(true);
  };

  const confirmCancelRegistration = async () => {
    if (!cancelTargetRegId) return;
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      await cancelApi.request(cancelTargetRegId, cancelReason.trim());
      setPendingCancellationIds(prev =>
        prev.includes(cancelTargetRegId) ? prev : [...prev, cancelTargetRegId],
      );
      setCancelModalOpen(false);
    } catch (e: any) {
      setCancelError(e?.response?.data?.error || 'Failed to submit cancellation request');
    } finally {
      setCancelSubmitting(false);
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

  // Removed unused handleDeleteEvent to satisfy CI lint rules

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
    if (role === 'admin' && newView === 'cancellations') {
      // Only load from API if we don't already have data cached
      if (
        !cancellationsLoading &&
        cancellationPendingRows.length === 0 &&
        cancellationApprovedRows.length === 0
      ) {
        loadCancellationRequestsFromApi();
      }
    }
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
            onBeginRegistration={(eventId?: number) => beginRegistration(eventId)}
            pendingCancellationIds={pendingCancellationIds}
          />;
        case 'profile':
          return <UserProfile user={user} onUpdateProfile={handleUpdateProfile} />;
        case 'support':
          return <UserSupport />;
        case 'dashboard':
        default:
          return <UserDashboard 
            events={events} 
            registrations={registrations} 
            handleSaveRegistration={(regData) => handleSaveRegistration(regData, user.id)}
            handleCancelRegistration={handleCancelRegistration}
            user={user} 
            onBeginRegistration={() => beginRegistration()}
            pendingCancellationIds={pendingCancellationIds}
          />;
        case 'registration':
          return <UserRegistration
            events={events}
            registrations={registrations}
            user={user}
            targetEventId={registrationTargetEventId}
            onBack={() => setView('dashboard')}
            onSave={(regData) => handleSaveRegistration(regData, user.id)}
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
            events={events}
            onViewEvent={setViewingEventId}
            onRefreshEvents={loadEventsFromApi}
            onOpenEventForm={openAdminEventForm}
          />;
        case 'eventForm':
          return <AdminEventForm 
            event={adminEditingEvent}
            onCancel={()=>{ setAdminEditingEvent(null); setView('events'); }}
            onSave={handleSaveAdminEvent}
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
            user={user}
            onEditRegistration={beginAdminEditRegistration}
            onAddRegistration={beginAdminCreateRegistrationForUser}
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
        case 'cancellations':
          return (
            <AdminCancellations
              pendingRows={cancellationPendingRows}
              approvedRows={cancellationApprovedRows}
              loading={cancellationsLoading}
              onReload={loadCancellationRequestsFromApi}
              onChanged={loadRegistrationsFromApi}
            />
          );
        case 'allUsers':
          return (
            <AdminUsers
              initialUsers={adminUsersCache}
              initialPagination={adminUsersPaginationCache}
              onCacheUpdate={handleAdminUsersCacheUpdate}
            />
          );
        case 'customization':
          return (
            <AdminCustomization
              initialCustomization={emailCustomizationCache}
              onCacheUpdate={(c) => setEmailCustomizationCache(c)}
            />
          );
        case 'editRegistration':
          const editingReg = registrations.find(r => r.id === adminEditingRegistrationId);
          if (!editingReg) {
            setView('attendees');
            return null;
          }
          const regUser = { id: editingReg.userId, name: editingReg.name, email: editingReg.email };
          return <UserRegistration
            events={events}
            registrations={registrations}
            user={regUser}
            targetEventId={editingReg.eventId}
            onBack={() => {
              setAdminEditingRegistrationId(null);
              setView('attendees');
            }}
            onSave={(regData) => {
              handleSaveRegistration(regData);
              setAdminEditingRegistrationId(null);
              setView('attendees');
            }}
            isAdminEdit={true}
          />;
        case 'createRegistration':
          if (!adminNewRegistrationUser || !adminNewRegistrationEventId) {
            setView('attendees');
            return null;
          }
          return (
            <UserRegistration
              events={events}
              registrations={registrations}
              user={adminNewRegistrationUser}
              targetEventId={adminNewRegistrationEventId}
              onBack={() => {
                setAdminNewRegistrationUser(null);
                setAdminNewRegistrationEventId(null);
                setView('attendees');
              }}
              onSave={(regData) => {
                handleSaveRegistration(regData, adminNewRegistrationUser.id);
                setAdminNewRegistrationUser(null);
                setAdminNewRegistrationEventId(null);
                setView('attendees');
              }}
              isAdminEdit={true}
            />
          );
        default:
          return <AdminEvents 
            events={events}
            onViewEvent={setViewingEventId}
            onRefreshEvents={loadEventsFromApi}
          />;
      }
    }
    return null;
  };

  if (authInitializing) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-spinner" />
        <p className="app-loading-text">Loading your dashboard…</p>
      </div>
    );
  }

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
        {cancelModalOpen && (
          <Modal
            title="Cancel Registration"
            onClose={() => !cancelSubmitting && setCancelModalOpen(false)}
          >
            <div className="form-group">
              <p>Please share a brief reason for your cancellation (optional, but helpful for us).</p>
              <label htmlFor="cancelReason" className="form-label">Reason for cancellation</label>
              <textarea
                id="cancelReason"
                className="form-control"
                rows={4}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Example: schedule conflict, travel issues, etc."
                disabled={cancelSubmitting}
              />
            </div>
            {cancelError && <div className="error-message" style={{ marginTop: '0.5rem' }}>{cancelError}</div>}
            <div className="modal-footer-actions" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelSubmitting}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmCancelRegistration}
                disabled={cancelSubmitting}
              >
                {cancelSubmitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </Modal>
        )}
        {alertState.open && (
          <Modal
            title="Notification"
            onClose={() => setAlertState({ open: false, message: '' })}
          >
            <p>{alertState.message}</p>
            <div className="modal-footer-actions" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setAlertState({ open: false, message: '' })}
              >
                OK
              </button>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
};

export default App;
