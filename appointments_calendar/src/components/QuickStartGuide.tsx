'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface CalendarConnection {
  id: string;
  platform: string;
  email: string;
  isActive: boolean;
  syncEvents?: boolean;
}

interface DefaultCalendarSettings {
  platforms: Array<{
    platform: string;
    calendars: Array<{
      calendarId: string;
      calendarName: string;
      email: string;
    }>;
  }>;
  currentDefault?: {
    platform: string;
    calendarId: string;
    email: string;
  };
}

interface QuickStartItem {
  id: string;
  title: string;
  description: string;
  action: string;
  href?: string;
  onClick?: () => void;
  checkCompletion: () => Promise<boolean> | boolean;
}

interface QuickStartGuideProps {
  connections: CalendarConnection[];
  defaultCalendar: DefaultCalendarSettings | null;
}

export default function QuickStartGuide({ connections, defaultCalendar }: QuickStartGuideProps) {
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const router = useRouter();

  const checkCompletionStatus = useCallback(async () => {
    setLoading(true);
    const newCompletedItems = new Set<string>();
    
    const quickStartItems: QuickStartItem[] = [
      {
        id: 'connect-calendar',
        title: 'Connect Your First Calendar',
        description: 'Connect your Google Calendar, Outlook, or other calendar service to get started',
        action: 'Connect Calendar',
        href: '/provider/calendar/connect',
        checkCompletion: () => connections.length > 0
      },
      {
        id: 'enable-sync',
        title: 'Choose Calendars to Sync',
        description: 'Select which calendars should sync for time-slot blocking and availability',
        action: 'Manage Calendars',
        href: connections.length > 0 ? `/provider/calendar/manage/${connections[0]?.id}` : '/provider/calendar/connect',
        checkCompletion: () => connections.some(conn => conn.syncEvents === true)
      },
      {
        id: 'set-default-calendar',
        title: 'Set Default Calendar for New Events',
        description: 'Choose where new booking events will be created',
        action: 'Set Default Calendar',
        onClick: () => {
          // Scroll to default calendar section
          const element = document.getElementById('default-calendar-section');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        },
        checkCompletion: () => Boolean(defaultCalendar?.currentDefault)
      },
      {
        id: 'create-availability-template',
        title: 'Set Up Availability Schedules',
        description: 'Define your working hours and when clients can book appointments',
        action: 'Create Schedules',
        href: '/provider/availability-schedules',
        checkCompletion: async () => {
          try {
            const token = localStorage.getItem('providerToken');
            
            // Check for availability templates
            const templatesResponse = await fetch('/api/provider/availability/templates', {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (templatesResponse.ok) {
              const templatesData = await templatesResponse.json();
              
              if (templatesData.templates && templatesData.templates.length > 0) {
                // Check if any template has either traditional availability or advanced schedules
                for (const template of templatesData.templates) {
                  // Check for traditional availability settings
                  if (template.settings && Object.keys(template.settings).length > 0) {
                    return true;
                  }
                  
                  // Check for advanced availability schedules
                  try {
                    const schedulesResponse = await fetch(`/api/provider/advanced-availability?templateId=${template.id}`, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    if (schedulesResponse.ok) {
                      const schedulesData = await schedulesResponse.json();
                      if (schedulesData && schedulesData.length > 0) {
                        return true;
                      }
                    }
                  } catch (scheduleError) {
                    // Continue checking other templates if this one fails
                    console.error('Error checking schedules for template:', template.id, scheduleError);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error checking availability templates:', error);
          }
          return false;
        }
      },
      {
        id: 'set-locations',
        title: 'Configure Your Locations',
        description: 'Set up where you provide services and when you&apos;ll be available at each location',
        action: 'Manage Locations',
        href: '/provider/location',
        checkCompletion: async () => {
          try {
            const token = localStorage.getItem('providerToken');
            const response = await fetch('/api/provider/location', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
              const data = await response.json();
              return data.locations && data.locations.length > 0;
            }
          } catch (error) {
            console.error('Error checking locations:', error);
          }
          return false;
        }
      }
    ];
    
    for (const item of quickStartItems) {
      try {
        const isCompleted = await item.checkCompletion();
        if (isCompleted) {
          newCompletedItems.add(item.id);
        }
      } catch (error) {
        console.error(`Error checking completion for ${item.id}:`, error);
      }
    }
    
    setCompletedItems(newCompletedItems);
    setLoading(false);
  }, [connections, defaultCalendar]);

  useEffect(() => {
    checkCompletionStatus();
  }, [checkCompletionStatus]);

  const quickStartItems: QuickStartItem[] = [
    {
      id: 'connect-calendar',
      title: 'Connect Your First Calendar',
      description: 'Connect your Google Calendar, Outlook, or other calendar service to get started',
      action: 'Connect Calendar',
      href: '/provider/calendar/connect',
      checkCompletion: () => connections.length > 0
    },
    {
      id: 'enable-sync',
      title: 'Choose Calendars to Sync',
      description: 'Select which calendars should sync for time-slot blocking and availability',
      action: 'Manage Calendars',
      href: connections.length > 0 ? `/provider/calendar/manage/${connections[0]?.id}` : '/provider/calendar/connect',
      checkCompletion: () => connections.some(conn => conn.syncEvents === true)
    },
    {
      id: 'set-default-calendar',
      title: 'Set Default Calendar for New Events',
      description: 'Choose where new booking events will be created',
      action: 'Set Default Calendar',
      onClick: () => {
        // Scroll to default calendar section
        const element = document.getElementById('default-calendar-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      },
      checkCompletion: () => Boolean(defaultCalendar?.currentDefault)
    },
    {
      id: 'create-availability-template',
      title: 'Set Up Availability Schedules',
      description: 'Define your working hours and when clients can book appointments',
      action: 'Create Schedules',
      href: '/provider/availability-schedules',
      checkCompletion: async () => {
        try {
          const token = localStorage.getItem('providerToken');
          
          // Check for availability templates
          const templatesResponse = await fetch('/api/provider/availability/templates', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (templatesResponse.ok) {
            const templatesData = await templatesResponse.json();
            
            if (templatesData.templates && templatesData.templates.length > 0) {
              // Check if any template has either traditional availability or advanced schedules
              for (const template of templatesData.templates) {
                // Check for traditional availability settings
                if (template.settings && Object.keys(template.settings).length > 0) {
                  return true;
                }
                
                // Check for advanced availability schedules
                try {
                  const schedulesResponse = await fetch(`/api/provider/advanced-availability?templateId=${template.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  
                  if (schedulesResponse.ok) {
                    const schedulesData = await schedulesResponse.json();
                    if (schedulesData && schedulesData.length > 0) {
                      return true;
                    }
                  }
                } catch (scheduleError) {
                  // Continue checking other templates if this one fails
                  console.error('Error checking schedules for template:', template.id, scheduleError);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error checking availability templates:', error);
        }
        return false;
      }
    },
    {
      id: 'set-locations',
      title: 'Configure Your Locations',
      description: 'Set up where you provide services and when you&apos;ll be available at each location',
      action: 'Manage Locations',
      href: '/provider/location',
      checkCompletion: async () => {
        try {
          const token = localStorage.getItem('providerToken');
          const response = await fetch('/api/provider/location', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            return data.locations && data.locations.length > 0;
          }
        } catch (error) {
          console.error('Error checking locations:', error);
        }
        return false;
      }
    }
  ];

  const incompleteItems = quickStartItems.filter(item => !completedItems.has(item.id));
  const completedCount = completedItems.size;
  const totalCount = quickStartItems.length;
  const isFullyComplete = completedCount === totalCount;

  // Don't show the guide if everything is complete and user has collapsed it
  if (isFullyComplete && !isExpanded) {
    return null;
  }

  const handleItemClick = (item: QuickStartItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 mb-8">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                {isFullyComplete ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {isFullyComplete ? '🎉 Setup Complete!' : 'Quick Start Guide'}
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                {isFullyComplete 
                  ? 'Great! You&apos;ve completed all the essential setup steps. Your calendar system is ready to use.'
                  : 'Complete these essential steps to get your calendar system up and running'
                }
              </p>
              
              {/* Progress Bar */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {completedCount}/{totalCount} complete
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg 
              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Checking completion status...</p>
              </div>
            ) : incompleteItems.length > 0 ? (
              <>
                <div className="grid gap-3">
                  {incompleteItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                            <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleItemClick(item)}
                          className="ml-4 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          {item.action}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {completedCount > 0 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => {
                        setShowCompleted(!showCompleted);
                        if (!showCompleted) {
                          // Scroll to completed items after they're shown
                          setTimeout(() => {
                            const element = document.querySelector('.completed-items');
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth' });
                            }
                          }, 100);
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {showCompleted ? 'Hide' : 'View'} {completedCount} completed item{completedCount !== 1 ? 's' : ''}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <div className="text-green-600 text-4xl mb-3">✅</div>
                <h4 className="font-semibold text-gray-900 mb-2">All Done!</h4>
                <p className="text-gray-600 text-sm mb-4">
                  You&apos;ve completed all the essential setup steps. You can now start accepting bookings!
                </p>
                <button
                  onClick={() => router.push('/provider/bookings')}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  View Bookings
                </button>
              </div>
            )}

            {/* Completed Items (shown when everything is done or when user clicks to view) */}
            {completedCount > 0 && (showCompleted || isFullyComplete) && (
              <div className="completed-items mt-6 pt-4 border-t border-blue-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">✅ Completed Setup Steps:</h4>
                <div className="grid gap-2">
                  {quickStartItems.filter(item => completedItems.has(item.id)).map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}