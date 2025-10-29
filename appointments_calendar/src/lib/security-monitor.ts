/**
 * Comprehensive Security Monitoring System for Zone Meet
 * Integrates with Sentry, provides real-time alerting, and tracks security metrics
 */

import * as Sentry from '@sentry/nextjs';

// Security event types for monitoring
export type SecurityEventType = 
  | 'AUTHENTICATION_FAILURE'
  | 'SUSPICIOUS_LOGIN_ATTEMPT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'XSS_ATTEMPT'
  | 'SQL_INJECTION_ATTEMPT'
  | 'CSRF_TOKEN_INVALID'
  | 'IP_BLOCKED'
  | 'SCANNER_DETECTED'
  | 'UNAUTHORIZED_API_ACCESS'
  | 'FILE_UPLOAD_VIOLATION'
  | 'PRIVILEGE_ESCALATION_ATTEMPT';

export interface SecurityEvent {
  type: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  ip: string;
  userAgent: string;
  userId?: string;
  url: string;
  details: Record<string, unknown>;
  fingerprint?: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<string, number>;
  uniqueIPs: Set<string>;
  timeWindow: string;
}

// In-memory storage for metrics (in production, use Redis or database)
class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events in memory
  
  constructor() {
    // Clean up old events periodically
    setInterval(() => this.cleanupOldEvents(), 60 * 60 * 1000); // Every hour
  }
  
  /**
   * Log a security event
   */
  logEvent(event: Omit<SecurityEvent, 'timestamp' | 'fingerprint'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      fingerprint: this.generateFingerprint(event),
    };
    
    // Add to local storage
    this.events.push(securityEvent);
    
    // Maintain max events limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    
    // Log to console
    this.logToConsole(securityEvent);
    
    // Send to Sentry
    this.sendToSentry(securityEvent);
    
    // Check for alert conditions
    this.checkAlertConditions(securityEvent);
  }
  
  /**
   * Get security metrics for a time window
   */
  getMetrics(windowMinutes: number = 60): SecurityMetrics {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
    const recentEvents = this.events.filter(
      event => new Date(event.timestamp) > cutoff
    );
    
    const eventsByType = {} as Record<SecurityEventType, number>;
    const eventsBySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const uniqueIPs = new Set<string>();
    
    recentEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity]++;
      uniqueIPs.add(event.ip);
    });
    
    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      uniqueIPs,
      timeWindow: `${windowMinutes} minutes`,
    };
  }
  
  /**
   * Get events for a specific IP
   */
  getEventsForIP(ip: string, windowMinutes: number = 60): SecurityEvent[] {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
    return this.events.filter(
      event => event.ip === ip && new Date(event.timestamp) > cutoff
    );
  }
  
  /**
   * Check if an IP should be temporarily blocked
   */
  shouldBlockIP(ip: string): { block: boolean; reason?: string; duration?: number } {
    const recentEvents = this.getEventsForIP(ip, 60); // Last hour
    
    // High severity events in last hour
    const highSeverityCount = recentEvents.filter(
      event => ['HIGH', 'CRITICAL'].includes(event.severity)
    ).length;
    
    if (highSeverityCount >= 5) {
      return { 
        block: true, 
        reason: 'Multiple high-severity security events', 
        duration: 60 * 60 * 1000 // 1 hour
      };
    }
    
    // Multiple failed authentication attempts
    const authFailures = recentEvents.filter(
      event => event.type === 'AUTHENTICATION_FAILURE'
    ).length;
    
    if (authFailures >= 10) {
      return { 
        block: true, 
        reason: 'Multiple authentication failures', 
        duration: 30 * 60 * 1000 // 30 minutes
      };
    }
    
    // Scanner detection
    const scannerEvents = recentEvents.filter(
      event => event.type === 'SCANNER_DETECTED'
    ).length;
    
    if (scannerEvents >= 3) {
      return { 
        block: true, 
        reason: 'Automated scanning detected', 
        duration: 24 * 60 * 60 * 1000 // 24 hours
      };
    }
    
    return { block: false };
  }
  
  private generateFingerprint(event: Omit<SecurityEvent, 'timestamp' | 'fingerprint'>): string {
    const key = `${event.type}_${event.ip}_${event.url}`;
    return Buffer.from(key).toString('base64').slice(0, 16);
  }
  
  private logToConsole(event: SecurityEvent): void {
    const logLevel = this.getLogLevel(event.severity);
    const message = `[SECURITY] ${event.type} from ${event.ip}`;
    
    logLevel(message, {
      timestamp: event.timestamp,
      severity: event.severity,
      url: event.url,
      userAgent: event.userAgent,
      details: event.details,
    });
  }
  
  private getLogLevel(severity: SecurityEvent['severity']) {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return console.error;
      case 'MEDIUM':
        return console.warn;
      case 'LOW':
      default:
        return console.info;
    }
  }
  
  private sendToSentry(event: SecurityEvent): void {
    try {
      Sentry.captureException(new Error(`Security Event: ${event.type}`), {
        tags: {
          security: true,
          eventType: event.type,
          severity: event.severity,
          ip: event.ip,
        },
        extra: {
          timestamp: event.timestamp,
          url: event.url,
          userAgent: event.userAgent,
          userId: event.userId,
          details: event.details,
          fingerprint: event.fingerprint,
        },
        level: this.sentryLevel(event.severity),
        fingerprint: [event.fingerprint || event.type],
      });
    } catch (error) {
      console.error('Failed to send security event to Sentry:', error);
    }
  }
  
  private sentryLevel(severity: SecurityEvent['severity']): Sentry.SeverityLevel {
    switch (severity) {
      case 'CRITICAL': return 'fatal';
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'info';
      default: return 'info';
    }
  }
  
  private checkAlertConditions(event: SecurityEvent): void {
    // Critical events always trigger immediate alerts
    if (event.severity === 'CRITICAL') {
      this.sendAlert({
        title: 'CRITICAL Security Event',
        message: `${event.type} detected from IP ${event.ip}`,
        event,
        urgency: 'immediate',
      });
      return;
    }
    
    // Check for attack patterns
    const recentEvents = this.getEventsForIP(event.ip, 10); // Last 10 minutes
    
    // Multiple high-severity events
    const highSeverityCount = recentEvents.filter(
      e => ['HIGH', 'CRITICAL'].includes(e.severity)
    ).length;
    
    if (highSeverityCount >= 3) {
      this.sendAlert({
        title: 'Potential Security Attack',
        message: `Multiple high-severity events from IP ${event.ip}`,
        event,
        urgency: 'high',
      });
    }
    
    // Coordinated attack detection
    const uniqueEventTypes = new Set(recentEvents.map(e => e.type));
    if (uniqueEventTypes.size >= 3) {
      this.sendAlert({
        title: 'Coordinated Attack Detected',
        message: `Multiple attack types from IP ${event.ip}`,
        event,
        urgency: 'high',
      });
    }
  }
  
  private sendAlert(alert: {
    title: string;
    message: string;
    event: SecurityEvent;
    urgency: 'immediate' | 'high' | 'medium' | 'low';
  }): void {
    // Log alert
    console.error('[SECURITY ALERT]', alert);
    
    // Send to external alerting systems
    // this.sendToSlack(alert);
    // this.sendToEmail(alert);
    // this.sendToWebhook(alert);
  }
  
  private cleanupOldEvents(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    this.events = this.events.filter(
      event => new Date(event.timestamp) > cutoff
    );
  }
}

// Global security monitor instance
export const securityMonitor = new SecurityMonitor();

// Convenience functions
export function logSecurityEvent(
  type: SecurityEventType,
  severity: SecurityEvent['severity'],
  ip: string,
  userAgent: string,
  url: string,
  details: Record<string, unknown> = {},
  userId?: string
): void {
  securityMonitor.logEvent({
    type,
    severity,
    ip,
    userAgent,
    url,
    details,
    userId,
  });
}

export function logAuthenticationFailure(
  ip: string,
  userAgent: string,
  email?: string,
  reason?: string
): void {
  logSecurityEvent(
    'AUTHENTICATION_FAILURE',
    'MEDIUM',
    ip,
    userAgent,
    '/api/auth/login',
    { email, reason }
  );
}

export function logSuspiciousActivity(
  type: SecurityEventType,
  ip: string,
  userAgent: string,
  url: string,
  details: Record<string, unknown>
): void {
  const severity = getSeverityForEventType(type);
  logSecurityEvent(type, severity, ip, userAgent, url, details);
}

function getSeverityForEventType(type: SecurityEventType): SecurityEvent['severity'] {
  const criticalEvents: SecurityEventType[] = [
    'PRIVILEGE_ESCALATION_ATTEMPT',
  ];
  
  const highSeverityEvents: SecurityEventType[] = [
    'SQL_INJECTION_ATTEMPT',
    'XSS_ATTEMPT',
    'UNAUTHORIZED_API_ACCESS',
  ];
  
  const mediumSeverityEvents: SecurityEventType[] = [
    'AUTHENTICATION_FAILURE',
    'SUSPICIOUS_LOGIN_ATTEMPT',
    'CSRF_TOKEN_INVALID',
    'FILE_UPLOAD_VIOLATION',
  ];
  
  if (criticalEvents.includes(type)) return 'CRITICAL';
  if (highSeverityEvents.includes(type)) return 'HIGH';
  if (mediumSeverityEvents.includes(type)) return 'MEDIUM';
  return 'LOW';
}

// API endpoint helpers
export function getSecurityMetrics(windowMinutes?: number): SecurityMetrics {
  return securityMonitor.getMetrics(windowMinutes);
}

export function getIPEvents(ip: string, windowMinutes?: number): SecurityEvent[] {
  return securityMonitor.getEventsForIP(ip, windowMinutes);
}

export function checkIPBlocking(ip: string): { block: boolean; reason?: string; duration?: number } {
  return securityMonitor.shouldBlockIP(ip);
}