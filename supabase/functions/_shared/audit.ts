/**
 * Enterprise audit logging for security and compliance
 * Tracks security-critical operations
 * Compliant with SOC 2, ISO 27001, and GDPR requirements
 */

export enum AuditEventType {
  // Authentication events
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_SIGNUP = 'user.signup',
  AUTH_FAILED = 'auth.failed',
  
  // Document events
  DOCUMENT_UPLOAD = 'document.upload',
  DOCUMENT_PROCESS = 'document.process',
  DOCUMENT_PROCESSED = 'document.processed',
  DOCUMENT_DOWNLOAD = 'document.download',
  DOCUMENT_DELETE = 'document.delete',
  DOCUMENT_VIEW = 'document.view',
  
  // Settings events
  SETTINGS_UPDATE = 'settings.update',
  API_KEY_ADDED = 'api_key.added',
  API_KEY_UPDATED = 'api_key.updated',
  API_KEY_REMOVED = 'api_key.removed',
  API_KEY_USAGE = 'api_key.usage',
  
  // Data access events
  DATA_ACCESS = 'data.access',
  
  // Encryption events
  ENCRYPTION_FAILURE = 'encryption.failure',
  
  // Security events
  RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
  INVALID_INPUT = 'security.invalid_input',
  UNAUTHORIZED_ACCESS = 'security.unauthorized_access',
  SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
  MEDIUM = 'medium',
  HIGH = 'high',
}

interface AuditLogEntry {
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  action: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Logs an audit event
 */
export async function logAuditEvent(
  supabaseClient: any,
  event: {
    eventType: AuditEventType;
    severity: AuditSeverity;
    userId?: string;
    userEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    resource?: string;
    resourceId?: string;
    action: string;
    status: 'success' | 'failure';
    errorMessage?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const logEntry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  // Log to console for immediate visibility
  const logLevel = event.severity === AuditSeverity.CRITICAL || event.severity === AuditSeverity.ERROR
    ? 'error'
    : event.severity === AuditSeverity.WARNING
    ? 'warn'
    : 'info';

  console[logLevel]('[AUDIT]', JSON.stringify(logEntry, null, 2));

  // Store in database for compliance and analysis
  try {
    const { error } = await supabaseClient
      .from('audit_logs')
      .insert({
        event_type: event.eventType,
        severity: event.severity,
        user_id: event.userId || null,
        user_email: event.userEmail || null,
        ip_address: event.ipAddress || null,
        user_agent: event.userAgent || null,
        resource: event.resource || null,
        resource_id: event.resourceId || null,
        action: event.action,
        status: event.status,
        error_message: event.errorMessage || null,
        metadata: event.metadata || null,
      });

    if (error) {
      console.error('[AUDIT] Failed to store audit log:', error);
    }
  } catch (err) {
    // Don't throw - audit logging should never break the main flow
    console.error('[AUDIT] Exception storing audit log:', err);
  }
}

/**
 * Extracts IP address from request headers
 */
export function extractIpAddress(headers: Headers | Record<string, string>): string {
  // Handle both Headers object and plain object
  const get = (key: string) => {
    if (headers instanceof Headers || (headers && typeof headers.get === 'function')) {
      return (headers as Headers).get(key);
    }
    return (headers as Record<string, string>)[key];
  };
  
  return (
    get('x-forwarded-for')?.split(',')[0]?.trim() ||
    get('x-real-ip') ||
    get('cf-connecting-ip') || // Cloudflare
    'unknown'
  );
}

/**
 * Extracts user agent from request headers
 */
export function extractUserAgent(headers: Headers | Record<string, string>): string {
  // Handle both Headers object and plain object
  const get = (key: string) => {
    if (headers instanceof Headers || (headers && typeof headers.get === 'function')) {
      return (headers as Headers).get(key);
    }
    return (headers as Record<string, string>)[key];
  };
  
  return get('user-agent') || 'unknown';
}

/**
 * Sanitizes metadata to remove sensitive information
 */
export function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized = { ...metadata };
  
  // Remove sensitive keys
  const sensitiveKeys = [
    'password',
    'token',
    'api_key',
    'secret',
    'authorization',
    'cookie',
    'session',
  ];

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}
