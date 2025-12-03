import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../styles/AdminUsers.css';
import { apiClient, usersApi } from '../../services/apiClient';

export interface User {
  id: number;
  name: string;
  email: string;
  role?: 'admin' | 'user' | 'guest';
  isActive?: boolean;
  createdAt?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UsersApiResponse {
  success: boolean;
  data?: User[];
  pagination?: PaginationInfo;
  error?: string;
}

interface AdminUsersProps {
  initialUsers?: User[];
  initialPagination?: PaginationInfo | null;
  onCacheUpdate?: (users: User[], pagination: PaginationInfo | null) => void;
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
  const [pagination, setPagination] = useState<PaginationInfo>(
    initialPagination || {
      page: 1,
      limit: 5,
      total: 0,
      totalPages: 0,
    }
  );
  const usersPerPage = 10; // Users per page
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    async (page: number, search?: string) => {
      try {
        setLoading(true);
        setError(null);

        const searchToUse = search ?? debouncedSearchQuery;

        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', usersPerPage.toString());
        if (searchToUse.trim()) {
          params.append('search', searchToUse.trim());
        }

        const response = await apiClient.get<User[]>(`/users?${params.toString()}`) as UsersApiResponse;
        if (response.success && response.data) {
          const newUsers = Array.isArray(response.data) ? response.data : [];
          setUsers(newUsers);
          
          // Use pagination from response - backend should always return it
          let newPagination: PaginationInfo;
          if (response.pagination) {
            newPagination = response.pagination;
            // Ensure page matches what we requested
            newPagination.page = page;
          } else {
            // Fallback: if backend doesn't return pagination, we can't calculate it correctly
            // because we don't know the total count. Log a warning.
            console.warn('Backend did not return pagination info, using fallback');
            newPagination = {
              page: page,
              limit: usersPerPage,
              total: newUsers.length, // This is wrong but we don't have the total
              totalPages: Math.max(1, Math.ceil(newUsers.length / usersPerPage)),
            };
          }
          
          // Ensure pagination is set correctly
          if (newPagination.totalPages === 0 && newPagination.total > 0) {
            newPagination.totalPages = 1;
          }
          
          // Debug log to help diagnose pagination issues
          console.log('Pagination info:', {
            page: newPagination.page,
            limit: newPagination.limit,
            total: newPagination.total,
            totalPages: newPagination.totalPages,
            usersReturned: newUsers.length
          });
          
          setPagination(newPagination);
          if (onCacheUpdate) {
            onCacheUpdate(newUsers, newPagination);
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
    [debouncedSearchQuery, usersPerPage, onCacheUpdate]
  );

  // Load users when currentPage or debouncedSearchQuery changes
  useEffect(() => {
    loadUsers(currentPage, debouncedSearchQuery);
  }, [currentPage, debouncedSearchQuery, loadUsers]);

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
      // Don't call loadUsers here - let the useEffect handle it
      // This prevents double loading and race conditions
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
        await loadUsers(currentPage, debouncedSearchQuery);
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
        await loadUsers(currentPage, debouncedSearchQuery);
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
        await loadUsers(currentPage, debouncedSearchQuery);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete user');
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
            onClick={() => loadUsers(currentPage, debouncedSearchQuery)}
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
            onClick={() => loadUsers(currentPage, debouncedSearchQuery)}
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
              {users.length > 0 ? (
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
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

      {pagination.totalPages > 1 && (
        <div className="admin-users-pagination">
          <button
            className="btn btn-secondary"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </button>
          <div className="pagination-numbers">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
              // Show first page, last page, current page, and pages around current
              const showPage = 
                pageNum === 1 || 
                pageNum === pagination.totalPages || 
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
              
              if (!showPage) {
                // Show ellipsis
                if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return <span key={pageNum} className="pagination-ellipsis">...</span>;
                }
                return null;
              }
              
              return (
                <button
                  key={pageNum}
                  className={`btn pagination-number ${pageNum === currentPage ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={loading}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.totalPages || loading}
          >
            Next
          </button>
        </div>
      )}

      <div className="admin-users-footer">
        <p>
          Showing {users.length} of {pagination.total} users
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

