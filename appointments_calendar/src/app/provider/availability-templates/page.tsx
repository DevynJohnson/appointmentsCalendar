'use client';

import React, { useState, useEffect } from 'react';
import { DAYS_OF_WEEK } from '@/types/availability';
import { secureFetch } from '@/lib/csrf';
import { COMMON_TIMEZONES, formatTimezoneWithTime } from '@/lib/timezones';

interface AvailabilityTemplate {
  id: string;
  name: string;
  timezone: string;
  isDefault: boolean;
  isActive: boolean;
  timeSlots: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isEnabled: boolean;
  }>;
  assignments: Array<{
    id: string;
    startDate: string;
    endDate: string | null;
  }>;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  isEnabled: boolean;
}

interface DaySchedule {
  dayOfWeek: number;
  dayName: string;
  isEnabled: boolean;
  timeSlots: TimeSlot[];
}

interface TemplateForm {
  name: string;
  timezone: string;
  isDefault: boolean;
  weeklySchedule: DaySchedule[];
}

export default function AvailabilityTemplatesPage() {
  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [allowedDurations, setAllowedDurations] = useState<number[]>([15, 30, 45, 60, 90]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);

  // Form state for creating/editing templates
  const [templateForm, setTemplateForm] = useState<TemplateForm>({
    name: '',
    timezone: 'America/New_York', // Default to Eastern Time
    isDefault: false,
    weeklySchedule: DAYS_OF_WEEK.map(day => ({
      dayOfWeek: day.value,
      dayName: day.name,
      isEnabled: day.value >= 1 && day.value <= 5, // Mon-Fri default
      timeSlots: [{
        startTime: '08:00',
        endTime: '18:00',
        isEnabled: true
      }]
    }))
  });

  // Load templates and durations
  useEffect(() => {
    loadTemplates();
    loadAllowedDurations();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/provider/availability/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('providerToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllowedDurations = async () => {
    try {
      const response = await fetch('/api/provider/availability/durations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('providerToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllowedDurations(data.allowedDurations || [15, 30, 45, 60, 90]);
      }
    } catch (error) {
      console.error('Error loading durations:', error);
    }
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      const response = await secureFetch('/api/provider/availability/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('providerToken')}`
        },
        body: JSON.stringify({
          templateId: editingTemplate,
          templateName: templateForm.name,
          timezone: templateForm.timezone,
          isDefault: templateForm.isDefault,
          weeklySchedule: templateForm.weeklySchedule,
          allowedDurations
        })
      });

      if (response.ok) {
        await loadTemplates();
        setShowNewTemplateForm(false);
        setEditingTemplate(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(`Error saving template: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await secureFetch(`/api/provider/availability/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('providerToken')}`
        }
      });

      if (response.ok) {
        await loadTemplates();
      } else {
        const error = await response.json();
        alert(`Error deleting template: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template');
    }
  };

  const setDefaultTemplate = async (templateId: string) => {
    try {
      const response = await secureFetch(`/api/provider/availability/templates/${templateId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('providerToken')}`
        },
        body: JSON.stringify({ action: 'setDefault' })
      });

      if (response.ok) {
        await loadTemplates();
      } else {
        const error = await response.json();
        alert(`Error setting default template: ${error.error}`);
      }
    } catch (error) {
      console.error('Error setting default template:', error);
      alert('Error setting default template');
    }
  };

  const editTemplate = (template: AvailabilityTemplate) => {
    setEditingTemplate(template.id);
    setTemplateForm({
      name: template.name,
      timezone: template.timezone || 'America/New_York', // Fallback for existing templates
      isDefault: template.isDefault,
      weeklySchedule: DAYS_OF_WEEK.map(day => {
        const daySlots = template.timeSlots.filter(slot => slot.dayOfWeek === day.value);
        return {
          dayOfWeek: day.value,
          dayName: day.name,
          isEnabled: daySlots.length > 0 && daySlots.some(slot => slot.isEnabled),
          timeSlots: daySlots.length > 0 
            ? daySlots.map(slot => ({
                startTime: slot.startTime,
                endTime: slot.endTime,
                isEnabled: slot.isEnabled
              }))
            : [{
                startTime: '08:00',
                endTime: '18:00',
                isEnabled: true
              }]
        };
      })
    });
    setShowNewTemplateForm(true);
  };

  const resetForm = () => {
    setTemplateForm({
      name: '',
      timezone: 'America/New_York', // Default to Eastern Time
      isDefault: false,
      weeklySchedule: DAYS_OF_WEEK.map(day => ({
        dayOfWeek: day.value,
        dayName: day.name,
        isEnabled: day.value >= 1 && day.value <= 5,
        timeSlots: [{
          startTime: '08:00',
          endTime: '18:00',
          isEnabled: true
        }]
      }))
    });
  };

  const updateDaySchedule = (dayIndex: number, updates: Partial<DaySchedule>) => {
    setTemplateForm(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, index) => 
        index === dayIndex ? { ...day, ...updates } : day
      )
    }));
  };

  const addTimeSlot = (dayIndex: number) => {
    setTemplateForm(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, index) => 
        index === dayIndex 
          ? {
              ...day,
              timeSlots: [...day.timeSlots, {
                startTime: '09:00',
                endTime: '17:00',
                isEnabled: true
              }]
            }
          : day
      )
    }));
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    setTemplateForm(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, index) => 
        index === dayIndex 
          ? {
              ...day,
              timeSlots: day.timeSlots.filter((_, sIndex) => sIndex !== slotIndex)
            }
          : day
      )
    }));
  };

  const updateTimeSlot = (dayIndex: number, slotIndex: number, updates: Partial<TimeSlot>) => {
    setTemplateForm(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, index) => 
        index === dayIndex 
          ? {
              ...day,
              timeSlots: day.timeSlots.map((slot, sIndex) => 
                sIndex === slotIndex ? { ...slot, ...updates } : slot
              )
            }
          : day
      )
    }));
  };

  const saveDurations = async () => {
    try {
      const response = await secureFetch('/api/provider/availability/durations', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('providerToken')}`
        },
        body: JSON.stringify({ allowedDurations })
      });

      if (response.ok) {
        alert('Allowed durations updated successfully');
      } else {
        const error = await response.json();
        alert(`Error updating durations: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving durations:', error);
      alert('Error saving durations');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <div className="text-xl">Loading availability templates...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Availability Templates</h1>
        <p className="text-gray-600">Manage your schedule templates and appointment durations</p>
        <div className="mt-3">
          <a 
            href="/provider/template-assignments"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            📅 Manage Template Assignments →
          </a>
        </div>
      </div>

      {/* Templates List */}
      <div className="bg-white rounded-lg border shadow-sm mb-6">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Templates</h2>
            <button
              onClick={() => {
                resetForm();
                setEditingTemplate(null);
                setShowNewTemplateForm(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + New Template
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {templates.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No templates found. Create your first template to get started.</p>
          ) : (
            <div className="space-y-4">
              {templates.map(template => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{template.name}</h3>
                        {template.isDefault && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                            Default
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Timezone:</span> {formatTimezoneWithTime(template.timezone || 'America/New_York')}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        Active days: {DAYS_OF_WEEK
                          .filter(day => template.timeSlots.some(slot => 
                            slot.dayOfWeek === day.value && slot.isEnabled
                          ))
                          .map(day => day.short)
                          .join(', ')
                        }
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {template.timeSlots.length} time slot{template.timeSlots.length !== 1 ? 's' : ''} configured
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => editTemplate(template)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      {!template.isDefault && (
                        <>
                          <button
                            onClick={() => setDefaultTemplate(template.id)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Set Default
                          </button>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Form */}
      {showNewTemplateForm && (
        <div className="bg-white rounded-lg border shadow-sm mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h2>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Template Name</label>
              <input
                type="text"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Default Schedule, Summer Hours"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Timezone</label>
              <select
                value={templateForm.timezone}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full border rounded px-3 py-2 bg-white"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {formatTimezoneWithTime(tz.value)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-1">
                This timezone will be used for all appointment times in this template
              </p>
            </div>

            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={templateForm.isDefault}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Set as default template</span>
              </label>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Weekly Schedule</h3>
              <div className="space-y-6">
                {templateForm.weeklySchedule.map((day, dayIndex) => (
                  <div key={day.dayOfWeek} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={day.isEnabled}
                          onChange={(e) => updateDaySchedule(dayIndex, { isEnabled: e.target.checked })}
                          className="mr-3"
                        />
                        <h4 className="text-lg font-medium">{day.dayName}</h4>
                      </div>
                      {day.isEnabled && (
                        <button
                          onClick={() => addTimeSlot(dayIndex)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          + Add Time Slot
                        </button>
                      )}
                    </div>

                    {day.isEnabled && (
                      <div className="space-y-3">
                        {day.timeSlots.map((slot, slotIndex) => (
                          <div key={slotIndex} className="flex items-center gap-3 bg-gray-50 p-3 rounded">
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateTimeSlot(dayIndex, slotIndex, { startTime: e.target.value })}
                              className="border rounded px-2 py-1"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateTimeSlot(dayIndex, slotIndex, { endTime: e.target.value })}
                              className="border rounded px-2 py-1"
                            />
                            <label className="flex items-center ml-4">
                              <input
                                type="checkbox"
                                checked={slot.isEnabled}
                                onChange={(e) => updateTimeSlot(dayIndex, slotIndex, { isEnabled: e.target.checked })}
                                className="mr-2"
                              />
                              <span className="text-sm">Enabled</span>
                            </label>
                            {day.timeSlots.length > 1 && (
                              <button
                                onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                                className="text-red-600 hover:text-red-800 text-sm ml-auto"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveTemplate}
                disabled={saving || !templateForm.name.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
              </button>
              <button
                onClick={() => {
                  setShowNewTemplateForm(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allowed Durations */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Allowed Appointment Durations</h2>
          <p className="text-gray-600 text-sm mt-1">Configure which appointment lengths customers can book</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
            {[15, 30, 45, 60, 90, 120].map(duration => (
              <label key={duration} className="flex items-center">
                <input
                  type="checkbox"
                  checked={allowedDurations.includes(duration)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAllowedDurations(prev => [...prev, duration].sort((a, b) => a - b));
                    } else {
                      setAllowedDurations(prev => prev.filter(d => d !== duration));
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">{duration} min</span>
              </label>
            ))}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Custom Durations (minutes, comma-separated)</label>
            <input
              type="text"
              placeholder="e.g., 25, 75, 105"
              className="w-full border rounded px-3 py-2"
              onBlur={(e) => {
                const customDurations = e.target.value
                  .split(',')
                  .map(d => parseInt(d.trim()))
                  .filter(d => !isNaN(d) && d > 0);
                
                setAllowedDurations(prev => 
                  [...new Set([...prev, ...customDurations])].sort((a, b) => a - b)
                );
              }}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Current durations: {allowedDurations.join(', ')} minutes
            </div>
            <button
              onClick={saveDurations}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Save Durations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}