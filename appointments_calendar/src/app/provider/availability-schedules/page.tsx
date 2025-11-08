'use client';

import { useState, useEffect } from 'react';
import AdvancedAvailabilityEditor from '@/components/AdvancedAvailabilityEditor';
import { Calendar, Clock, Settings } from 'lucide-react';
import { secureFetch } from '@/lib/csrf';

export default function AvailabilitySchedulesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeTemplate = async () => {
      try {
        const token = localStorage.getItem('providerToken');
        if (!token) {
          setError('Please log in to access availability schedules');
          setIsLoading(false);
          return;
        }

        // Try to get existing templates
        const response = await secureFetch('/api/provider/availability/templates', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.templates && data.templates.length > 0) {
            // Use the first template or the default one
            const defaultTemplate = data.templates.find((t: { isDefault: boolean; id: string }) => t.isDefault) || data.templates[0];
            setTemplateId(defaultTemplate.id);
          } else {
            // Create a default template for the unified system
            const createResponse = await secureFetch('/api/provider/availability/templates', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                templateName: 'Default Schedule',
                timezone: 'America/New_York',
                isDefault: true,
                weeklySchedule: [
                  // Monday-Friday 9-5 default
                  { dayOfWeek: 1, dayName: 'Monday', isEnabled: true, timeSlots: [{ startTime: '09:00', endTime: '17:00', isEnabled: true }] },
                  { dayOfWeek: 2, dayName: 'Tuesday', isEnabled: true, timeSlots: [{ startTime: '09:00', endTime: '17:00', isEnabled: true }] },
                  { dayOfWeek: 3, dayName: 'Wednesday', isEnabled: true, timeSlots: [{ startTime: '09:00', endTime: '17:00', isEnabled: true }] },
                  { dayOfWeek: 4, dayName: 'Thursday', isEnabled: true, timeSlots: [{ startTime: '09:00', endTime: '17:00', isEnabled: true }] },
                  { dayOfWeek: 5, dayName: 'Friday', isEnabled: true, timeSlots: [{ startTime: '09:00', endTime: '17:00', isEnabled: true }] },
                  { dayOfWeek: 6, dayName: 'Saturday', isEnabled: false, timeSlots: [] },
                  { dayOfWeek: 0, dayName: 'Sunday', isEnabled: false, timeSlots: [] }
                ]
              })
            });

            if (createResponse.ok) {
              const newTemplate = await createResponse.json();
              setTemplateId(newTemplate.template.id);
            } else {
              throw new Error('Failed to create default template');
            }
          }
        } else {
          throw new Error('Failed to fetch templates');
        }
      } catch (error) {
        console.error('Error initializing template:', error);
        setError('Failed to initialize availability system. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeTemplate();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-xl">Loading availability schedules...</div>
        </div>
      </div>
    );
  }

  if (error || !templateId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Availability System</h2>
            <p className="text-red-700">{error || 'Failed to initialize template system'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Availability Schedules</h1>
          <p className="text-gray-600">
            Manage your availability with flexible scheduling patterns. Create simple weekly schedules or complex multi-week patterns.
          </p>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center space-x-3 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Date Ranges</h3>
            </div>
            <p className="text-sm text-gray-600">
              Set start and end dates for each schedule - no separate assignment needed.
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center space-x-3 mb-2">
              <Clock className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold">Multi-Week Patterns</h3>
            </div>
            <p className="text-sm text-gray-600">
              Create complex patterns like &ldquo;every other weekend&rdquo; with different hours each week.
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center space-x-3 mb-2">
              <Settings className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold">Visual Scheduling</h3>
            </div>
            <p className="text-sm text-gray-600">
              Click days to toggle availability and set different hours for each day.
            </p>
          </div>
        </div>

        {/* Main Availability Editor */}
        <div className="bg-white rounded-lg border shadow-sm">
          <AdvancedAvailabilityEditor 
            templateId={templateId}
            onScheduleChange={() => {
              // Handle any refresh logic here
              console.log('Schedule updated');
            }}
          />
        </div>
      </div>
    </div>
  );
}