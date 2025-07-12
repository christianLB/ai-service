import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { config } from '../../config';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private pool: Pool;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshTokenExpiresIn: string;

  constructor(pool: Pool) {
    this.pool = pool;
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  }

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const { email, password } = credentials;

    // Get user from database
    const userQuery = `
      SELECT id, email, password_hash, full_name, role, is_active
      FROM users
      WHERE email = $1
    `;
    const result = await this.pool.query(userQuery, [email]);

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is disabled');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await this.pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    // Revoke refresh token
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.pool.query(
      'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND token_hash = $2',
      [userId, tokenHash]
    );
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, this.jwtSecret) as any;
    const userId = decoded.userId;

    // Check if token exists and is not revoked
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const tokenQuery = `
      SELECT * FROM refresh_tokens
      WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
    `;
    const tokenResult = await this.pool.query(tokenQuery, [userId, tokenHash]);

    if (tokenResult.rows.length === 0) {
      throw new Error('Invalid refresh token');
    }

    // Get user
    const userQuery = 'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1';
    const userResult = await this.pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      throw new Error('User not found or inactive');
    }

    const user = userResult.rows[0];

    // Revoke old refresh token
    await this.pool.query(
      'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenResult.rows[0].id]
    );

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.generateRefreshToken(user.id);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async getCurrentUser(userId: string): Promise<User> {
    const query = 'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1';
    const result = await this.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  async createUser(email: string, password: string, fullName: string, role: string = 'user'): Promise<User> {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const query = `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, full_name, role, is_active
    `;
    const result = await this.pool.query(query, [email, passwordHash, fullName, role]);

    return result.rows[0];
  }

  private generateAccessToken(user: any): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn } as any);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const payload = { userId, type: 'refresh' };
    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: this.refreshTokenExpiresIn } as any);
    
    // Store token hash in database
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );

    return token;
  }

  // Development bypass method
  async getDevUser(): Promise<User | null> {
    if (process.env.NODE_ENV === 'development' && process.env.AUTH_BYPASS === 'true') {
      return {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'dev@local',
        full_name: 'Development User',
        role: 'admin',
        is_active: true
      };
    }
    return null;
  }
}