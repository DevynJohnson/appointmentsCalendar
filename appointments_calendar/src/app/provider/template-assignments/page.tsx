'use client';

import React, { useState, useEffect } from 'react';
import { secureFetch } from '@/lib/csrf';

interface Template {
  id: string;
  name: string;
  isDefault: boolean;
}

interface Assignment {
  id: string;
  templateId: string;
  startDate: string;
  endDate: string | null;
  template: {
    name: string;
  };
}

export default function TemplateAssignmentsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewAssignmentForm, setShowNewAssignmentForm] = useState(false);

  const [assignmentForm, setAssignmentForm] = useState({
    templateId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesResponse, assignmentsResponse] = await Promise.all([
        fetch('/api/provider/availability/templates', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('providerToken')}`
          }
        }),
        fetch('/api/provider/availability/assignments', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('providerToken')}`
          }
        })
      ]);
      
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData.templates || []);
      }
      
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        setAssignments(assignmentsData.assignments || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async () => {
    if (!assignmentForm.templateId || !assignmentForm.startDate || !assignmentForm.endDate) {
      alert('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const response = await secureFetch('/api/provider/availability/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('providerToken')}`
        },
        body: JSON.stringify({
          templateId: assignmentForm.templateId,
          startDate: assignmentForm.startDate,
          endDate: assignmentForm.endDate
        })
      });

      if (response.ok) {
        await loadData();
        setShowNewAssignmentForm(false);
        setAssignmentForm({ templateId: '', startDate: '', endDate: '' });
      } else {
        const error = await response.json();
        alert(`Error creating assignment: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Error creating assignment');
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const response = await secureFetch(`/api/provider/availability/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('providerToken')}`
        }
      });

      if (response.ok) {
        await loadData();
      } else {
        const error = await response.json();
        alert(`Error deleting assignment: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Error deleting assignment');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <div className="text-xl">Loading template assignments...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Template Assignments</h1>
        <p className="text-gray-600">Assign templates to specific date ranges for seasonal schedules</p>
      </div>

      {/* Current Assignments */}
      <div className="bg-white rounded-lg border shadow-sm mb-6">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Current Assignments</h2>
            <button
              onClick={() => setShowNewAssignmentForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              disabled={templates.length === 0}
            >
              + New Assignment
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {assignments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No template assignments found.</p>
              <p className="text-sm text-gray-400">
                Templates are automatically active unless overridden by specific date assignments.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map(assignment => (
                <div key={assignment.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{assignment.template.name}</h3>
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                          <span>📅 Start: {formatDate(assignment.startDate)}</span>
                          <span>📅 End: {assignment.endDate ? formatDate(assignment.endDate) : 'Indefinite'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteAssignment(assignment.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
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

      {/* Assignment Form */}
      {showNewAssignmentForm && (
        <div className="bg-white rounded-lg border shadow-sm mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Create New Assignment</h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template</label>
                <select
                  value={assignmentForm.templateId}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, templateId: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select a template</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} {template.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="date"
                    value={assignmentForm.startDate}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <input
                    type="date"
                    value={assignmentForm.endDate}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">Leave empty for indefinite assignment</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={createAssignment}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Assignment'}
              </button>
              <button
                onClick={() => {
                  setShowNewAssignmentForm(false);
                  setAssignmentForm({ templateId: '', startDate: '', endDate: '' });
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Information */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">How Template Assignments Work</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>• <strong>Default Template:</strong> Active for all dates unless overridden by a specific assignment</p>
          <p>• <strong>Date-Specific Assignments:</strong> Override the default template for specific date ranges</p>
          <p>• <strong>Overlapping Assignments:</strong> More recent assignments take precedence</p>
          <p>• <strong>Indefinite Assignments:</strong> Continue until manually ended or overridden</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-6 text-center">
        <a 
          href="/provider/availability-templates"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Availability Templates
        </a>
      </div>
    </div>
  );
}