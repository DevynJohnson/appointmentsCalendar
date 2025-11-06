'use client';

import { useState } from 'react';
import { LocationSchedule, ScheduleFormData, RecurrenceType, RECURRENCE_TYPE_LABELS, DAYS_OF_WEEK } from '@/types/location';

interface LocationSchedulesProps {
  schedules: LocationSchedule[];
  onScheduleAdd: (schedule: Omit<LocationSchedule, 'id' | 'locationId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onScheduleEdit: (id: string, schedule: Partial<LocationSchedule>) => Promise<void>;
  onScheduleDelete: (id: string) => Promise<void>;
}

const defaultScheduleForm: ScheduleFormData = {
  startDate: '',
  endDate: '',
  isRecurring: false,
  recurrenceType: RecurrenceType.WEEKLY,
  recurrenceInterval: 1,
  daysOfWeek: [],
  weekOfMonth: undefined,
  monthOfYear: undefined,
  recurrenceEndDate: '',
  occurrenceCount: undefined,
  endType: 'never'
};

export default function LocationSchedules({ 
  schedules, 
  onScheduleAdd, 
  onScheduleEdit, 
  onScheduleDelete 
}: LocationSchedulesProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>(defaultScheduleForm);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const scheduleData = {
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        isRecurring: formData.isRecurring,
        recurrenceType: formData.isRecurring ? formData.recurrenceType : undefined,
        recurrenceInterval: formData.isRecurring ? formData.recurrenceInterval : undefined,
        daysOfWeek: formData.isRecurring ? formData.daysOfWeek : [],
        weekOfMonth: formData.weekOfMonth,
        monthOfYear: formData.monthOfYear,
        recurrenceEndDate: formData.endType === 'date' ? formData.recurrenceEndDate : undefined,
        occurrenceCount: formData.endType === 'count' ? formData.occurrenceCount : undefined,
        isActive: true
      };

      if (editingId) {
        await onScheduleEdit(editingId, scheduleData);
      } else {
        await onScheduleAdd(scheduleData);
      }

      handleCancel();
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (schedule: LocationSchedule) => {
    setFormData({
      startDate: schedule.startDate.split('T')[0],
      endDate: schedule.endDate ? schedule.endDate.split('T')[0] : '',
      isRecurring: schedule.isRecurring,
      recurrenceType: schedule.recurrenceType || RecurrenceType.WEEKLY,
      recurrenceInterval: schedule.recurrenceInterval || 1,
      daysOfWeek: schedule.daysOfWeek || [],
      weekOfMonth: schedule.weekOfMonth,
      monthOfYear: schedule.monthOfYear,
      recurrenceEndDate: schedule.recurrenceEndDate ? schedule.recurrenceEndDate.split('T')[0] : '',
      occurrenceCount: schedule.occurrenceCount,
      endType: schedule.recurrenceEndDate ? 'date' : schedule.occurrenceCount ? 'count' : 'never'
    });
    setEditingId(schedule.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData(defaultScheduleForm);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort()
    }));
  };

  const formatScheduleDisplay = (schedule: LocationSchedule) => {
    const startDate = new Date(schedule.startDate).toLocaleDateString();
    const endDate = schedule.endDate ? new Date(schedule.endDate).toLocaleDateString() : 'Ongoing';
    
    let display = `${startDate} - ${endDate}`;
    
    if (schedule.isRecurring && schedule.recurrenceType) {
      const interval = schedule.recurrenceInterval || 1;
      const type = RECURRENCE_TYPE_LABELS[schedule.recurrenceType];
      
      if (interval > 1) {
        display += ` (Every ${interval} ${type.toLowerCase()})`;
      } else {
        display += ` (${type})`;
      }
      
      if (schedule.daysOfWeek.length > 0) {
        const dayNames = schedule.daysOfWeek.map(d => DAYS_OF_WEEK[d].short).join(', ');
        display += ` on ${dayNames}`;
      }
    }
    
    return display;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Location Schedules</h3>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
        >
          Add Schedule
        </button>
      </div>

      {/* Help Text for Schedules */}
      <div className="bg-purple-50 rounded-md p-3 border border-purple-200">
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-purple-800">
            <p className="font-medium mb-1">Schedule Tips:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Add multiple schedules for complex patterns (e.g., different seasonal hours)</li>
              <li>Use recurring schedules for regular patterns like &quot;every other Friday&quot;</li>
              <li>Leave end date empty for ongoing schedules</li>
              <li>Inactive schedules won&apos;t show to clients but are preserved for future use</li>
            </ul>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">
            {editingId ? 'Edit Schedule' : 'Add New Schedule'}
          </h4>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Recurring schedule</span>
              </label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                {/* Recurring Help Text */}
                <div className="bg-blue-50 rounded-md p-3 text-xs text-blue-800">
                  <p className="font-medium mb-1">Recurring Schedule Examples:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li><strong>Weekly + Monday/Wednesday:</strong> Every Monday and Wednesday</li>
                    <li><strong>Biweekly + Friday:</strong> Every other Friday</li>
                    <li><strong>Monthly:</strong> Same date each month (e.g., 15th of every month)</li>
                    <li><strong>Quarterly:</strong> Every 3 months (seasonal schedule)</li>
                  </ul>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recurrence Pattern
                    </label>
                    <select
                      value={formData.recurrenceType}
                      onChange={(e) => setFormData(prev => ({ ...prev, recurrenceType: e.target.value as RecurrenceType }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(RECURRENCE_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Every X {formData.recurrenceType.toLowerCase()}(s)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.recurrenceInterval}
                      onChange={(e) => setFormData(prev => ({ ...prev, recurrenceInterval: parseInt(e.target.value) || 1 }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {(formData.recurrenceType === RecurrenceType.WEEKLY || formData.recurrenceType === RecurrenceType.BIWEEKLY) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Days of the week
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => handleDayToggle(day.value)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            formData.daysOfWeek.includes(day.value)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {day.short}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recurrence ends
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="endType"
                        value="never"
                        checked={formData.endType === 'never'}
                        onChange={(e) => setFormData(prev => ({ ...prev, endType: e.target.value as 'never' }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Never</span>
                      <span className="text-xs text-gray-500">(ongoing schedule)</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="endType"
                        value="date"
                        checked={formData.endType === 'date'}
                        onChange={(e) => setFormData(prev => ({ ...prev, endType: e.target.value as 'date' }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">On date:</span>
                      <input
                        type="date"
                        value={formData.recurrenceEndDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, recurrenceEndDate: e.target.value }))}
                        disabled={formData.endType !== 'date'}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      />
                      <span className="text-xs text-gray-500">(ends on specific date)</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="endType"
                        value="count"
                        checked={formData.endType === 'count'}
                        onChange={(e) => setFormData(prev => ({ ...prev, endType: e.target.value as 'count' }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">After:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.occurrenceCount || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, occurrenceCount: parseInt(e.target.value) || undefined }))}
                        disabled={formData.endType !== 'count'}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      />
                      <span className="text-sm text-gray-700">occurrences</span>
                      <span className="text-xs text-gray-500">(e.g., next 10 sessions)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tips for recurring schedules */}
            {formData.isRecurring && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  💡 Recurring Schedule Examples
                </h4>
                <div className="text-sm text-blue-800 space-y-1">
                  {formData.recurrenceType === RecurrenceType.WEEKLY && (
                    <>
                      <div><strong>Weekly:</strong> Perfect for regular therapy sessions or classes</div>
                      <div className="text-blue-600">• Every Monday at 9:00 AM</div>
                      <div className="text-blue-600">• Every Tuesday & Thursday afternoon</div>
                    </>
                  )}
                  {formData.recurrenceType === RecurrenceType.BIWEEKLY && (
                    <>
                      <div><strong>Bi-weekly:</strong> Great for follow-up appointments</div>
                      <div className="text-blue-600">• Every other Friday for 6 months</div>
                      <div className="text-blue-600">• Every 2 weeks for maintenance sessions</div>
                    </>
                  )}
                  {formData.recurrenceType === RecurrenceType.MONTHLY && (
                    <>
                      <div><strong>Monthly:</strong> Ideal for routine check-ups</div>
                      <div className="text-blue-600">• First Tuesday of each month</div>
                      <div className="text-blue-600">• Monthly wellness visits</div>
                    </>
                  )}
                  {formData.recurrenceType === RecurrenceType.CUSTOM && (
                    <>
                      <div><strong>Custom:</strong> Flexible for any unique pattern</div>
                      <div className="text-blue-600">• Every 3 days for intensive therapy</div>
                      <div className="text-blue-600">• Every 10 days for specialized treatment</div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? 'Saving...' : (editingId ? 'Update Schedule' : 'Add Schedule')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {schedules.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No schedules added yet.</p>
        ) : (
          schedules.map((schedule) => (
            <div key={schedule.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
              <div>
                <div className="font-medium text-gray-900">
                  {formatScheduleDisplay(schedule)}
                </div>
                {!schedule.isActive && (
                  <span className="text-xs text-red-600">Inactive</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(schedule)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => onScheduleDelete(schedule.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}