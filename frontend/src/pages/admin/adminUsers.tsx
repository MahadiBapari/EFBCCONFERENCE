import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../styles/AdminUsers.css';
import { apiClient, usersApi } from '../../services/apiClient';

interface User {
  id: number;
  name: string;
  email: string;
  role?: 'admin' | 'user' | 'guest';
  isActive?: boolean;
  createdAt?: string;
}

interface PaginationInfo {
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

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0
  });
  const usersPerPage = 5; // For testing, will be 30 later
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

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters - search queries the entire database
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', usersPerPage.toString());
      // When search query is provided, backend searches entire database before pagination
      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim());
      }
      
      const response = await apiClient.get<User[]>(`/users?${params.toString()}`) as UsersApiResponse;
      if (response.success && response.data) {
        setUsers(Array.isArray(response.data) ? response.data : []);
        if (response.pagination) {
          setPagination(response.pagination);
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
  }, [currentPage, debouncedSearchQuery, usersPerPage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300); // 300ms debounce delay

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

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
        await loadUsers();
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
            onClick={loadUsers}
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
          <button className="btn btn-primary btn-sm error-retry-btn" onClick={loadUsers}>
            Retry
          </button>
        </div>
      )}

      <div className="admin-users-table-container">
        {initialLoading ? (
          <div className="loading">Loading users...</div>
        ) : loading ? (
          <div className="table-loading">
            <div className="loading-spinner"></div>
            <span>Searching...</span>
          </div>
        ) : users.length > 0 ? (
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
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
                      <span className={`status-badge status-${user.isActive !== false ? 'active' : 'inactive'}`}>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
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
      </div>

      {pagination.totalPages > 1 && (
        <div className="admin-users-pagination">
          <button
            className="btn btn-secondary"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <div className="pagination-info">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.totalPages}
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
    </div>
  );
};

