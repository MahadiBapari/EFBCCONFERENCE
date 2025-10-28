import React, { useState } from 'react';
import { User } from '../../types';
import '../../styles/UserProfile.css';
import { authApi } from '../../services/apiClient';

interface UserProfileProps {
  user: User;
  onUpdateProfile: (updatedData: Partial<User>) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
  });

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [cnfPw, setCnfPw] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      email: user.email,
    });
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (!newPw || newPw !== cnfPw) {
      setPwMsg('New password and confirmation must match');
      return;
    }
    setPwLoading(true);
    try {
      await authApi.changePassword({ currentPassword: curPw, newPassword: newPw });
      setPwMsg('Password updated successfully');
      setCurPw(''); setNewPw(''); setCnfPw('');
    } catch (err: any) {
      setPwMsg(err?.response?.data?.error || 'Failed to change password');
    } finally { setPwLoading(false); }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>My Profile</h1>
      </div>

      <div className="card profile-form">
        <div className="profile-info">
          <h3>Profile Information</h3>
          <div className="profile-details">
            <div className="profile-detail">
              <strong>User ID</strong>
              <span>{user.id}</span>
            </div>
            <div className="profile-detail">
              <strong>Role</strong>
              <span>{user.role || 'User'}</span>
            </div>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="profile-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="form-group">
              <label>Name</label>
              <div className="profile-field">
                {user.name}
              </div>
            </div>
            <div className="form-group">
              <label>Email</label>
              <div className="profile-field">
                {user.email}
              </div>
            </div>
            <div className="profile-actions">
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card profile-form" style={{ marginTop: '1rem' }}>
        <h3>Change Password</h3>
        <form onSubmit={handlePasswordChange}>
          <div className="form-group">
            <label htmlFor="curPw">Current Password</label>
            <input id="curPw" type="password" className="form-control" value={curPw} onChange={e=>setCurPw(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="newPw">New Password</label>
            <input id="newPw" type="password" className="form-control" value={newPw} onChange={e=>setNewPw(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="cnfPw">Confirm New Password</label>
            <input id="cnfPw" type="password" className="form-control" value={cnfPw} onChange={e=>setCnfPw(e.target.value)} required />
          </div>
          {pwMsg && <div style={{ marginBottom: '0.5rem' }}>{pwMsg}</div>}
          <button type="submit" className="btn btn-primary" disabled={pwLoading}>{pwLoading ? 'Updating...' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  );
};
