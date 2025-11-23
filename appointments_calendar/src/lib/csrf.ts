/**
 * CSRF Token Management Utility
 */

let csrfToken: string | null = null;
let tokenExpiry: number = 0;
let tokenPromise: Promise<string> | null = null;

/**
 * Get CSRF token from server
 */
export async function getCSRFToken(forceRefresh = false): Promise<string> {
  // Return cached token if still valid (refresh 5 minutes before expiry)
  const now = Date.now();
  if (!forceRefresh && csrfToken && now < tokenExpiry - (5 * 60 * 1000)) {
    return csrfToken;
  }

  // If a token fetch is already in progress, wait for it
  if (tokenPromise) {
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
      tokenExpiry = now + (23 * 60 * 60 * 1000);

      if (!csrfToken) {
        throw new Error('Server returned empty CSRF token');
      }

      return csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      // Clear the failed token
      csrfToken = null;
      tokenExpiry = 0;
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
export async function getSecureHeaders(additionalHeaders: Record<string, string> = {}): Promise<Headers> {
  const token = await getCSRFToken();
  
  const headers = new Headers(additionalHeaders);
  headers.set('X-CSRF-Token', token);
  
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
  const headers = await getSecureHeaders(options.headers as Record<string, string> || {});
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // If we get a CSRF error, try once more with a fresh token
  if (response.status === 403) {
    try {
      const errorData = await response.clone().json();
      if (errorData.error?.includes('CSRF') || errorData.error?.includes('token')) {
        console.warn('CSRF token invalid, refreshing and retrying...');
        
        // Force refresh the token
        const freshHeaders = new Headers(options.headers as Record<string, string> || {});
        const freshToken = await getCSRFToken(true);
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
  tokenExpiry = 0;
  tokenPromise = null;
}