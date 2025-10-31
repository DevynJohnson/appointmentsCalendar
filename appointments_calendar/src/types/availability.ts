// Availability management types and utilities

// Base types (will be replaced by Prisma-generated types after migration)
export interface AvailabilityTemplate {
  id: string;
  providerId: string;
  name: string;
  timezone: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilityTimeSlot {
  id: string;
  templateId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateAssignment {
  id: string;
  templateId: string;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilityTemplateWithSlots extends AvailabilityTemplate {
  timeSlots: AvailabilityTimeSlot[];
  assignments: TemplateAssignment[];
}

export interface DayAvailability {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string;
  isEnabled: boolean;
  timeSlots: TimeSlot[];
}

export interface TimeSlot {
  id?: string;
  startTime: string; // Format: "HH:MM"
  endTime: string;   // Format: "HH:MM"
  isEnabled: boolean;
}

export interface AvailabilitySettings {
  templateId?: string;
  templateName: string;
  timezone: string;
  isDefault: boolean;
  allowedDurations: number[]; // Available appointment durations in minutes
  customDuration?: number;    // Custom duration if not in allowed list
  weeklySchedule: DayAvailability[];
}

export interface TemplateAssignmentPeriod {
  templateId: string;
  templateName: string;
  startDate: Date;
  endDate: Date | null; // null = indefinite
}

// Day of week constants
export const DAYS_OF_WEEK = [
  { value: 0, name: 'Sunday', short: 'Sun' },
  { value: 1, name: 'Monday', short: 'Mon' },
  { value: 2, name: 'Tuesday', short: 'Tue' },
  { value: 3, name: 'Wednesday', short: 'Wed' },
  { value: 4, name: 'Thursday', short: 'Thu' },
  { value: 5, name: 'Friday', short: 'Fri' },
  { value: 6, name: 'Saturday', short: 'Sat' },
] as const;

// Default availability settings (Monday-Friday, 8am-6pm)
export const DEFAULT_AVAILABILITY: Omit<AvailabilitySettings, 'templateId'> = {
  templateName: 'Default Schedule',
  timezone: 'America/New_York',
  isDefault: true,
  allowedDurations: [15, 30, 45, 60, 90],
  weeklySchedule: DAYS_OF_WEEK.map(day => ({
    dayOfWeek: day.value,
    dayName: day.name,
    isEnabled: day.value >= 1 && day.value <= 5, // Monday-Friday only
    timeSlots: day.value >= 1 && day.value <= 5 ? [
      {
        startTime: '08:00',
        endTime: '18:00',
        isEnabled: true,
      }
    ] : [],
  })),
};

// Time utilities
export const timeStringToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const isTimeSlotValid = (startTime: string, endTime: string): boolean => {
  const startMinutes = timeStringToMinutes(startTime);
  const endMinutes = timeStringToMinutes(endTime);
  return startMinutes < endMinutes;
};

// Generate time options for dropdowns (15-minute intervals)
export const generateTimeOptions = (): Array<{ value: string; label: string }> => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = minutesToTimeString(hour * 60 + minute);
      const displayTime = new Date(`2000-01-01T${timeString}:00`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      options.push({
        value: timeString,
        label: displayTime,
      });
    }
  }
  return options;
};

// Check if a provider is available on a specific date and time
export const isProviderAvailable = (
  template: AvailabilityTemplateWithSlots,
  date: Date,
  startTime: string,
  duration: number
): boolean => {
  const dayOfWeek = date.getDay();
  const endTime = minutesToTimeString(timeStringToMinutes(startTime) + duration);
  
  // Find matching time slots for this day
  const daySlots = template.timeSlots.filter(
    slot => slot.dayOfWeek === dayOfWeek && slot.isEnabled
  );
  
  if (daySlots.length === 0) {
    return false; // No availability on this day
  }
  
  // Check if the requested time falls within any available slot
  const requestedStart = timeStringToMinutes(startTime);
  const requestedEnd = timeStringToMinutes(endTime);
  
  return daySlots.some(slot => {
    const slotStart = timeStringToMinutes(slot.startTime);
    const slotEnd = timeStringToMinutes(slot.endTime);
    
    return requestedStart >= slotStart && requestedEnd <= slotEnd;
  });
};

// Get active template for a specific date
export const getActiveTemplate = (
  templates: AvailabilityTemplateWithSlots[],
  date: Date
): AvailabilityTemplateWithSlots | null => {
  // Find templates with assignments that cover this date
  const applicableTemplates = templates.filter(template => 
    template.assignments.some(assignment => {
      const startDate = new Date(assignment.startDate);
      const endDate = assignment.endDate ? new Date(assignment.endDate) : null;
      
      return date >= startDate && (endDate === null || date <= endDate);
    })
  );
  
  if (applicableTemplates.length === 0) {
    // No specific assignment, use default template
    return templates.find(t => t.isDefault) || null;
  }
  
  // If multiple templates apply, use the most recent one
  return applicableTemplates.sort((a, b) => {
    const aLatestStart = Math.max(...a.assignments.map(ass => new Date(ass.startDate).getTime()));
    const bLatestStart = Math.max(...b.assignments.map(ass => new Date(ass.startDate).getTime()));
    return bLatestStart - aLatestStart;
  })[0];
};

// Duration options for appointment booking
export const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1 hour 30 minutes' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
] as const;

export const getDurationLabel = (minutes: number): string => {
  const option = DURATION_OPTIONS.find(opt => opt.value === minutes);
  if (option) return option.label;
  
  if (minutes < 60) {
    return `${minutes} minutes`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
    }
  }
};