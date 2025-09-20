'use client';

import { useEffect, useState } from 'react';

interface SyncLoadingProps {
  isVisible: boolean;
  message?: string;
}

export function SyncLoading({ 
  isVisible, 
  message = "Syncing provider calendar, please wait a moment. Appointment availability is subject to change." 
}: SyncLoadingProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-xl">
        {/* Spinner */}
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        
        {/* Message */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Syncing Calendar{dots}
        </h3>
        
        <p className="text-sm text-gray-600 leading-relaxed">
          {message}
        </p>
        
        {/* Progress indicator */}
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SyncButtonProps {
  onClick: () => Promise<void>;
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SyncButton({ onClick, isLoading, children, className = '' }: SyncButtonProps) {
  const handleClick = async () => {
    if (isLoading) return;
    await onClick();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        inline-flex items-center justify-center
        px-4 py-2 text-sm font-medium rounded-md
        transition-all duration-200
        ${isLoading 
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        }
        ${className}
      `}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}