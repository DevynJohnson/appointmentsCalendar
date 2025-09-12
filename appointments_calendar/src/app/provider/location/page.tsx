'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ProviderLocation {
  id: string;
  city: string;
  stateProvince: string;
  country: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LocationFormData {
  city: string;
  stateProvince: string;
  country: string;
  description: string;
  startDate: string;
  endDate: string;
  isDefault: boolean;
}

export default function ManageLocationPage() {
  const [locations, setLocations] = useState<ProviderLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    city: '',
    stateProvince: '',
    country: '',
    description: '',
    startDate: '',
    endDate: '',
    isDefault: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const fetchLocations = useCallback(async () => {
    try {
      const token = localStorage.getItem('providerToken');
      if (!token) {
        router.push('/provider/login');
        return;
      }

      const response = await fetch('/api/provider/location', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('providerToken');
          router.push('/provider/login');
          return;
        }
        throw new Error('Failed to fetch locations');
      }

      const data = await response.json();
      setLocations(data.locations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setError('Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('providerToken');
      if (!token) {
        router.push('/provider/login');
        return;
      }

      // Validate dates (only for non-default locations)
      if (!formData.isDefault) {
        if (!formData.startDate || !formData.endDate) {
          setError('Start date and end date are required for non-default locations');
          setIsSubmitting(false);
          return;
        }

        const startDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);
        
        if (startDate >= endDate) {
          setError('Start date must be before end date');
          setIsSubmitting(false);
          return;
        }
      }

      const url = editingId ? `/api/provider/location/${editingId}` : '/api/provider/location';
      const method = editingId ? 'PUT' : 'POST';

      // Prepare data for submission - handle default locations properly
      const submitData = {
        ...formData,
        // For default locations, don't send empty date strings
        ...(formData.isDefault ? {
          startDate: undefined,
          endDate: undefined
        } : {})
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save location');
      }

      // Reset form and refresh locations
      setFormData({
        city: '',
        stateProvince: '',
        country: '',
        description: '',
        startDate: '',
        endDate: '',
        isDefault: false
      });
      setShowForm(false);
      setEditingId(null);
      await fetchLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      setError(error instanceof Error ? error.message : 'Failed to save location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (location: ProviderLocation) => {
    setFormData({
      city: location.city,
      stateProvince: location.stateProvince,
      country: location.country,
      description: location.description || '',
      startDate: location.isDefault ? '' : location.startDate.split('T')[0], // Empty for default locations
      endDate: location.isDefault ? '' : location.endDate.split('T')[0],
      isDefault: location.isDefault
    });
    setEditingId(location.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) {
      return;
    }

    try {
      const token = localStorage.getItem('providerToken');
      if (!token) {
        router.push('/provider/login');
        return;
      }

      const response = await fetch(`/api/provider/location/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete location');
      }

      await fetchLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      setError('Failed to delete location');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const token = localStorage.getItem('providerToken');
      if (!token) {
        router.push('/provider/login');
        return;
      }

      // Get the current location data to update it
      const locationToUpdate = locations.find(loc => loc.id === id);
      if (!locationToUpdate) return;

      const response = await fetch(`/api/provider/location/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city: locationToUpdate.city,
          stateProvince: locationToUpdate.stateProvince,
          country: locationToUpdate.country,
          description: locationToUpdate.description,
          startDate: locationToUpdate.startDate,
          endDate: locationToUpdate.endDate,
          isDefault: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to set default location');
      }

      await fetchLocations(); // Refresh the list
    } catch (error) {
      console.error('Error setting default location:', error);
      setError('Failed to set default location');
    }
  };

  const handleCancel = () => {
    setFormData({
      city: '',
      stateProvince: '',
      country: '',
      description: '',
      startDate: '',
      endDate: '',
      isDefault: false
    });
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Locations</h1>
              <p className="text-gray-600 mt-1">Set up locations and timeframes for client bookings</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              Add Location
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {showForm && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingId ? 'Edit Location' : 'Add New Location'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter city"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      State/Province *
                    </label>
                    <input
                      type="text"
                      value={formData.stateProvince}
                      onChange={(e) => setFormData(prev => ({ ...prev, stateProvince: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter state or province"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Country *
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter country"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional description for this location"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 h-4 w-4"
                    />
                    <span className="text-sm font-medium text-gray-900">Set as default location</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Default locations don&apos;t require specific timeframes and will be used as your primary location
                  </p>
                </div>

                {!formData.isDefault && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        End Date *
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isSubmitting ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Location' : 'Add Location')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {locations.length === 0 && !showForm ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-5xl mb-4">📍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No locations added yet</h3>
              <p className="text-gray-600 mb-4">Add your first location to start accepting bookings</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                Add Your First Location
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {locations.map((location) => (
                <div key={location.id} className={`border rounded-lg p-4 hover:bg-gray-50 ${
                  location.isDefault ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {location.city}, {location.stateProvince}, {location.country}
                        </h3>
                        {location.isDefault && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
                            ⭐ Default
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          location.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {location.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      {location.description && (
                        <p className="text-gray-600 text-sm mb-2">{location.description}</p>
                      )}
                      
                      <div className="text-sm text-gray-500">
                        {location.isDefault ? (
                          <span>🏠 Permanent location</span>
                        ) : (
                          <span>📅 {new Date(location.startDate).toLocaleDateString()} - {new Date(location.endDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {!location.isDefault && (
                        <button
                          onClick={() => handleSetDefault(location.id)}
                          className="text-orange-600 hover:text-orange-800 font-medium text-sm"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(location)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(location.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}