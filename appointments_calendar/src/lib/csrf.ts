/**
 * CSRF Token Management Utility
 */

let csrfToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get CSRF token from server
 */
export async function getCSRFToken(): Promise<string> {
  // Return cached token if still valid (refresh 5 minutes before expiry)
  const now = Date.now();
  if (csrfToken && now < tokenExpiry - (5 * 60 * 1000)) {
    return csrfToken;
  }

  try {
    const response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include', // Include cookies for session management
    });

    if (!response.ok) {
      throw new Error(`Failed to get CSRF token: ${response.status}`);
    }

    const data = await response.json();
    csrfToken = data.csrfToken;
    tokenExpiry = now + (23 * 60 * 60 * 1000); // Cache for 23 hours (token valid for 24h)

    if (!csrfToken) {
      throw new Error('Server returned empty CSRF token');
    }

    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw new Error('Could not obtain CSRF token');
  }
}

/**
 * Create headers object with CSRF token for API requests
 */
export async function getSecureHeaders(additionalHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getCSRFToken();
  
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token,
    ...additionalHeaders,
  };
}

/**
 * Make a secure fetch request with CSRF token
 */
export async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = await getSecureHeaders(options.headers as Record<string, string> || {});
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include cookies
  });
}

/**
 * Clear cached CSRF token (useful for logout)
 */
export function clearCSRFToken(): void {
  csrfToken = null;
  tokenExpiry = 0;
}