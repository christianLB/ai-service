import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/log';
import { v4 as uuidv4 } from 'uuid';
import { migrateFinancialSchema } from './database-migrations';

interface WorkflowRecord {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  workflow_data: any;
  version: number;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  tags?: string[];
}

interface ExecutionRecord {
  id: string;
  workflow_id: string;
  status: 'running' | 'success' | 'error' | 'timeout';
  start_time: Date;
  end_time?: Date;
  input_data?: any;
  output_data?: any;
  error_message?: string;
  execution_time_ms?: number;
}

class DatabaseService {
  public pool: Pool; // Changed from private to public for health check statistics
  private initialized = false;

  constructor() {
    // Validate required environment variables
    const requiredEnvVars = [
      'POSTGRES_HOST',
      'POSTGRES_PORT',
      'POSTGRES_DB',
      'POSTGRES_USER',
      'POSTGRES_PASSWORD',
    ];
    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}. Please set them in .env.local`
      );
    }

    this.pool = new Pool({
      host: process.env.POSTGRES_HOST!,
      port: parseInt(process.env.POSTGRES_PORT!),
      database: process.env.POSTGRES_DB!,
      user: process.env.POSTGRES_USER!,
      password: process.env.POSTGRES_PASSWORD!,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased to 10 seconds for CI environment
      statement_timeout: 30000, // 30 second statement timeout
      query_timeout: 30000, // 30 second query timeout
    });

    this.pool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err);
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Log connection details (without password)
      // console.log('[DB] Attempting database connection...');
      logger.info('Attempting database connection:', {
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        NODE_ENV: process.env.NODE_ENV,
      });

      // Add timeout to the entire initialization
      const initPromise = this.createTables();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `Database initialization timeout after 10 seconds. Check if database is running on ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`
            )
          );
        }, 10000); // 10 second timeout
      });

      await Promise.race([initPromise, timeoutPromise]);

      this.initialized = true;
      // console.log('[DB] Database service initialized successfully');
      logger.info('Database service initialized successfully');
    } catch (error: any) {
      console.error('[DB] Database initialization failed:', error.message);
      logger.error('Database initialization failed:', error.message);
      logger.error('Full error:', error);
      logger.error('Database config:', {
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
      });
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    // console.log('[DB] Getting pool connection...');
    let client;
    try {
      // Add timeout for getting connection from pool
      const connectPromise = this.pool.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Failed to get database connection from pool after 10 seconds'));
        }, 10000);
      });

      client = (await Promise.race([connectPromise, timeoutPromise])) as PoolClient;
      // console.log('[DB] Pool connection obtained!');
    } catch (error: any) {
      console.error('[DB] Failed to get pool connection:', error.message);
      throw error;
    }

    try {
      // Tabla de workflows
      await client.query(`
        CREATE TABLE IF NOT EXISTS workflows (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          active BOOLEAN DEFAULT FALSE,
          workflow_data JSONB NOT NULL,
          version INTEGER DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by VARCHAR(255),
          tags TEXT[]
        )
      `);

      // Tabla de ejecuciones
      await client.query(`
        CREATE TABLE IF NOT EXISTS executions (
          id VARCHAR(36) PRIMARY KEY,
          workflow_id VARCHAR(36) REFERENCES workflows(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL,
          start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          end_time TIMESTAMP WITH TIME ZONE,
          input_data JSONB,
          output_data JSONB,
          error_message TEXT,
          execution_time_ms INTEGER
        )
      `);

      // Tabla de métricas
      await client.query(`
        CREATE TABLE IF NOT EXISTS metrics (
          id SERIAL PRIMARY KEY,
          metric_name VARCHAR(100) NOT NULL,
          metric_value NUMERIC NOT NULL,
          metric_type VARCHAR(50) NOT NULL,
          tags JSONB,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Índices para optimización
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows(name);
        CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(active);
        CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);
        CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions(workflow_id);
        CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
        CREATE INDEX IF NOT EXISTS idx_executions_start_time ON executions(start_time);
        CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);
      `);

      logger.info('Database tables created successfully');

      // Create financial schema if it doesn't exist
      await this.createFinancialSchema(client);
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  private async createFinancialSchema(client: any): Promise<void> {
    try {
      // Create schema
      await client.query('CREATE SCHEMA IF NOT EXISTS financial');

      // Always check and update schema
      logger.info('Checking financial schema...');

      // ALWAYS run migration to ensure schema consistency
      logger.info('🔧 Running financial schema migration for consistency...');
      try {
        await migrateFinancialSchema(client);
        logger.info('✅ Migration completed successfully');
      } catch (migrationError: any) {
        logger.error('❌ Migration failed:', migrationError.message);
        logger.error('Migration stack trace:', migrationError.stack);
        throw migrationError;
      }

      // Verify critical columns exist
      const verifyCheck = await client.query(`
        SELECT 
          EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'financial' 
            AND table_name = 'accounts' 
            AND column_name = 'wallet_address'
          ) as has_wallet_address,
          EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'financial' 
            AND table_name = 'categories'
          ) as has_categories_table,
          EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'financial' 
            AND table_name = 'transaction_categorizations'
          ) as has_categorizations_table
      `);

      const verification = verifyCheck.rows[0];

      if (
        !verification.has_wallet_address ||
        !verification.has_categories_table ||
        !verification.has_categorizations_table
      ) {
        logger.error('CRITICAL: Schema verification failed!', verification);
        throw new Error('Migration incomplete - critical tables or columns missing');
      }

      logger.info('✅ Financial schema migration completed and verified');
    } catch (error: any) {
      // If schema already exists, that's fine
      if (error.code !== '42P06') {
        // 42P06 = schema already exists
        logger.error('Error creating financial schema:', error.message);
        throw error;
      }
    }
  }

  // CRUD Operations para Workflows
  async createWorkflow(
    workflow: Omit<WorkflowRecord, 'id' | 'created_at' | 'updated_at' | 'version'>
  ): Promise<string> {
    const client = await this.pool.connect();
    const id = uuidv4();

    try {
      const query = `
        INSERT INTO workflows (id, name, description, active, workflow_data, created_by, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      const values = [
        id,
        workflow.name,
        workflow.description || null,
        workflow.active,
        JSON.stringify(workflow.workflow_data),
        workflow.created_by || null,
        workflow.tags || [],
      ];

      await client.query(query, values);
      logger.info(`Workflow created: ${id}`);
      return id;
    } finally {
      client.release();
    }
  }

  async getWorkflow(id: string): Promise<WorkflowRecord | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query('SELECT * FROM workflows WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getAllWorkflows(active?: boolean): Promise<WorkflowRecord[]> {
    const client = await this.pool.connect();

    try {
      let query = 'SELECT * FROM workflows';
      const values: any[] = [];

      if (active !== undefined) {
        query += ' WHERE active = $1';
        values.push(active);
      }

      query += ' ORDER BY updated_at DESC';

      const result = await client.query(query, values);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateWorkflow(
    id: string,
    updates: Partial<Omit<WorkflowRecord, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'workflow_data') {
          setParts.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          setParts.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      });

      setParts.push('updated_at = NOW()');
      setParts.push('version = version + 1');
      values.push(id);

      const query = `UPDATE workflows SET ${setParts.join(', ')} WHERE id = $${paramCount}`;
      const result = await client.query(query, values);

      logger.info(`Workflow updated: ${id}`);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const result = await client.query('DELETE FROM workflows WHERE id = $1', [id]);
      logger.info(`Workflow deleted: ${id}`);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  // Gestión de Ejecuciones
  async createExecution(execution: Omit<ExecutionRecord, 'id' | 'start_time'>): Promise<string> {
    const client = await this.pool.connect();
    const id = uuidv4();

    try {
      const query = `
        INSERT INTO executions (id, workflow_id, status, input_data)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;

      const values = [
        id,
        execution.workflow_id,
        execution.status,
        execution.input_data ? JSON.stringify(execution.input_data) : null,
      ];

      await client.query(query, values);
      return id;
    } finally {
      client.release();
    }
  }

  async updateExecution(
    id: string,
    updates: Partial<Omit<ExecutionRecord, 'id' | 'workflow_id' | 'start_time'>>
  ): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'output_data' || key === 'input_data') {
          setParts.push(`${key} = $${paramCount}`);
          values.push(value ? JSON.stringify(value) : null);
        } else {
          setParts.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      });

      if (
        updates.status === 'success' ||
        updates.status === 'error' ||
        updates.status === 'timeout'
      ) {
        setParts.push('end_time = NOW()');
      }

      values.push(id);
      const query = `UPDATE executions SET ${setParts.join(', ')} WHERE id = $${paramCount}`;

      const result = await client.query(query, values);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  async getExecutionsForWorkflow(workflowId: string, limit = 50): Promise<ExecutionRecord[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM executions 
        WHERE workflow_id = $1 
        ORDER BY start_time DESC 
        LIMIT $2
      `;

      const result = await client.query(query, [workflowId, limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Sistema de Métricas
  async recordMetric(
    name: string,
    value: number,
    type: string,
    tags?: Record<string, any>
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO metrics (metric_name, metric_value, metric_type, tags)
        VALUES ($1, $2, $3, $4)
      `;

      await client.query(query, [name, value, type, tags ? JSON.stringify(tags) : null]);
    } finally {
      client.release();
    }
  }

  async getMetrics(name: string, hours = 24): Promise<any[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM metrics 
        WHERE metric_name = $1 
        AND timestamp > NOW() - INTERVAL '${hours} hours'
        ORDER BY timestamp DESC
      `;

      const result = await client.query(query, [name]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Estadísticas y Analytics
  async getWorkflowStats(): Promise<any> {
    const client = await this.pool.connect();

    try {
      const [totalWorkflows, activeWorkflows, totalExecutions, recentExecutions] =
        await Promise.all([
          client.query('SELECT COUNT(*) as count FROM workflows'),
          client.query('SELECT COUNT(*) as count FROM workflows WHERE active = true'),
          client.query('SELECT COUNT(*) as count FROM executions'),
          client.query(`
          SELECT COUNT(*) as count FROM executions 
          WHERE start_time > NOW() - INTERVAL '24 hours'
        `),
        ]);

      return {
        total_workflows: parseInt(totalWorkflows.rows[0].count),
        active_workflows: parseInt(activeWorkflows.rows[0].count),
        total_executions: parseInt(totalExecutions.rows[0].count),
        executions_last_24h: parseInt(recentExecutions.rows[0].count),
      };
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection closed');
  }

  async healthCheck(): Promise<boolean> {
    let client;
    try {
      // Add timeout to prevent hanging connections
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      );

      const connectPromise = this.pool.connect();
      client = (await Promise.race([connectPromise, timeoutPromise])) as PoolClient;

      await client.query('SELECT 1');
      return true;
    } catch (error: any) {
      logger.error('Database health check failed:', error.message);
      return false;
    } finally {
      if (client) {
        try {
          client.release();
        } catch (releaseError: any) {
          logger.error('Error releasing client in health check:', releaseError.message);
        }
      }
    }
  }
}

export const db = new DatabaseService();
export { WorkflowRecord, ExecutionRecord };
