import { prisma } from '@/lib/db';
import type { AvailabilitySchedule } from '@prisma/client';

export interface AvailabilityScheduleInput {
  name: string;
  startDate: Date;
  endDate?: Date;
  isRecurring: boolean;
  recurrenceType?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  recurrenceInterval?: number;
  daysOfWeek?: number[];
  weekOfMonth?: number;
  monthOfYear?: number;
  recurrenceEndDate?: Date;
  occurrenceCount?: number;
  priority?: number;
  timeSlots: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isEnabled?: boolean;
  }[];
}

export class AdvancedAvailabilityService {
  
  /**
   * Create a new availability schedule for a template
   */
  static async createSchedule(templateId: string, scheduleData: AvailabilityScheduleInput) {
    return await prisma.availabilitySchedule.create({
      data: {
        templateId,
        name: scheduleData.name,
        startDate: scheduleData.startDate,
        endDate: scheduleData.endDate,
        isRecurring: scheduleData.isRecurring,
        recurrenceType: scheduleData.recurrenceType,
        recurrenceInterval: scheduleData.recurrenceInterval,
        daysOfWeek: scheduleData.daysOfWeek || [],
        weekOfMonth: scheduleData.weekOfMonth,
        monthOfYear: scheduleData.monthOfYear,
        recurrenceEndDate: scheduleData.recurrenceEndDate,
        occurrenceCount: scheduleData.occurrenceCount,
        priority: scheduleData.priority || 0,
        timeSlots: {
          create: scheduleData.timeSlots.map(slot => ({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isEnabled: slot.isEnabled ?? true,
          }))
        }
      },
      include: {
        timeSlots: true,
      }
    });
  }

  /**
   * Get all schedules for a template, ordered by priority
   */
  static async getSchedulesForTemplate(templateId: string) {
    return await prisma.availabilitySchedule.findMany({
      where: { 
        templateId,
        isActive: true 
      },
      include: {
        timeSlots: {
          where: { isEnabled: true },
          orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
          ]
        }
      },
      orderBy: [
        { priority: 'desc' }, // Higher priority first
        { createdAt: 'asc' }
      ]
    });
  }

  /**
   * Calculate if a schedule is active on a specific date
   */
  static isScheduleActiveOnDate(schedule: AvailabilitySchedule, targetDate: Date): boolean {
    const scheduleStart = new Date(schedule.startDate);
    const scheduleEnd = schedule.endDate ? new Date(schedule.endDate) : null;

    // Check if date is within the schedule's date range
    if (targetDate < scheduleStart) return false;
    if (scheduleEnd && targetDate > scheduleEnd) return false;

    // If not recurring, active for whole date range
    if (!schedule.isRecurring) {
      if (scheduleEnd) {
      return targetDate.toDateString() >=  scheduleStart.toDateString() && targetDate.toDateString() <= scheduleEnd.toDateString();
    }
    // If no end date, active only on start date
      return targetDate.toDateString() === scheduleStart.toDateString();
    }

  

    // Handle recurring schedules
    return this.isRecurrenceMatch(schedule, targetDate, scheduleStart);
  }

  /**
   * Check if a date matches the recurrence pattern
   */
  private static isRecurrenceMatch(schedule: AvailabilitySchedule, targetDate: Date, startDate: Date): boolean {
    const { recurrenceType, recurrenceInterval, daysOfWeek, weekOfMonth, monthOfYear } = schedule;

    // Calculate days since start
    const daysSinceStart = Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (recurrenceType) {
      case 'DAILY':
        return daysSinceStart % (recurrenceInterval || 1) === 0;
        
      case 'WEEKLY':
        const targetDayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const weeksSinceStart = Math.floor(daysSinceStart / 7);
        return daysOfWeek.includes(targetDayOfWeek) && 
               weeksSinceStart % (recurrenceInterval || 1) === 0;
               
      case 'BIWEEKLY':
        const biweeklyTarget = targetDate.getDay();
        const biweeksSinceStart = Math.floor(daysSinceStart / 14);
        return daysOfWeek.includes(biweeklyTarget) && 
               biweeksSinceStart % (recurrenceInterval || 1) === 0;
               
      case 'MONTHLY':
        if (monthOfYear && targetDate.getMonth() + 1 !== monthOfYear) return false;
        if (weekOfMonth) {
          const weekInMonth = Math.ceil(targetDate.getDate() / 7);
          return weekInMonth === weekOfMonth && daysOfWeek.includes(targetDate.getDay());
        }
        return daysOfWeek.includes(targetDate.getDay());
        
      default:
        return false;
    }
  }

  /**
   * Get effective availability for a specific date
   * (considers all schedules and their priorities)
   */
  static async getEffectiveAvailabilityForDate(templateId: string, targetDate: Date) {
    const schedules = await this.getSchedulesForTemplate(templateId);
    
    // Find all active schedules for this date
    const activeSchedules = schedules.filter((schedule: AvailabilitySchedule) => 
      this.isScheduleActiveOnDate(schedule, targetDate)
    );

    if (activeSchedules.length === 0) {
      return { timeSlots: [], appliedSchedules: [] };
    }

    // Use the highest priority schedule
    const effectiveSchedule = activeSchedules[0]; // Already sorted by priority desc
    
    return {
      timeSlots: effectiveSchedule.timeSlots,
      appliedSchedules: activeSchedules.map((s: AvailabilitySchedule) => ({ 
        id: s.id, 
        name: s.name, 
        priority: s.priority 
      }))
    };
  }

  /**
   * Update a schedule
   */
  static async updateSchedule(scheduleId: string, scheduleData: Partial<AvailabilityScheduleInput>) {
    const { timeSlots, ...scheduleFields } = scheduleData;

    const result = await prisma.availabilitySchedule.update({
      where: { id: scheduleId },
      data: {
        ...scheduleFields,
        ...(timeSlots && {
          timeSlots: {
            deleteMany: {}, // Remove existing slots
            create: timeSlots.map(slot => ({
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              isEnabled: slot.isEnabled ?? true,
            }))
          }
        })
      },
      include: {
        timeSlots: true,
      }
    });

    return result;
  }

  /**
   * Delete a schedule
   */
  static async deleteSchedule(scheduleId: string) {
    return await prisma.availabilitySchedule.delete({
      where: { id: scheduleId }
    });
  }
}