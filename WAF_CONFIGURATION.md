# Web Application Firewall (WAF) Configuration for Zone Meet
# This document outlines WAF setup for Render deployment with additional Cloudflare integration

## Render Native Security Features

Render provides several built-in security features that function as a basic WAF:

### 1. Built-in DDoS Protection
- Automatic DDoS mitigation at the infrastructure level
- Rate limiting at the edge for extreme traffic spikes
- Geographic load balancing to distribute traffic

### 2. SSL/TLS Termination
- Automatic SSL certificate provisioning and renewal
- HTTP to HTTPS redirection
- TLS 1.2+ enforcement

### 3. Network-Level Filtering
- Automatic blocking of known malicious IPs
- Protection against common network-level attacks
- Infrastructure-level security scanning

## Enhanced WAF with Cloudflare Integration

For production-grade WAF protection, integrate Cloudflare with your Render deployment:

### Cloudflare Setup Steps:

1. **Add Domain to Cloudflare**
   ```bash
   # Update your domain DNS to point to Cloudflare nameservers
   # Configure A record to point to your Render service IP
   ```

2. **Enable WAF Rules**
   ```javascript
   // Cloudflare Worker for advanced filtering
   addEventListener('fetch', event => {
     event.respondWith(handleRequest(event.request))
   })

   async function handleRequest(request) {
     const url = new URL(request.url)
     
     // Block requests with suspicious patterns
     if (containsSuspiciousPatterns(request)) {
       return new Response('Blocked', { status: 403 })
     }
     
     // Rate limiting per IP
     const clientIP = request.headers.get('CF-Connecting-IP')
     if (await isRateLimited(clientIP)) {
       return new Response('Rate limited', { status: 429 })
     }
     
     // Forward to Render
     return fetch(request)
   }
   ```

3. **Configure Security Rules**
   ```yaml
   # Cloudflare Page Rules or WAF Custom Rules
   rules:
     - name: "Block SQL Injection"
       expression: |
         (http.request.uri.query contains "union select") or 
         (http.request.uri.query contains "1' or '1'='1") or
         (http.request.body contains "union select")
       action: "block"
     
     - name: "Block XSS Attempts"
       expression: |
         (http.request.uri.query contains "<script") or
         (http.request.uri.query contains "javascript:") or
         (http.request.body contains "<script")
       action: "block"
     
     - name: "Rate Limit API Endpoints"
       expression: 'http.request.uri.path matches "^/api/"'
       action: "rate_limit"
       rate_limit:
         period: 60
         requests_per_period: 100
         mitigation_timeout: 600
   ```

## Application-Level WAF (Zone Meet Implementation)

### 1. API Route Protection

Create `src/middleware/waf.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, validateSecurityHeaders } from '@/lib/validation';

export interface WAFConfig {
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  ipWhitelist?: string[];
  ipBlacklist?: string[];
  blockSuspiciousPatterns: boolean;
}

const defaultWAFConfig: WAFConfig = {
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
  blockSuspiciousPatterns: true,
};

export function wafMiddleware(request: NextRequest, config: WAFConfig = defaultWAFConfig) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  
  // 1. IP Blacklist Check
  if (config.ipBlacklist?.includes(clientIP)) {
    return createSecurityResponse('IP blocked', 403, 'IP_BLOCKED');
  }
  
  // 2. IP Whitelist Check (if configured)
  if (config.ipWhitelist && !config.ipWhitelist.includes(clientIP)) {
    return createSecurityResponse('IP not whitelisted', 403, 'IP_NOT_WHITELISTED');
  }
  
  // 3. Rate Limiting
  const rateLimit = checkRateLimit(clientIP, config.rateLimit);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }
  
  // 4. Suspicious Pattern Detection
  if (config.blockSuspiciousPatterns) {
    const suspiciousCheck = detectSuspiciousPatterns(request);
    if (suspiciousCheck.isSuspicious) {
      logSecurityEvent('SUSPICIOUS_PATTERN', {
        ip: clientIP,
        userAgent,
        url: request.url,
        reason: suspiciousCheck.reason,
      });
      return createSecurityResponse('Suspicious activity detected', 403, 'SUSPICIOUS_PATTERN');
    }
  }
  
  // 5. Validate Security Headers
  const headerValidation = validateSecurityHeaders(request);
  if (!headerValidation.isValid) {
    return createSecurityResponse('Invalid security headers', 400, 'INVALID_HEADERS');
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
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') || // Cloudflare
         'unknown';
}

function detectSuspiciousPatterns(request: NextRequest): { isSuspicious: boolean; reason?: string } {
  const url = request.url.toLowerCase();
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  
  // Common attack patterns
  const suspiciousPatterns = [
    // SQL Injection
    { pattern: /(union|select|insert|update|delete|drop|create|alter)\s+/i, type: 'SQL_INJECTION' },
    { pattern: /(\w+(\s*=\s*\w+\s*)*;|('\s*(or|and)\s*'|"\s*(or|and)\s*"))/i, type: 'SQL_INJECTION' },
    
    // XSS
    { pattern: /<script[^>]*>|javascript:|vbscript:|onload=|onerror=/i, type: 'XSS' },
    { pattern: /document\.(cookie|location|write)|window\.(location|open)/i, type: 'XSS' },
    
    // Path Traversal
    { pattern: /\.\.[\/\\]|\.{2}[\/\\]/i, type: 'PATH_TRAVERSAL' },
    { pattern: /\/etc\/passwd|\/etc\/shadow|c:\\windows\\system32/i, type: 'PATH_TRAVERSAL' },
    
    // Command Injection
    { pattern: /[;&|`](\s*\w+\s*)*[;&|`]|exec\(|system\(|shell_exec\(/i, type: 'COMMAND_INJECTION' },
    
    // Bot Detection
    { pattern: /(bot|crawler|spider|scraper)/i, type: 'BOT', severity: 'LOW' },
  ];
  
  for (const { pattern, type } of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(userAgent)) {
      return { isSuspicious: true, reason: type };
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

function logSecurityEvent(eventType: string, details: Record<string, unknown>) {
  console.warn(`[WAF] ${eventType}:`, {
    timestamp: new Date().toISOString(),
    eventType,
    ...details,
  });
  
  // In production, send to security monitoring service
  // await sendToSecurityService(eventType, details);
}
```

### 2. Environment Configuration

Add WAF settings to environment variables:
```bash
# WAF Configuration
WAF_ENABLED=true
WAF_RATE_LIMIT_WINDOW=60000
WAF_RATE_LIMIT_MAX_REQUESTS=100
WAF_IP_WHITELIST=
WAF_IP_BLACKLIST=
WAF_BLOCK_SUSPICIOUS_PATTERNS=true
WAF_LOG_LEVEL=warn
```

### 3. Deployment Configuration

Update `render.yaml`:
```yaml
services:
  - type: web
    name: zone-meet
    runtime: node
    buildCommand: npm ci && npm run build
    startCommand: npm start
    plan: starter
    envVars:
      - key: NODE_ENV
        value: production
      - key: WAF_ENABLED
        value: true
      - key: WAF_RATE_LIMIT_MAX_REQUESTS
        value: 100
    healthCheckPath: /api/health
    headers:
      - name: "X-Frame-Options"
        value: "DENY"
      - name: "X-Content-Type-Options"
        value: "nosniff"
```

## Monitoring and Alerting

### 1. Security Event Logging
```typescript
// src/lib/security-monitor.ts
export function logSecurityEvent(
  eventType: 'BLOCKED_IP' | 'RATE_LIMITED' | 'SUSPICIOUS_PATTERN' | 'XSS_ATTEMPT' | 'SQL_INJECTION',
  details: {
    ip: string;
    userAgent: string;
    url: string;
    timestamp?: string;
  }
) {
  const event = {
    ...details,
    eventType,
    timestamp: details.timestamp || new Date().toISOString(),
    severity: getSeverity(eventType),
  };
  
  // Log to console (Render captures this)
  console.warn('[SECURITY]', event);
  
  // Send to external monitoring (implement based on your choice)
  // await sendToSentry(event);
  // await sendToDatadog(event);
}
```

### 2. Render Dashboard Integration
- Use Render's built-in log aggregation
- Set up log-based alerts for security events
- Monitor response time impacts from WAF

### 3. Third-Party Integration Options
```typescript
// Sentry Security Monitoring
import * as Sentry from '@sentry/nextjs';

export function reportSecurityIncident(incident: SecurityIncident) {
  Sentry.captureException(new Error(`Security incident: ${incident.type}`), {
    tags: {
      security: true,
      incident_type: incident.type,
    },
    extra: incident.details,
  });
}
```

## WAF Bypass Prevention

### 1. Multiple Detection Layers
- Network level (Cloudflare/Render)
- Application level (Next.js middleware)
- Input validation (Zod schemas)
- Database level (Prisma parameterized queries)

### 2. Regular Expression Tuning
```typescript
// Constantly update patterns based on attack trends
const updatedPatterns = {
  sqlInjection: [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    /((\d+[\s]*=[\s]*\d+)|('\s*(or|and)\s*')|("\s*(or|and)\s*"))/i,
    /(\|\||\&\&|concat\s*\(|char\s*\(|ascii\s*\()/i,
  ],
  xss: [
    /<script[^>]*>.*?<\/script>/is,
    /javascript\s*:/i,
    /vbscript\s*:/i,
    /on\w+\s*=/i,
    /(expression|behaviour|behavior)\s*[\(\[].*[\)\]]/i,
  ],
};
```

## Testing WAF Configuration

### 1. Security Testing Script
```bash
#!/bin/bash
# test-waf.sh - Test WAF configuration

echo "Testing WAF Protection..."

# Test rate limiting
echo "1. Testing rate limiting..."
for i in {1..105}; do
  curl -s -o /dev/null -w "%{http_code}\n" "https://your-app.onrender.com/api/health"
done

# Test SQL injection protection
echo "2. Testing SQL injection protection..."
curl -X POST "https://your-app.onrender.com/api/appointments" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test'; DROP TABLE appointments; --"}'

# Test XSS protection
echo "3. Testing XSS protection..."
curl -X POST "https://your-app.onrender.com/api/appointments" \
  -H "Content-Type: application/json" \
  -d '{"title": "<script>alert(\"XSS\")</script>"}'

echo "WAF testing complete. Check logs for blocked requests."
```

This comprehensive WAF setup provides multiple layers of protection for your Zone Meet application on Render, combining platform-native security with application-level filtering and optional Cloudflare integration for enterprise-grade protection.