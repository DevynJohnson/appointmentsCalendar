import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, validateSecurityHeaders } from '@/lib/validation';
import { logSuspiciousActivity, checkIPBlocking } from '@/lib/security-monitor';

export interface WAFConfig {
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  ipWhitelist?: string[];
  ipBlacklist?: string[];
  blockSuspiciousPatterns: boolean;
  enabled: boolean;
}

const defaultWAFConfig: WAFConfig = {
  rateLimit: {
    windowMs: parseInt(process.env.WAF_RATE_LIMIT_WINDOW || '60000'), // 1 minute default
    maxRequests: parseInt(process.env.WAF_RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  ipWhitelist: process.env.WAF_IP_WHITELIST 
    ? process.env.WAF_IP_WHITELIST.split(',').map(ip => ip.trim()).filter(Boolean)
    : undefined,
  ipBlacklist: process.env.WAF_IP_BLACKLIST 
    ? process.env.WAF_IP_BLACKLIST.split(',').map(ip => ip.trim()).filter(Boolean)
    : undefined,
  blockSuspiciousPatterns: process.env.WAF_BLOCK_SUSPICIOUS_PATTERNS !== 'false',
  enabled: process.env.WAF_ENABLED !== 'false',
};

export function wafMiddleware(request: NextRequest, config: WAFConfig = defaultWAFConfig) {
  // Skip WAF if disabled
  if (!config.enabled) {
    return NextResponse.next();
  }

  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  
  // 0. Check if IP is currently blocked by security monitor
  const blockCheck = checkIPBlocking(clientIP);
  if (blockCheck.block) {
    logSuspiciousActivity('IP_BLOCKED', clientIP, userAgent, request.url, {
      reason: blockCheck.reason,
      duration: blockCheck.duration,
    });
    return createSecurityResponse(`IP blocked: ${blockCheck.reason}`, 403, 'IP_BLOCKED');
  }
  
  // 1. IP Blacklist Check
  if (config.ipBlacklist?.includes(clientIP)) {
    logSuspiciousActivity('IP_BLOCKED', clientIP, userAgent, request.url, {
      reason: 'IP in blacklist',
    });
    return createSecurityResponse('Access denied', 403, 'IP_BLOCKED');
  }
  
  // 2. IP Whitelist Check (if configured)
  if (config.ipWhitelist && config.ipWhitelist.length > 0 && !config.ipWhitelist.includes(clientIP)) {
    logSuspiciousActivity('IP_BLOCKED', clientIP, userAgent, request.url, {
      reason: 'IP not in whitelist',
    });
    return createSecurityResponse('Access denied', 403, 'IP_NOT_WHITELISTED');
  }
  
  // 3. Rate Limiting
  const rateLimit = checkRateLimit(clientIP, config.rateLimit);
  if (!rateLimit.allowed) {
    logSuspiciousActivity('RATE_LIMIT_EXCEEDED', clientIP, userAgent, request.url, {
      limit: config.rateLimit.maxRequests,
      window: config.rateLimit.windowMs,
    });
    return createRateLimitResponse(rateLimit);
  }
  
  // 4. Suspicious Pattern Detection
  if (config.blockSuspiciousPatterns) {
    const suspiciousCheck = detectSuspiciousPatterns(request);
    if (suspiciousCheck.isSuspicious) {
      logSuspiciousActivity(
        suspiciousCheck.reason === 'SQL_INJECTION' ? 'SQL_INJECTION_ATTEMPT' :
        suspiciousCheck.reason === 'XSS' ? 'XSS_ATTEMPT' :
        suspiciousCheck.reason === 'SCANNER_DETECTED' ? 'SCANNER_DETECTED' :
        'SUSPICIOUS_LOGIN_ATTEMPT',
        clientIP,
        userAgent,
        request.url,
        { pattern: suspiciousCheck.reason }
      );
      return createSecurityResponse('Suspicious activity detected', 403, 'SUSPICIOUS_PATTERN');
    }
  }
  
  // 5. Validate Security Headers for state-changing operations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const headerValidation = validateSecurityHeaders(request);
    if (!headerValidation.isValid) {
      logSuspiciousActivity('CSRF_TOKEN_INVALID', clientIP, userAgent, request.url, {
        errors: headerValidation.errors,
      });
      return createSecurityResponse('Invalid security headers', 400, 'INVALID_HEADERS');
    }
  }
  
  // Allow request to proceed
  const response = NextResponse.next();
  
  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', config.rateLimit.maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
  
  return response;
}

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') || // Cloudflare
         request.headers.get('x-client-ip') ||
         'unknown';
}

function detectSuspiciousPatterns(request: NextRequest): { isSuspicious: boolean; reason?: string } {
  const url = request.url.toLowerCase();
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  
  // Common attack patterns
  const suspiciousPatterns = [
    // SQL Injection
    { pattern: /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i, type: 'SQL_INJECTION' },
    { pattern: /((\d+[\s]*=[\s]*\d+)|('\s*(or|and)\s*')|("\s*(or|and)\s*"))/i, type: 'SQL_INJECTION' },
    { pattern: /(\|\||\&\&|concat\s*\(|char\s*\(|ascii\s*\()/i, type: 'SQL_INJECTION' },
    
    // XSS
    { pattern: /<script[^>]*>/i, type: 'XSS' },
    { pattern: /javascript\s*:/i, type: 'XSS' },
    { pattern: /vbscript\s*:/i, type: 'XSS' },
    { pattern: /on\w+\s*=/i, type: 'XSS' },
    { pattern: /(expression|behaviour|behavior)\s*[\(\[].*[\)\]]/i, type: 'XSS' },
    
    // Path Traversal
    { pattern: /\.\.[\/\\]|\.{2}[\/\\]/i, type: 'PATH_TRAVERSAL' },
    { pattern: /\/etc\/passwd|\/etc\/shadow|c:\\windows\\system32/i, type: 'PATH_TRAVERSAL' },
    
    // Command Injection
    { pattern: /[;&|`](\s*\w+\s*)*[;&|`]/i, type: 'COMMAND_INJECTION' },
    { pattern: /(exec\(|system\(|shell_exec\(|eval\()/i, type: 'COMMAND_INJECTION' },
    
    // LDAP Injection
    { pattern: /(\)\(\w+=\*\)|(\*\)\(\w+=\w+))/i, type: 'LDAP_INJECTION' },
    
    // XML Injection
    { pattern: /(<\?xml|<!DOCTYPE|<!\[CDATA\[)/i, type: 'XML_INJECTION' },
  ];
  
  for (const { pattern, type } of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(userAgent)) {
      return { isSuspicious: true, reason: type };
    }
  }
  
  // Check for automated scanning tools
  const scannerPatterns = [
    /nikto|nessus|openvas|sqlmap|burp|nmap|masscan/i,
    /gobuster|dirb|dirbuster|wfuzz|ffuf/i,
    /curl\/7\.|wget\/1\.|python-requests/i,
  ];
  
  for (const pattern of scannerPatterns) {
    if (pattern.test(userAgent)) {
      return { isSuspicious: true, reason: 'SCANNER_DETECTED' };
    }
  }
  
  return { isSuspicious: false };
}

function createSecurityResponse(message: string, status: number, code: string) {
  return new NextResponse(
    JSON.stringify({
      error: 'Security violation',
      message,
      code,
      timestamp: new Date().toISOString(),
    }),
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

function createRateLimitResponse(rateLimit: { remaining: number; resetTime: number }) {
  return new NextResponse(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests',
      resetTime: new Date(rateLimit.resetTime).toISOString(),
    }),
    { 
      status: 429,
      headers: { 
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
      }
    }
  );
}