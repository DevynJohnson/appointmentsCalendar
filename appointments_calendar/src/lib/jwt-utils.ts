// JWT utility for safe token verification
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  providerId: string;
  email: string;
  [key: string]: unknown;
}

export interface VerifyJWTResult {
  success: boolean;
  payload?: JWTPayload;
  error?: string;
  code?: string;
}

/**
 * Safely verify JWT token with proper error handling
 */
export function verifyJWT(token: string): VerifyJWTResult {
  try {
    if (!token || typeof token !== 'string') {
      return {
        success: false,
        error: 'Invalid token format',
        code: 'TOKEN_INVALID_FORMAT'
      };
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return {
        success: false,
        error: 'Server configuration error',
        code: 'SERVER_CONFIG_ERROR'
      };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    // Validate required fields
    if (!decoded.providerId) {
      return {
        success: false,
        error: 'Invalid token payload - missing providerId',
        code: 'TOKEN_PAYLOAD_INVALID'
      };
    }

    return {
      success: true,
      payload: decoded
    };

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: 'Invalid or malformed token',
        code: 'TOKEN_MALFORMED'
      };
    }

    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      };
    }

    if (error instanceof jwt.NotBeforeError) {
      return {
        success: false,
        error: 'Token not active yet',
        code: 'TOKEN_NOT_ACTIVE'
      };
    }

    return {
      success: false,
      error: 'Token verification failed',
      code: 'TOKEN_VERIFICATION_FAILED'
    };
  }
}

/**
 * Extract and verify JWT from Authorization header
 */
export function extractAndVerifyJWT(authHeader: string | null): VerifyJWTResult {
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Missing or invalid authorization header',
      code: 'AUTH_HEADER_INVALID'
    };
  }

  const token = authHeader.substring(7);
  return verifyJWT(token);
}