import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

interface BruteForceOptions {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

export function createBruteForceProtection(pool: Pool, options: BruteForceOptions) {
  const { maxAttempts, windowMs, blockDurationMs } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const email = req.body.email;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    if (!email) {
      next();
      return;
    }

    try {
      // Check recent failed attempts for this email/IP combination
      const checkQuery = `
        SELECT COUNT(*) as failed_attempts
        FROM login_attempts
        WHERE (email = $1 OR ip_address = $2::inet)
          AND success = false
          AND attempted_at > NOW() - INTERVAL '${windowMs} milliseconds'
      `;

      const result = await pool.query(checkQuery, [email, ip]);
      const failedAttempts = parseInt(result.rows[0].failed_attempts);

      if (failedAttempts >= maxAttempts) {
        // Check if user is currently blocked
        const blockCheckQuery = `
          SELECT COUNT(*) as is_blocked
          FROM login_attempts
          WHERE (email = $1 OR ip_address = $2::inet)
            AND success = false
            AND attempted_at > NOW() - INTERVAL '${blockDurationMs} milliseconds'
          HAVING COUNT(*) >= $3
        `;

        const blockResult = await pool.query(blockCheckQuery, [email, ip, maxAttempts]);

        if (blockResult.rows.length > 0) {
          // Log the blocked attempt
          await pool.query(
            'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)',
            [email, ip, false]
          );

          res.status(429).json({
            error: 'Too many failed login attempts. Please try again later.',
            retryAfter: Math.ceil(blockDurationMs / 1000)
          });
          return;
        }
      }

      next();
    } catch (error) {
      console.error('Brute force check error:', error);
      // Don't block on error, but log it
      next();
    }
  };
}

// Clean up old login attempts periodically
export async function cleanupLoginAttempts(pool: Pool, retentionDays: number = 7) {
  try {
    const query = `
      DELETE FROM login_attempts
      WHERE attempted_at < NOW() - INTERVAL '${retentionDays} days'
    `;

    const result = await pool.query(query);
    console.log(`Cleaned up ${result.rowCount} old login attempts`);
  } catch (error) {
    console.error('Error cleaning up login attempts:', error);
  }
}