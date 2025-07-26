import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import jwt from 'jsonwebtoken';

// Mock the services
jest.mock('../../services/database.service');
jest.mock('../../services/sync-scheduler.service');
jest.mock('../../middleware/auth.middleware');

import databaseService from '../../services/database.service';
import syncSchedulerService from '../../services/sync-scheduler.service';
import { authMiddleware } from '../../middleware/auth.middleware';

// Mock auth middleware to always pass
(authMiddleware as jest.Mock).mockImplementation((req, res, next) => {
  req.user = { id: 1, email: 'test@example.com' };
  next();
});

describe('Financial Scheduler Endpoints', () => {
  let app: express.Application;
  let financialRouter: Router;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Import the financial router
    jest.isolateModules(() => {
      financialRouter = require('../financial').default;
    });
    
    // Mount the router
    app.use('/api/financial', financialRouter);
  });

  describe('POST /api/financial/scheduler/start', () => {
    it('should start the scheduler with default interval', async () => {
      (syncSchedulerService.start as jest.Mock).mockImplementation(() => {
        console.log('Starting scheduler with 1 hour interval');
      });

      const response = await request(app)
        .post('/api/financial/scheduler/start')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Sync scheduler started successfully',
        data: {
          interval: 3600000, // 1 hour in milliseconds
          nextSync: expect.any(String)
        }
      });

      expect(syncSchedulerService.start).toHaveBeenCalledWith(3600000);
    });

    it('should start the scheduler with custom interval', async () => {
      (syncSchedulerService.start as jest.Mock).mockImplementation(() => {
        console.log('Starting scheduler with custom interval');
      });

      const response = await request(app)
        .post('/api/financial/scheduler/start')
        .set('Authorization', 'Bearer test-token')
        .send({ interval: 1800000 }); // 30 minutes

      expect(response.status).toBe(200);
      expect(response.body.data.interval).toBe(1800000);
      expect(syncSchedulerService.start).toHaveBeenCalledWith(1800000);
    });

    it('should reject intervals less than 5 minutes', async () => {
      const response = await request(app)
        .post('/api/financial/scheduler/start')
        .set('Authorization', 'Bearer test-token')
        .send({ interval: 60000 }); // 1 minute

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Interval must be at least 5 minutes'
      });

      expect(syncSchedulerService.start).not.toHaveBeenCalled();
    });

    it('should reject intervals greater than 24 hours', async () => {
      const response = await request(app)
        .post('/api/financial/scheduler/start')
        .set('Authorization', 'Bearer test-token')
        .send({ interval: 90000000 }); // 25 hours

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Interval cannot exceed 24 hours'
      });

      expect(syncSchedulerService.start).not.toHaveBeenCalled();
    });

    it('should handle scheduler service errors', async () => {
      (syncSchedulerService.start as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to start scheduler');
      });

      const response = await request(app)
        .post('/api/financial/scheduler/start')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to start sync scheduler'
      });
    });

    it('should validate interval is a number', async () => {
      const response = await request(app)
        .post('/api/financial/scheduler/start')
        .set('Authorization', 'Bearer test-token')
        .send({ interval: 'not-a-number' });

      expect(response.status).toBe(400);
      expect(syncSchedulerService.start).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/financial/scheduler/stop', () => {
    it('should stop the scheduler successfully', async () => {
      (syncSchedulerService.stop as jest.Mock).mockImplementation(() => {
        console.log('Stopping scheduler');
      });

      const response = await request(app)
        .post('/api/financial/scheduler/stop')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Sync scheduler stopped successfully'
      });

      expect(syncSchedulerService.stop).toHaveBeenCalled();
    });

    it('should handle scheduler service errors when stopping', async () => {
      (syncSchedulerService.stop as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to stop scheduler');
      });

      const response = await request(app)
        .post('/api/financial/scheduler/stop')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to stop sync scheduler'
      });
    });

    it('should require authentication', async () => {
      // Mock auth middleware to reject
      (authMiddleware as jest.Mock).mockImplementationOnce((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const response = await request(app)
        .post('/api/financial/scheduler/stop')
        .send({});

      expect(response.status).toBe(401);
      expect(syncSchedulerService.stop).not.toHaveBeenCalled();
    });
  });

  describe('Endpoint Path Validation', () => {
    it('should NOT respond to /api/scheduler/start (missing /financial prefix)', async () => {
      const response = await request(app)
        .post('/api/scheduler/start')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBe(404);
    });

    it('should NOT respond to /api/scheduler/stop (missing /financial prefix)', async () => {
      const response = await request(app)
        .post('/api/scheduler/stop')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBe(404);
    });

    it('should respond to correct paths with /financial prefix', async () => {
      (syncSchedulerService.start as jest.Mock).mockImplementation(() => {});
      (syncSchedulerService.stop as jest.Mock).mockImplementation(() => {});

      // Test start endpoint
      const startResponse = await request(app)
        .post('/api/financial/scheduler/start')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(startResponse.status).toBe(200);

      // Test stop endpoint
      const stopResponse = await request(app)
        .post('/api/financial/scheduler/stop')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(stopResponse.status).toBe(200);
    });
  });

  describe('Integration with Sync Status', () => {
    it('should reflect scheduler state in sync-status endpoint', async () => {
      // Mock sync status query
      (databaseService.pool.query as jest.Mock).mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as active_jobs')) {
          return { rows: [{ active_jobs: '0' }] };
        }
        if (query.includes('last_sync_timestamp')) {
          return { 
            rows: [{
              scheduler_enabled: true,
              scheduler_interval: 3600000,
              last_sync_timestamp: new Date().toISOString()
            }]
          };
        }
        return { rows: [] };
      });

      const response = await request(app)
        .get('/api/financial/sync-status')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data.scheduler).toEqual({
        isRunning: true,
        interval: 3600000,
        lastSync: expect.any(String)
      });
    });
  });
});