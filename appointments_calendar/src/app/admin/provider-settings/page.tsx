'use client';

import React, { useState } from 'react';

interface TestSlot {
  startTime: string;
  duration: number;
  type: string;
  eventTitle: string;
}

interface TestResults {
  totalSlots: number;
  mode: string;
  autoSlots: number;
  manualSlots: number;
  slots: TestSlot[];
  error?: string;
}

export default function ProviderSettings() {
  const [settings, setSettings] = useState({
    businessHours: {
      start: '09:00',
      end: '17:00',
    },
    workingDays: [1, 2, 3, 4, 5], // Mon-Fri
    includeWeekends: false,
    defaultBookingDuration: 60,
    bufferTime: 15,
    autoAvailabilityEnabled: true,
  });

  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [loading, setLoading] = useState(false);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleWorkingDayToggle = (dayIndex: number) => {
    setSettings(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(dayIndex)
        ? prev.workingDays.filter(d => d !== dayIndex)
        : [...prev.workingDays, dayIndex].sort()
    }));
  };

  const testAutoAvailability = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        providerId: 'cmek2qbli0000zy18bh84zbwm',
        mode: 'auto',
        daysAhead: '7',
      });

      const response = await fetch(`/api/client/open-slots-v2?${params}`);
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({ 
        error: 'Test failed',
        totalSlots: 0,
        mode: 'auto',
        autoSlots: 0,
        manualSlots: 0,
        slots: []
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Provider Availability Settings</h1>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settings Panel */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Automatic Availability</h2>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.autoAvailabilityEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoAvailabilityEnabled: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="font-medium">Enable Automatic Availability</span>
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Generate appointment slots automatically during business hours when calendar is free
                </p>
              </div>

              {settings.autoAvailabilityEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Business Hours</label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="time"
                        value={settings.businessHours.start}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          businessHours: { ...prev.businessHours, start: e.target.value }
                        }))}
                        className="px-3 py-2 border rounded-md"
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={settings.businessHours.end}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          businessHours: { ...prev.businessHours, end: e.target.value }
                        }))}
                        className="px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Working Days</label>
                    <div className="flex gap-2">
                      {dayNames.map((day, index) => (
                        <label key={index} className="flex flex-col items-center">
                          <input
                            type="checkbox"
                            checked={settings.workingDays.includes(index)}
                            onChange={() => handleWorkingDayToggle(index)}
                            className="mb-1"
                          />
                          <span className="text-xs">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Default Slot Duration</label>
                      <select
                        value={settings.defaultBookingDuration}
                        onChange={(e) => setSettings(prev => ({ ...prev, defaultBookingDuration: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>1.5 hours</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Buffer Time</label>
                      <select
                        value={settings.bufferTime}
                        onChange={(e) => setSettings(prev => ({ ...prev, bufferTime: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value={0}>No buffer</option>
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Test Availability</h2>
            <p className="text-sm text-gray-600 mb-4">
              Test the automatic availability system with current settings
            </p>
            <button
              onClick={testAutoAvailability}
              disabled={loading || !settings.autoAvailabilityEnabled}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Next 7 Days'}
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          
          {!testResults ? (
            <p className="text-gray-500">Click &quot;Test Next 7 Days&quot; to see available slots</p>
          ) : testResults.error ? (
            <p className="text-red-600">Error: {testResults.error}</p>
          ) : (
            <div>
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm">
                  <strong>Total Slots:</strong> {testResults.totalSlots}<br />
                  <strong>Mode:</strong> {testResults.mode}<br />
                  <strong>Auto Slots:</strong> {testResults.autoSlots}<br />
                  <strong>Manual Slots:</strong> {testResults.manualSlots}
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {testResults.slots?.length > 0 ? (
                  <div className="space-y-2">
                    {testResults.slots.slice(0, 10).map((slot: TestSlot, index: number) => (
                      <div key={index} className="p-2 border rounded text-sm">
                        <div className="font-medium">
                          {new Date(slot.startTime).toLocaleDateString()} {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-gray-600">
                          {slot.duration} min • {slot.type} • {slot.eventTitle}
                        </div>
                      </div>
                    ))}
                    {testResults.slots.length > 10 && (
                      <p className="text-xs text-gray-500 text-center">
                        ... and {testResults.slots.length - 10} more slots
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No available slots found</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">How It Works</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Automatic Mode:</strong> Generates appointment slots during business hours when your calendar is free</li>
          <li>• <strong>Manual Mode:</strong> Only shows slots from calendar events you specifically enabled for booking</li>
          <li>• <strong>Both Mode:</strong> Combines automatic availability with manual events</li>
          <li>• <strong>Smart Scheduling:</strong> Automatically avoids conflicts with existing calendar events and bookings</li>
        </ul>
        
        <div className="mt-4">
          <a 
            href="/client/dashboard" 
            target="_blank"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-3"
          >
            Test Client View →
          </a>
          <a 
            href="/admin/event-settings" 
            className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Manual Event Settings →
          </a>
        </div>
      </div>
    </div>
  );
}
