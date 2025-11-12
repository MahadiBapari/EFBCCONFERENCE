import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/AdminUsers.css';
import { apiClient } from '../../services/apiClient';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0
  });
  const usersPerPage = 5; // For testing, will be 30 later

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', usersPerPage.toString());
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
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
    }
  }, [currentPage, searchQuery, usersPerPage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="admin-users-container">
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-users-container">
        <div className="error-message">{error}</div>
        <button className="btn btn-primary" onClick={loadUsers}>Retry</button>
      </div>
    );
  }

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
          />
          <button className="btn btn-secondary" onClick={loadUsers}>
            Refresh
          </button>
        </div>
      </div>

      <div className="admin-users-table-container">
        {users.length > 0 ? (
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
            <p>No users found{searchQuery ? ` matching "${searchQuery}"` : ''}.</p>
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
            <span className="pagination-total">
              (Total: {pagination.total} users)
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
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>
    </div>
  );
};

