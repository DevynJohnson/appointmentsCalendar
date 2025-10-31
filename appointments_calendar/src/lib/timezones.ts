/**
 * Common timezone options for providers
 * Organized by region for better UX
 */

export interface TimezoneOption {
  value: string; // IANA timezone identifier
  label: string; // Display name
  offset: string; // UTC offset for current time
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  // US Timezones
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: 'UTC-5/-4' },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: 'UTC-6/-5' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: 'UTC-7/-6' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)', offset: 'UTC-7' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'UTC-8/-7' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)', offset: 'UTC-9/-8' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', offset: 'UTC-10' },
  
  // Canadian Timezones
  { value: 'America/St_Johns', label: 'Newfoundland Time (NT)', offset: 'UTC-3.5/-2.5' },
  { value: 'America/Halifax', label: 'Atlantic Time (AT)', offset: 'UTC-4/-3' },
  { value: 'America/Toronto', label: 'Eastern Time - Toronto', offset: 'UTC-5/-4' },
  { value: 'America/Winnipeg', label: 'Central Time - Winnipeg', offset: 'UTC-6/-5' },
  { value: 'America/Edmonton', label: 'Mountain Time - Edmonton', offset: 'UTC-7/-6' },
  { value: 'America/Vancouver', label: 'Pacific Time - Vancouver', offset: 'UTC-8/-7' },
  
  // European Timezones
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: 'UTC+0/+1' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)', offset: 'UTC+1/+2' },
  { value: 'Europe/Berlin', label: 'Central European Time - Germany', offset: 'UTC+1/+2' },
  { value: 'Europe/Rome', label: 'Central European Time - Italy', offset: 'UTC+1/+2' },
  { value: 'Europe/Madrid', label: 'Central European Time - Spain', offset: 'UTC+1/+2' },
  { value: 'Europe/Amsterdam', label: 'Central European Time - Netherlands', offset: 'UTC+1/+2' },
  { value: 'Europe/Stockholm', label: 'Central European Time - Sweden', offset: 'UTC+1/+2' },
  { value: 'Europe/Moscow', label: 'Moscow Time (MSK)', offset: 'UTC+3' },
  
  // Asia-Pacific Timezones
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: 'UTC+9' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)', offset: 'UTC+8' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (HKT)', offset: 'UTC+8' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)', offset: 'UTC+8' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time (KST)', offset: 'UTC+9' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)', offset: 'UTC+5:30' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)', offset: 'UTC+4' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)', offset: 'UTC+10/+11' },
  { value: 'Australia/Melbourne', label: 'Australian Eastern Time - Melbourne', offset: 'UTC+10/+11' },
  { value: 'Australia/Perth', label: 'Australian Western Time (AWT)', offset: 'UTC+8' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time (NZST)', offset: 'UTC+12/+13' },
  
  // South American Timezones
  { value: 'America/Sao_Paulo', label: 'Brasília Time (BRT)', offset: 'UTC-3/-2' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina Time (ART)', offset: 'UTC-3' },
  { value: 'America/Santiago', label: 'Chile Time (CLT)', offset: 'UTC-4/-3' },
  { value: 'America/Lima', label: 'Peru Time (PET)', offset: 'UTC-5' },
  { value: 'America/Bogota', label: 'Colombia Time (COT)', offset: 'UTC-5' },
  
  // African Timezones
  { value: 'Africa/Cairo', label: 'Eastern European Time - Egypt', offset: 'UTC+2' },
  { value: 'Africa/Johannesburg', label: 'South Africa Standard Time', offset: 'UTC+2' },
  { value: 'Africa/Lagos', label: 'West Africa Time (WAT)', offset: 'UTC+1' },
  { value: 'Africa/Nairobi', label: 'East Africa Time (EAT)', offset: 'UTC+3' },
];

/**
 * Get current UTC offset for a timezone
 */
export function getCurrentOffset(timezone: string): string {
  try {
    const offset = getTimezoneOffset(timezone) / 60;
    
    const sign = offset >= 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(offset));
    const minutes = Math.abs(offset) % 1 * 60;
    
    if (minutes === 0) {
      return `UTC${sign}${hours}`;
    } else {
      return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
    }
  } catch {
    return 'UTC';
  }
}

/**
 * Get timezone offset in minutes
 */
function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const target = new Date(utc.toLocaleString("en-US", { timeZone: timezone }));
    return (target.getTime() - utc.getTime()) / (1000 * 60);
  } catch {
    return 0;
  }
}

/**
 * Format timezone for display with current local time
 */
export function formatTimezoneWithTime(timezone: string): string {
  try {
    const now = new Date();
    const timeInZone = now.toLocaleString("en-US", { 
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const option = COMMON_TIMEZONES.find(tz => tz.value === timezone);
    const label = option ? option.label : timezone;
    
    return `${label} (${timeInZone})`;
  } catch {
    return timezone;
  }
}