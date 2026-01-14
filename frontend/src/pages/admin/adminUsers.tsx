import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import '../../styles/AdminUsers.css';
import { apiClient, usersApi } from '../../services/apiClient';

export interface User {
  id: number;
  name: string;
  email: string;
  role?: 'admin' | 'user' | 'guest';
  isActive?: boolean;
  createdAt?: string;
  emailVerifiedAt?: string | null;
}

interface UsersApiResponse {
  success: boolean;
  data?: User[];
  pagination?: any; // Not used for frontend pagination, but kept for API response compatibility
  error?: string;
}

interface AdminUsersProps {
  initialUsers?: User[];
  initialPagination?: any; // Not used for frontend pagination, kept for backward compatibility
  onCacheUpdate?: (users: User[], pagination: any) => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({
  initialUsers,
  initialPagination,
  onCacheUpdate,
}) => {
  const hasInitial = !!(initialUsers && initialUsers.length > 0);
  const [users, setUsers] = useState<User[]>(initialUsers || []);
  const [initialLoading, setInitialLoading] = useState(!hasInitial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 30; // Users per page for frontend pagination
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Default: most recent first

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // State for creating a user by admin
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role: 'admin' | 'user';
  }>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'user',
  });

  // State for editing an existing user
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role: 'admin' | 'user';
    password: string;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'user',
    password: '',
  });

  const loadUsers = useCallback(
    async (search?: string) => {
      try {
        setLoading(true);
        setError(null);

        const searchToUse = search ?? debouncedSearchQuery;

        const params = new URLSearchParams();
        params.append('page', '1');
        params.append('limit', '3000'); // Fetch all users for frontend pagination
        if (searchToUse.trim()) {
          params.append('search', searchToUse.trim());
        }

        const response = await apiClient.get<User[]>(`/users?${params.toString()}`) as UsersApiResponse;
        if (response.success && response.data) {
          const newUsers = Array.isArray(response.data) ? response.data : [];
          setUsers(newUsers);
          
          if (onCacheUpdate) {
            // No pagination info needed for frontend pagination
            onCacheUpdate(newUsers, null);
          }
        } else {
          setError('Failed to load users');
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load users');
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [debouncedSearchQuery, onCacheUpdate]
  );

  // Load users when debouncedSearchQuery changes (frontend pagination, no need to reload on page change)
  useEffect(() => {
    loadUsers(debouncedSearchQuery);
  }, [debouncedSearchQuery, loadUsers]);

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
      // loadUsers will be called by the useEffect when debouncedSearchQuery changes
    }, 300); // 300ms debounce delay

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, loadUsers]);

  // Split name into first and last name
  const splitName = (name: string): { firstName: string; lastName: string } => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    return { firstName, lastName };
  };

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    let results = users;
    
    if (debouncedSearchQuery.trim() !== "") {
      const lowercasedQuery = debouncedSearchQuery.toLowerCase();
      results = results.filter(u => 
        u.name.toLowerCase().includes(lowercasedQuery) || 
        u.email.toLowerCase().includes(lowercasedQuery)
      );
    }
    
    return results;
  }, [users, debouncedSearchQuery]);

  // Sort users
  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'firstName':
          const aName = splitName(a.name || '');
          const bName = splitName(b.name || '');
          aValue = aName.firstName?.toLowerCase() || '';
          bValue = bName.firstName?.toLowerCase() || '';
          break;
        case 'lastName':
          const aName2 = splitName(a.name || '');
          const bName2 = splitName(b.name || '');
          aValue = aName2.lastName?.toLowerCase() || '';
          bValue = bName2.lastName?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'role':
          aValue = (a.role || 'user').toLowerCase();
          bValue = (b.role || 'user').toLowerCase();
          break;
        case 'createdAt':
          // Sort by creation date (most recent first in desc, oldest first in asc)
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      // Handle numeric comparisons
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
      
      // Handle string comparisons
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredUsers, sortField, sortDirection]);

  // Frontend pagination
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / usersPerPage));
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenCreate = () => {
    setCreateError(null);
    setCreateSuccess(null);
    setNewUser({ firstName: '', lastName: '', email: '', role: 'user' });
    setShowCreateModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.firstName.trim() || !newUser.lastName.trim() || !newUser.email.trim()) {
      setCreateError('First name, last name, and email are required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email.trim())) {
      setCreateError('Please enter a valid email address.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const res = await usersApi.createByAdmin({
        firstName: newUser.firstName.trim(),
        lastName: newUser.lastName.trim(),
        email: newUser.email.trim(),
        role: newUser.role,
      });
      if (!res.success) {
        setCreateError(res.error || 'Failed to create user.');
      } else {
        setCreateSuccess('User created successfully. A temporary password has been emailed.');
        await loadUsers(debouncedSearchQuery);
        // Keep modal open but clear password-related info; or close after short delay
        setTimeout(() => {
          setShowCreateModal(false);
          setCreateSuccess(null);
        }, 1500);
      }
    } catch (err: any) {
      setCreateError(err?.response?.data?.error || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (user: User) => {
    const { firstName, lastName } = splitName(user.name);
    setEditingUser(user);
    setEditError(null);
    setEditSuccess(null);
    setEditForm({
      firstName,
      lastName,
      email: user.email,
      role: (user.role as 'admin' | 'user') || 'user',
      password: '',
    });
  };

  const handleEditChange = (field: keyof typeof editForm, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
      setEditError('First name, last name, and email are required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email.trim())) {
      setEditError('Please enter a valid email address.');
      return;
    }

    if (editForm.password) {
      const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!pwRegex.test(editForm.password)) {
        setEditError('Password must be at least 8 characters and include uppercase, lowercase, and a number.');
        return;
      }
    }

    setEditing(true);
    setEditError(null);
    setEditSuccess(null);
    try {
      const name = `${editForm.firstName.trim()} ${editForm.lastName.trim()}`.trim();
      const payload: any = {
        name,
        email: editForm.email.trim(),
        role: editForm.role,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }

      const res = await apiClient.put(`/users/${editingUser.id}`, payload);
      if (!res.success) {
        setEditError(res.error || 'Failed to update user.');
      } else {
        setEditSuccess('User updated successfully.');
        await loadUsers(debouncedSearchQuery);
        setTimeout(() => {
          setEditingUser(null);
          setEditSuccess(null);
        }, 1200);
      }
    } catch (err: any) {
      setEditError(err?.response?.data?.error || 'Failed to update user.');
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    const confirmed = window.confirm(`Are you sure you want to delete user "${user.name}" (${user.email})?`);
    if (!confirmed) return;
    try {
      const res = await apiClient.delete(`/users/${user.id}`);
      if (!res.success) {
        setError(res.error || 'Failed to delete user');
      } else {
        await loadUsers(debouncedSearchQuery);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleVerifyUser = async (user: User) => {
    const confirmed = window.confirm(`Are you sure you want to verify email for user "${user.name}" (${user.email})?`);
    if (!confirmed) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.put(`/users/${user.id}/verify`, {});
      if (!res.success) {
        setError(res.error || 'Failed to verify user');
      } else {
        await loadUsers(debouncedSearchQuery);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to verify user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-users-container">
      <div className="admin-users-header">
        <h1>All Users</h1>
        <div className="admin-users-actions">
          <input
            type="text"
            placeholder="Search by name or email..."
            className="search-input"
            value={searchQuery}
            onChange={handleSearchChange}
            disabled={initialLoading}
          />
          <button 
            className="btn btn-secondary" 
            onClick={() => loadUsers(debouncedSearchQuery)}
            disabled={loading || initialLoading}
          >
            Refresh
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleOpenCreate}
            disabled={initialLoading}
          >
            Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button
            className="btn btn-primary btn-sm error-retry-btn"
            onClick={() => loadUsers(debouncedSearchQuery)}
          >
            Retry
          </button>
        </div>
      )}

      <div className="admin-users-table-container">
        {initialLoading ? (
          <div className="loading">Loading users...</div>
        ) : (
          <>
            <div className={`table-wrapper ${loading ? 'loading-overlay' : ''}`}>
              {paginatedUsers.length > 0 ? (
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th 
                        className="sortable-header"
                        onClick={() => handleSort('id')}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        ID
                        {sortField === 'id' && (
                          <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                      <th 
                        className="sortable-header"
                        onClick={() => handleSort('firstName')}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        First Name
                        {sortField === 'firstName' && (
                          <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                      <th 
                        className="sortable-header"
                        onClick={() => handleSort('lastName')}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        Last Name
                        {sortField === 'lastName' && (
                          <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                      <th 
                        className="sortable-header"
                        onClick={() => handleSort('email')}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        Email
                        {sortField === 'email' && (
                          <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                      <th 
                        className="sortable-header"
                        onClick={() => handleSort('role')}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        Role
                        {sortField === 'role' && (
                          <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                      <th 
                        className="sortable-header"
                        onClick={() => handleSort('createdAt')}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        Date Created
                        {sortField === 'createdAt' && (
                          <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => {
                      const { firstName, lastName } = splitName(user.name);
                      return (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{firstName}</td>
                          <td>{lastName}</td>
                          <td>{user.email}</td>
                          <td>
                            <span className={`role-badge role-${user.role || 'user'}`}>
                              {user.role || 'user'}
                            </span>
                          </td>
                          <td>
                            {user.createdAt 
                              ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })
                              : ''}
                          </td>
                          <td>
                            <div className="admin-users-row-actions">
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => openEditModal(user)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteUser(user)}
                              >
                                Delete
                              </button>
                              {!user.emailVerifiedAt && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleVerifyUser(user)}
                                  disabled={loading}
                                  title="Verify user email"
                                >
                                  Verify
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="no-users">
                  <p>No users found{debouncedSearchQuery ? ` matching "${debouncedSearchQuery}"` : ''}.</p>
                </div>
              )}
              {loading && (
                <div className="table-loading-overlay">
                  <div className="loading-spinner"></div>
                  <span>Loading...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="admin-users-pagination">
          <button
            className="btn btn-secondary"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </button>
          <div className="pagination-numbers">
            {(() => {
              const pages: (number | string)[] = [];
              const showEllipsis = totalPages > 7; // Show ellipsis if more than 7 pages
              
              if (!showEllipsis) {
                // Show all pages if 7 or fewer
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Always show first page
                pages.push(1);
                
                if (currentPage <= 4) {
                  // Near the start: show 1, 2, 3, 4, 5, ..., last
                  for (let i = 2; i <= 5; i++) {
                    pages.push(i);
                  }
                  pages.push('ellipsis-end');
                  pages.push(totalPages);
                } else if (currentPage >= totalPages - 3) {
                  // Near the end: show 1, ..., last-4, last-3, last-2, last-1, last
                  pages.push('ellipsis-start');
                  for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // In the middle: show 1, ..., current-1, current, current+1, ..., last
                  pages.push('ellipsis-start');
                  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                  }
                  pages.push('ellipsis-end');
                  pages.push(totalPages);
                }
              }
              
              return pages.map((page, idx) => {
                if (typeof page === 'string') {
                  return <span key={`${page}-${idx}`} className="pagination-ellipsis">...</span>;
                }
                return (
                  <button
                    key={page}
                    className={`btn pagination-number ${page === currentPage ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                    disabled={loading}
                  >
                    {page}
                  </button>
                );
              });
            })()}
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
          >
            Next
          </button>
        </div>
      )}

      <div className="admin-users-footer">
        <p>
          Showing {paginatedUsers.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, sortedUsers.length)} of {sortedUsers.length} users
          {debouncedSearchQuery && ` matching "${debouncedSearchQuery}"`}
        </p>
      </div>

      {showCreateModal && (
        <div className="admin-users-modal-backdrop">
          <div className="admin-users-modal">
            <h2>Create User</h2>
            <p className="admin-users-modal-subtitle">
              A temporary password will be generated and emailed to the user. Accounts created here are active and do not require email verification.
            </p>
            {createError && <div className="error-message">{createError}</div>}
            {createSuccess && <div className="success-message">{createSuccess}</div>}
            <form onSubmit={handleCreateUser} className="admin-users-modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="newFirstName">First Name</label>
                  <input
                    id="newFirstName"
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="newLastName">Last Name</label>
                  <input
                    id="newLastName"
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="newEmail">Email</label>
                <input
                  id="newEmail"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="newRole">Role</label>
                <select
                  id="newRole"
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser(prev => ({ ...prev, role: (e.target.value === 'admin' ? 'admin' : 'user') }))
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="admin-users-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (!creating) {
                      setShowCreateModal(false);
                    }
                  }}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="admin-users-modal-backdrop">
          <div className="admin-users-modal">
            <h2>Edit User</h2>
            <p className="admin-users-modal-subtitle">
              Update the user&apos;s details. Leave the password field blank to keep the current password.
            </p>
            {editError && <div className="error-message">{editError}</div>}
            {editSuccess && <div className="success-message">{editSuccess}</div>}
            <form onSubmit={handleEditUser} className="admin-users-modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="editFirstName">First Name</label>
                  <input
                    id="editFirstName"
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => handleEditChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editLastName">Last Name</label>
                  <input
                    id="editLastName"
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => handleEditChange('lastName', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="editEmail">Email</label>
                <input
                  id="editEmail"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => handleEditChange('email', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="editRole">Role</label>
                <select
                  id="editRole"
                  value={editForm.role}
                  onChange={(e) => handleEditChange('role', e.target.value === 'admin' ? 'admin' : 'user')}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="editPassword">New Password (optional)</label>
                <input
                  id="editPassword"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => handleEditChange('password', e.target.value)}
                  placeholder="Leave blank to keep current password"
                />
              </div>
              <div className="admin-users-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (!editing) {
                      setEditingUser(null);
                    }
                  }}
                  disabled={editing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editing}
                >
                  {editing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

