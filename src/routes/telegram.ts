import { Router, Request, Response, NextFunction } from 'express';
import { TelegramService } from '../services/communication/telegram.service';
import { FinancialDatabaseService } from '../services/financial/database.service';
import { logger } from '../utils/log';

const router = Router();

let telegramService: TelegramService;

// Obtener servicio de Telegram (inicializado en index.ts)
function getTelegramService(): TelegramService | null {
  // Primero intentar obtener la instancia global
  const globalService = (global as any).telegramService;
  if (globalService) {
    return globalService;
  }
  
  // Si no hay instancia global, verificar si está configurado
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) {
    logger.error('Telegram service not configured');
    return null;
  }
  
  // No deberíamos llegar aquí si la inicialización funcionó
  logger.error('Telegram service not initialized at startup');
  return null;
}

// Webhook endpoint para recibir mensajes de Telegram
router.post('/webhook', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const service = getTelegramService();
    if (!service) {
      res.status(500).json({ error: 'Telegram service not configured' });
      return;
    }

    const update = req.body;
    logger.info('Webhook received:', JSON.stringify(update, null, 2));

    await service.processWebhook(update);
    
    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint para enviar mensaje manual
router.post('/send-message', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const service = getTelegramService();
    if (!service) {
      res.status(500).json({ error: 'Telegram service not configured' });
      return;
    }

    const { chatId, message, options } = req.body;
    
    if (!chatId || !message) {
      res.status(400).json({ error: 'chatId and message are required' });
      return;
    }

    await service.sendMessage(chatId, message, options);
    
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Endpoint para enviar alerta
router.post('/send-alert', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const service = getTelegramService();
    if (!service) {
      res.status(500).json({ error: 'Telegram service not configured' });
      return;
    }

    const { type, priority, message, data } = req.body;
    
    if (!type || !priority || !message) {
      res.status(400).json({ error: 'type, priority and message are required' });
      return;
    }

    const alert = {
      type,
      priority,
      message,
      data,
      timestamp: new Date()
    };

    await service.sendAlert(alert);
    
    res.json({ success: true, message: 'Alert sent successfully' });
  } catch (error) {
    logger.error('Error sending alert:', error);
    res.status(500).json({ error: 'Failed to send alert' });
  }
});

// Endpoint para configurar webhook
router.post('/setup-webhook', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const service = getTelegramService();
    if (!service) {
      res.status(500).json({ error: 'Telegram service not configured' });
      return;
    }

    const { url } = req.body;
    
    if (!url) {
      res.status(400).json({ error: 'url is required' });
      return;
    }

    await service.setWebhook(url);
    
    res.json({ success: true, message: 'Webhook configured successfully' });
  } catch (error) {
    logger.error('Error setting webhook:', error);
    res.status(500).json({ error: 'Failed to set webhook' });
  }
});

// Endpoint para obtener estado del servicio
router.get('/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const service = getTelegramService();
    const isConfigured = !!service;
    
    res.json({
      configured: isConfigured,
      botToken: !!process.env.TELEGRAM_BOT_TOKEN,
      chatId: !!process.env.TELEGRAM_CHAT_ID,
      webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
      alertsEnabled: process.env.TELEGRAM_ALERTS_ENABLED === 'true'
    });
  } catch (error) {
    logger.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;