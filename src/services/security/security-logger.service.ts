import { Pool } from 'pg';
import { logger } from '../../utils/log';

export interface SecurityEvent {
  event_type: string;
  user_id?: string;
  email?: string;
  ip_address: string;
  user_agent?: string;
  details?: any;
  success: boolean;
}

export class SecurityLoggerService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Log to database
      const query = `
        INSERT INTO security_logs (
          event_type, user_id, email, ip_address, 
          user_agent, details, success, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `;

      await this.pool.query(query, [
        event.event_type,
        event.user_id || null,
        event.email || null,
        event.ip_address,
        event.user_agent || null,
        JSON.stringify(event.details || {}),
        event.success,
      ]);

      // Also log to application logs
      const logLevel = event.success ? 'info' : 'warn';
      logger[logLevel](`Security Event: ${event.event_type}`, {
        email: event.email,
        ip: event.ip_address,
        success: event.success,
        details: event.details,
      });

      // Alert on suspicious activities
      if (this.isSuspiciousActivity(event)) {
        await this.alertSuspiciousActivity(event);
      }
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  private isSuspiciousActivity(event: SecurityEvent): boolean {
    // Define suspicious patterns
    const suspiciousPatterns = [
      event.event_type === 'login_failed' && !event.success,
      event.event_type === 'unauthorized_access',
      event.event_type === 'invalid_token',
      event.event_type === 'brute_force_detected',
      event.event_type === 'suspicious_ip',
      event.event_type === 'permission_denied',
    ];

    return suspiciousPatterns.some((pattern) => pattern);
  }

  private async alertSuspiciousActivity(event: SecurityEvent): Promise<void> {
    // Send alert to administrators
    logger.error('🚨 SUSPICIOUS ACTIVITY DETECTED', {
      type: event.event_type,
      email: event.email,
      ip: event.ip_address,
      timestamp: new Date().toISOString(),
    });

    // If Telegram is configured, send alert
    const telegramService = (global as any).telegramService;
    if (telegramService) {
      await telegramService.sendAlert(
        `🚨 Security Alert: ${event.event_type}\n` +
          `Email: ${event.email || 'N/A'}\n` +
          `IP: ${event.ip_address}\n` +
          `Time: ${new Date().toLocaleString()}`
      );
    }
  }

  async getSecurityReport(days: number = 7): Promise<any> {
    try {
      const query = `
        SELECT 
          event_type,
          COUNT(*) as count,
          COUNT(CASE WHEN success = false THEN 1 END) as failures,
          COUNT(DISTINCT ip_address) as unique_ips,
          COUNT(DISTINCT email) as unique_users
        FROM security_logs
        WHERE created_at > NOW() - INTERVAL '${days} days'
        GROUP BY event_type
        ORDER BY count DESC
      `;

      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to generate security report:', error);
      return [];
    }
  }
}

// Create security logs table migration
export const createSecurityLogsTable = `
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255),
  ip_address INET NOT NULL,
  user_agent TEXT,
  details JSONB,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_logs_event_type ON security_logs(event_type, created_at);
CREATE INDEX idx_security_logs_email ON security_logs(email, created_at);
CREATE INDEX idx_security_logs_ip ON security_logs(ip_address, created_at);
`;
