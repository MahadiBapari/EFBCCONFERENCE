import React, { useState, useEffect } from 'react';
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

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<User[]>('/users');
      if (response.success && response.data) {
        setUsers(Array.isArray(response.data) ? response.data : []);
      } else {
        setError('Failed to load users');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Split name into first and last name
  const splitName = (name: string): { firstName: string; lastName: string } => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    return { firstName, lastName };
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const { firstName, lastName } = splitName(user.name);
    return (
      firstName.toLowerCase().includes(query) ||
      lastName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

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
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="btn btn-secondary" onClick={loadUsers}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="admin-users-table-container">
        {filteredUsers.length > 0 ? (
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
              {filteredUsers.map((user) => {
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

      <div className="admin-users-footer">
        <p>Total users: {filteredUsers.length}</p>
      </div>
    </div>
  );
};

