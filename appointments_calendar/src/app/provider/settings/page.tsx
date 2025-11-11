'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { secureFetch } from '@/lib/csrf';

interface Provider {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  phone?: string;
  company?: string;
  website?: string;
  bio?: string;
}

export default function ProviderSettings() {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Profile Information form
  const [profileForm, setProfileForm] = useState({
    name: '',
    company: '',
    phone: '',
    website: '',
    bio: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Profile update handler
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('providerToken');
      const response = await secureFetch('/api/provider/settings/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileForm)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      setSuccess('Profile updated successfully.');
      // Optionally update provider state
      setProvider((prev) => prev ? { ...prev, ...profileForm } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Email change form
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    confirmEmail: '',
    currentPassword: ''
  });
  const [emailLoading, setEmailLoading] = useState(false);

  // Password reset form
  const [resetLoading, setResetLoading] = useState(false);

  // Account deletion form
  const [deleteForm, setDeleteForm] = useState({
    confirmEmail: '',
    confirmText: '',
    currentPassword: ''
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('providerToken');
        if (!token) {
          router.push('/provider/login');
          return;
        }

        const response = await fetch('/api/provider/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Failed to load provider data');
        }

        const data = await response.json();
        setProvider(data.provider);
        setProfileForm({
          name: data.provider.name || '',
          company: data.provider.company || '',
          phone: data.provider.phone || '',
          website: data.provider.website || '',
          bio: data.provider.bio || ''
        });
        // Do NOT pre-fill emailForm fields
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load provider data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setError('');
    setSuccess('');

    if (emailForm.newEmail !== emailForm.confirmEmail) {
      setError('Email addresses do not match');
      setEmailLoading(false);
      return;
    }

    if (emailForm.newEmail === provider?.email) {
      setError('New email must be different from current email');
      setEmailLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('providerToken');
      const response = await secureFetch('/api/provider/settings/email', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newEmail: emailForm.newEmail,
          currentPassword: emailForm.currentPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update email');
      }

      setSuccess('Email updated successfully. Please log in again with your new email.');
      setEmailForm({ newEmail: '', confirmEmail: '', currentPassword: '' });
      
      // Log out user after email change
      setTimeout(() => {
        localStorage.removeItem('providerToken');
        localStorage.removeItem('currentProviderEmail');
        router.push('/provider/login?message=Email updated. Please log in with your new email.');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setResetLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/provider/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: provider?.email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reset email');
      }

      setSuccess('Password reset email sent successfully. Check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  const handleAccountDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteLoading(true);
    setError('');

    if (deleteForm.confirmEmail !== provider?.email) {
      setError('Email confirmation does not match your current email');
      setDeleteLoading(false);
      return;
    }

    if (deleteForm.confirmText !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion');
      setDeleteLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('providerToken');
      const response = await secureFetch('/api/provider/settings/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: deleteForm.currentPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      // Clear all local storage and redirect
      localStorage.clear();
      router.push('/provider/login?message=Account deleted successfully.');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
            <p className="text-gray-600 mt-1">Manage your provider account settings</p>
          </div>

          <div className="p-6 space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {/* Profile Information */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4 bg-gray-50 rounded-lg p-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={profileForm.company}
                    onChange={e => setProfileForm(f => ({ ...f, company: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={profileForm.website}
                    onChange={e => setProfileForm(f => ({ ...f, website: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={profileForm.bio}
                    onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {profileLoading ? 'Saving...' : 'Update Profile'}
                </button>
              </form>
            </section>

            {/* Change Email */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Email Address</h2>
              <form onSubmit={handleEmailChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Email Address
                  </label>
                  <input
                    type="email"
                    value={emailForm.newEmail}
                    onChange={(e) => setEmailForm({...emailForm, newEmail: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Email
                  </label>
                  <input
                    type="email"
                    value={emailForm.confirmEmail}
                    onChange={(e) => setEmailForm({...emailForm, confirmEmail: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={emailForm.currentPassword}
                    onChange={(e) => setEmailForm({...emailForm, currentPassword: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emailLoading ? 'Updating...' : 'Update Email'}
                </button>
              </form>
            </section>

            {/* Password Reset */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reset Password</h2>
              <p className="text-gray-600 mb-4">
                Send a password reset link to your email address.
              </p>
              <button
                onClick={handlePasswordReset}
                disabled={resetLoading}
                className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? 'Sending...' : 'Send Reset Email'}
              </button>
            </section>

            {/* Delete Account */}
            <section className="border-t border-gray-200 pt-8">
              <h2 className="text-lg font-semibold text-red-900 mb-4">Delete Account</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-red-900 mb-2">⚠️ Warning</h3>
                <p className="text-red-700 text-sm mb-2">
                  Deleting your account will permanently remove:
                </p>
                <ul className="text-red-700 text-sm list-disc list-inside space-y-1">
                  <li>Your provider profile and settings</li>
                  <li>All calendar connections and integrations</li>
                  <li>Availability templates and schedules</li>
                  <li>Location settings</li>
                  <li>All booking history and customer data</li>
                </ul>
                <p className="text-red-700 text-sm mt-2 font-medium">
                  This action cannot be undone.
                </p>
              </div>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                >
                  Delete Account
                </button>
              ) : (
                <form onSubmit={handleAccountDelete} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm your email address
                    </label>
                    <input
                      type="email"
                      value={deleteForm.confirmEmail}
                      onChange={(e) => setDeleteForm({...deleteForm, confirmEmail: e.target.value})}
                      placeholder={provider?.email}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type &quot;DELETE&quot; to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteForm.confirmText}
                      onChange={(e) => setDeleteForm({...deleteForm, confirmText: e.target.value})}
                      placeholder="DELETE"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={deleteForm.currentPassword}
                      onChange={(e) => setDeleteForm({...deleteForm, currentPassword: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteForm({ confirmEmail: '', confirmText: '', currentPassword: '' });
                      }}
                      className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={deleteLoading}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteLoading ? 'Deleting...' : 'Permanently Delete Account'}
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}