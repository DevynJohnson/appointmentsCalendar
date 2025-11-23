/**
 * CSRF Token Management Utility
 */

let csrfToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

/**
 * Get CSRF token from server
 * Always fetches fresh to ensure it matches the httpOnly cookie
 */
export async function getCSRFToken(forceRefresh = false): Promise<string> {
  // If a token fetch is already in progress, wait for it
  if (tokenPromise && !forceRefresh) {
    return tokenPromise;
  }

  tokenPromise = (async () => {
    try {
      const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store', // Never cache this request
      });

      if (!response.ok) {
        throw new Error(`Failed to get CSRF token: ${response.status}`);
      }

      const data = await response.json();
      csrfToken = data.csrfToken;

      if (!csrfToken) {
        throw new Error('Server returned empty CSRF token');
      }

      return csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      // Clear the failed token
      csrfToken = null;
      throw new Error('Could not obtain CSRF token');
    } finally {
      tokenPromise = null;
    }
  })();

  return tokenPromise;
}

/**
 * Create headers object with CSRF token for API requests
 */
export async function getSecureHeaders(additionalHeaders: HeadersInit = {}): Promise<Headers> {
  const token = await getCSRFToken();
  
  // Convert additionalHeaders to Headers object if it isn't already
  const headers = new Headers(additionalHeaders);
  headers.set('X-CSRF-Token', token);
  
  // Only set Content-Type if not already set (allows overrides)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  return headers;
}

/**
 * Make a secure fetch request with CSRF token
 * Automatically retries once with a fresh token if CSRF validation fails
 */
export async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = await getSecureHeaders(options.headers);
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // If we get a CSRF error, try once more with a fresh token
  if (response.status === 403 || response.status === 400) {
    try {
      const errorData = await response.clone().json();
      if (errorData.error?.includes('CSRF') || errorData.error?.includes('token') || errorData.error?.includes('Missing')) {
        console.warn('CSRF token invalid or missing, refreshing and retrying...');
        
        // Force refresh the token
        const freshToken = await getCSRFToken(true);
        const freshHeaders = new Headers(options.headers);
        freshHeaders.set('X-CSRF-Token', freshToken);
        
        if (!freshHeaders.has('Content-Type')) {
          freshHeaders.set('Content-Type', 'application/json');
        }
        
        // Retry with fresh token
        return fetch(url, {
          ...options,
          headers: freshHeaders,
          credentials: 'include',
        });
      }
    } catch {
      // If we can't parse the error, just return the original response
    }
  }
  
  return response;
}

/**
 * Clear cached CSRF token (useful for logout)
 */
export function clearCSRFToken(): void {
  csrfToken = null;
  tokenPromise = null;
}