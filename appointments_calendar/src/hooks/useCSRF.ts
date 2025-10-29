'use client';

import { useEffect, useState } from 'react';

interface CSRFHook {
  csrfToken: string | null;
  loading: boolean;
  error: string | null;
  getHeaders: () => Record<string, string>;
}

/**
 * React hook for CSRF protection
 * Automatically fetches and manages CSRF tokens for API requests
 */
export function useCSRF(): CSRFHook {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCSRFToken = async () => {
      try {
        const response = await fetch('/api/auth/csrf', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch CSRF token');
        }

        const data = await response.json();
        setCsrfToken(data.csrfToken);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setCsrfToken(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCSRFToken();
  }, []);

  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }

    return headers;
  };

  return {
    csrfToken,
    loading,
    error,
    getHeaders,
  };
}