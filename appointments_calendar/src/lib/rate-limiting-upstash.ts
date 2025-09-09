/**
 * Professional rate limiting for Next.js API routes
 * Using simple in-memory storage suitable for most applications
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class NextRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private maxRequests: number;
  private prefix: string;

  constructor(maxRequests: number, windowMs: number, prefix: string = '') {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.prefix = prefix;
    
    // Clean up expired entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  async limit(identifier: string) {
    const key = `${this.prefix}:${identifier}`;
    const now = Date.now();
    const entry = this.store.get(key);

    // Clean up expired entries
    this.cleanup();

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const resetTime = now + this.windowMs;
      this.store.set(key, { count: 1, resetTime });
      
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: new Date(resetTime)
      };
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: new Date(entry.resetTime)
      };
    }

    // Increment counter
    entry.count++;
    this.store.set(key, entry);

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - entry.count,
      reset: new Date(entry.resetTime)
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  reset(identifier: string) {
    const key = `${this.prefix}:${identifier}`;
    this.store.delete(key);
  }
}

// Create rate limiters for different endpoints
export const registrationLimiter = new NextRateLimiter(3, 15 * 60 * 1000, 'registration'); // 3 per 15min
export const loginLimiter = new NextRateLimiter(10, 15 * 60 * 1000, 'login'); // 10 per 15min
export const generalAPILimiter = new NextRateLimiter(100, 15 * 60 * 1000, 'api'); // 100 per 15min

/**
 * Get client IP address from Next.js request
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfIP) {
    return cfIP;
  }
  
  return 'unknown';
}

/**
 * Rate limit middleware for API routes
 */
export async function rateLimit(
  request: Request, 
  limiter: NextRateLimiter
): Promise<{ success: boolean; limit: number; remaining: number; reset: Date } | null> {
  const identifier = getClientIP(request);
  
  try {
    const result = await limiter.limit(identifier);
    
    if (!result.success) {
      return null; // Rate limited
    }
    
    return result;
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open - allow request if rate limiter fails
    return { success: true, limit: 0, remaining: 0, reset: new Date() };
  }
}

/**
 * Create rate limit error response
 */
export function createRateLimitResponse(reset: Date) {
  const retryAfter = Math.ceil((reset.getTime() - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({ 
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      retryAfter 
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': reset.toISOString()
      }
    }
  );
}
