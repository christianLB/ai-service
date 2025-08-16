import express from "express";
import cors from "cors";
import helmet from "helmet";
import Redis from "ioredis";
import { env } from "@ai/config";
// @ts-ignore - package built locally
import { createStandardObservability } from "@ai/observability";

// Redis client
const redis = new Redis(env.REDIS_URL);

// Create observability setup
const observability = createStandardObservability({
  serviceName: 'comm-svc',
  version: process.env.npm_package_version,
  environment: process.env.NODE_ENV,
  dependencies: {
    redis: { url: env.REDIS_URL }
  }
});

const { metricsRegistry } = observability;

// Create business-specific metrics for Communication Service
const messagesSent = metricsRegistry!.createCounter(
  'messages_sent_total',
  'Total number of messages sent',
  ['channel', 'type', 'status']
);

const messagesReceived = metricsRegistry!.createCounter(
  'messages_received_total',
  'Total number of messages received',
  ['channel', 'type', 'status']
);

const webhookDeliveries = metricsRegistry!.createCounter(
  'webhook_deliveries_total',
  'Total webhook delivery attempts',
  ['endpoint', 'status_code', 'status']
);

const webhookLatency = metricsRegistry!.createHistogram(
  'webhook_latency_seconds',
  'Webhook delivery latency',
  ['endpoint'],
  [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10]
);

const emailsSent = metricsRegistry!.createCounter(
  'emails_sent_total',
  'Total emails sent',
  ['type', 'status']
);

const smsMessagesSent = metricsRegistry!.createCounter(
  'sms_messages_sent_total',
  'Total SMS messages sent',
  ['provider', 'status']
);

const notificationQueue = metricsRegistry!.createGauge(
  'notification_queue_size',
  'Current size of notification queue',
  ['type', 'priority']
);

const activeConnections = metricsRegistry!.createGauge(
  'active_connections_total',
  'Number of active connections',
  ['type']
);

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Setup observability middleware
observability.setupExpress(app);

// Communication endpoints with metrics

// Send message endpoint
app.post("/api/comm/send-message", async (req, res) => {
  const { channel = 'email', type = 'notification', recipient, subject, content } = req.body;
  
  try {
    if (!recipient || !content) {
      return res.status(400).json({ message: "Recipient and content are required" });
    }

    // Simulate message sending
    const delay = Math.random() * 1000 + 200; // 200ms-1.2s
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = {
      messageId,
      channel,
      type,
      recipient,
      subject,
      status: 'sent',
      timestamp: new Date().toISOString()
    };
    
    // Record metrics based on channel type
    messagesSent.inc({ channel, type, status: 'success' });
    
    if (channel === 'email') {
      emailsSent.inc({ type, status: 'success' });
    } else if (channel === 'sms') {
      smsMessagesSent.inc({ provider: 'twilio', status: 'success' });
    }
    
    res.json(result);
  } catch (err) {
    messagesSent.inc({ channel, type, status: 'error' });
    
    if (channel === 'email') {
      emailsSent.inc({ type, status: 'error' });
    } else if (channel === 'sms') {
      smsMessagesSent.inc({ provider: 'twilio', status: 'error' });
    }
    
    res.status(500).json({ message: (err as Error).message });
  }
});

// Webhook delivery endpoint
app.post("/api/comm/webhook", async (req, res) => {
  const startTime = Date.now();
  const { endpoint, payload, retries = 0 } = req.body;
  
  try {
    if (!endpoint || !payload) {
      return res.status(400).json({ message: "Endpoint and payload are required" });
    }

    // Simulate webhook delivery
    const delay = Math.random() * 2000 + 100; // 100ms-2.1s
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate occasional failures
    const shouldFail = Math.random() < 0.1; // 10% failure rate
    const statusCode = shouldFail ? (Math.random() < 0.5 ? 404 : 500) : 200;
    
    const latency = (Date.now() - startTime) / 1000;
    const status = statusCode < 400 ? 'success' : 'error';
    
    // Record metrics
    webhookDeliveries.inc({ 
      endpoint: new URL(endpoint).hostname, 
      status_code: statusCode.toString(), 
      status 
    });
    webhookLatency.observe({ endpoint: new URL(endpoint).hostname }, latency);
    
    const result = {
      endpoint,
      statusCode,
      status,
      retries,
      latency: `${latency.toFixed(3)}s`,
      timestamp: new Date().toISOString()
    };
    
    if (statusCode >= 400) {
      return res.status(statusCode).json({ ...result, message: 'Webhook delivery failed' });
    }
    
    res.json(result);
  } catch (err) {
    const latency = (Date.now() - startTime) / 1000;
    
    webhookDeliveries.inc({ 
      endpoint: 'unknown', 
      status_code: '500', 
      status: 'error' 
    });
    webhookLatency.observe({ endpoint: 'unknown' }, latency);
    
    res.status(500).json({ message: (err as Error).message });
  }
});

// Receive message endpoint (for incoming webhooks)
app.post("/api/comm/receive-message", async (req, res) => {
  const { channel = 'webhook', type = 'incoming', source, content } = req.body;
  
  try {
    if (!source || !content) {
      return res.status(400).json({ message: "Source and content are required" });
    }

    const messageId = `recv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Record received message
    messagesReceived.inc({ channel, type, status: 'success' });
    
    res.json({
      messageId,
      channel,
      type,
      source,
      status: 'received',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    messagesReceived.inc({ channel, type, status: 'error' });
    res.status(500).json({ message: (err as Error).message });
  }
});

// Get communication stats endpoint
app.get("/api/comm/stats", async (req, res) => {
  try {
    // Mock queue sizes
    const queueSizes = {
      email: { high: Math.floor(Math.random() * 10), normal: Math.floor(Math.random() * 50), low: Math.floor(Math.random() * 100) },
      sms: { high: Math.floor(Math.random() * 5), normal: Math.floor(Math.random() * 20), low: Math.floor(Math.random() * 50) },
      webhook: { high: Math.floor(Math.random() * 3), normal: Math.floor(Math.random() * 15), low: Math.floor(Math.random() * 30) }
    };
    
    // Update queue metrics
    notificationQueue.reset();
    Object.entries(queueSizes).forEach(([type, priorities]) => {
      Object.entries(priorities).forEach(([priority, size]) => {
        notificationQueue.set({ type, priority }, size);
      });
    });
    
    // Update active connections
    activeConnections.set({ type: 'websocket' }, Math.floor(Math.random() * 100) + 50);
    activeConnections.set({ type: 'webhook' }, Math.floor(Math.random() * 20) + 10);
    
    res.json({
      queueSizes,
      activeConnections: {
        websocket: Math.floor(Math.random() * 100) + 50,
        webhook: Math.floor(Math.random() * 20) + 10
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// Function to simulate communication operations and update metrics
async function updateCommMetrics() {
  try {
    // Simulate background communication activities
    const channels = ['email', 'sms', 'webhook', 'push'];
    const types = ['notification', 'alert', 'reminder', 'update'];
    
    // Random message activity
    if (Math.random() < 0.3) { // 30% chance
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      
      // Simulate outgoing message
      messagesSent.inc({ channel, type, status: 'success' });
      
      if (channel === 'email') {
        emailsSent.inc({ type, status: 'success' });
      } else if (channel === 'sms') {
        smsMessagesSent.inc({ provider: 'twilio', status: 'success' });
      }
    }
    
    // Random incoming message
    if (Math.random() < 0.2) { // 20% chance
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      messagesReceived.inc({ channel, type, status: 'success' });
    }
    
    // Random webhook delivery
    if (Math.random() < 0.15) { // 15% chance
      const endpoints = ['api.example.com', 'hooks.slack.com', 'webhook.site'];
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const statusCode = Math.random() < 0.9 ? '200' : '500'; // 90% success rate
      const status = statusCode === '200' ? 'success' : 'error';
      
      webhookDeliveries.inc({ endpoint, status_code: statusCode, status });
    }
  } catch (error) {
    console.error('Failed to update communication metrics:', error);
  }
}

// Update communication metrics every 20 seconds
setInterval(updateCommMetrics, 20000);
// Initial update
updateCommMetrics();

const port = Number(process.env.PORT ?? 3003);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[comm-svc] listening on :${port}`);
});
