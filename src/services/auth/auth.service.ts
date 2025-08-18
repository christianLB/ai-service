import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
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
  private prisma: PrismaClient;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshTokenExpiresIn: string;

  constructor() {
    this.prisma = new PrismaClient();
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 0;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  /**
   * Login user and generate tokens
   */
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const { email, password } = credentials;

    // Get user from database
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        full_name: true,
        role: true,
        is_active: true,
      },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is disabled');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  /**
   * Logout user and revoke refresh token
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    // Revoke refresh token
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refresh_tokens.updateMany({
      where: {
        user_id: userId,
        token_hash: tokenHash,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, this.jwtSecret) as any;
    const userId = decoded.userId;
    const tokenHash = this.hashToken(refreshToken);

    // Check if refresh token exists and is valid
    const storedToken = await this.prisma.refresh_tokens.findFirst({
      where: {
        user_id: userId,
        token_hash: tokenHash,
        revoked_at: null,
        expires_at: {
          gt: new Date(),
        },
      },
    });

    if (!storedToken) {
      throw new Error('Invalid refresh token');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }

    // Revoke old refresh token
    await this.prisma.refresh_tokens.update({
      where: { id: storedToken.id },
      data: { revoked_at: new Date() },
    });

    // Generate new tokens
    const accessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.generateRefreshToken(user.id);

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        is_active: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name || '',
      role: user.role || 'user',
      is_active: user.is_active || false,
    };
  }

  /**
   * Create a new user
   */
  async createUser(
    email: string,
    password: string,
    fullName: string,
    role: string = 'user'
  ): Promise<User> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password_hash: passwordHash,
        full_name: fullName,
        role,
        is_active: true,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        is_active: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name || '',
      role: user.role || 'user',
      is_active: user.is_active || false,
    };
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        password_hash: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid old password');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: newPasswordHash },
    });

    // Revoke all refresh tokens for security
    await this.prisma.refresh_tokens.updateMany({
      where: {
        user_id: userId,
        revoked_at: null,
      },
      data: { revoked_at: new Date() },
    });
  }

  /**
   * Reset user password (admin function)
   */
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: passwordHash },
    });

    // Revoke all refresh tokens
    await this.prisma.refresh_tokens.updateMany({
      where: {
        user_id: userId,
        revoked_at: null,
      },
      data: { revoked_at: new Date() },
    });
  }

  /**
   * Activate or deactivate user
   */
  async setUserActive(userId: string, isActive: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { is_active: isActive },
    });

    // If deactivating, revoke all refresh tokens
    if (!isActive) {
      await this.prisma.refresh_tokens.updateMany({
        where: {
          user_id: userId,
          revoked_at: null,
        },
        data: { revoked_at: new Date() },
      });
    }
  }

  /**
   * List all users (admin function)
   */
  async listUsers(options?: {
    skip?: number;
    take?: number;
    role?: string;
    isActive?: boolean;
  }): Promise<{ users: User[]; total: number }> {
    const where: any = {};

    if (options?.role) {
      where.role = options.role;
    }

    if (options?.isActive !== undefined) {
      where.is_active = options.isActive;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: options?.skip || 0,
        take: options?.take || 20,
        select: {
          id: true,
          email: true,
          full_name: true,
          role: true,
          is_active: true,
          created_at: true,
          last_login: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name || '',
        role: user.role || 'user',
        is_active: user.is_active || false,
      })),
      total,
    };
  }

  private generateAccessToken(user: any): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn } as any);
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = jwt.sign({ userId, type: 'refresh' }, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    } as any);
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.parseDuration(this.refreshTokenExpiresIn));

    await this.prisma.refresh_tokens.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    return token;
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    await this.prisma.refresh_tokens.deleteMany({
      where: {
        OR: [{ expires_at: { lt: new Date() } }, { revoked_at: { not: null } }],
      },
    });
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const authService = new AuthService();
