// Version and Deployment Notification Routes
import { Router, Request, Response } from 'express';
import { TelegramService } from '../services/communication/telegram.service';
import { logger } from '../utils/log';

const router = Router();

// Get Telegram service instance
function getTelegramService(): TelegramService | null {
  const globalService = (global as any).telegramService;
  if (globalService) {
    return globalService;
  }
  
  logger.error('Telegram service not initialized');
  return null;
}

// Get current version information
router.get('/version', (req: Request, res: Response) => {
  const versionInfo = {
    version: process.env.VERSION || 'development',
    buildDate: process.env.BUILD_DATE || 'unknown',
    commit: process.env.COMMIT || 'unknown',
    commitShort: process.env.COMMIT_SHORT || 'unknown',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };

  res.json({
    success: true,
    data: versionInfo
  });
});

// Watchtower deployment notification endpoint
router.post('/watchtower/notify', async (req: Request, res: Response) => {
  try {
    console.log('📦 Watchtower notification received:', req.body);
    
    const notification = req.body;
    
    // Parse Watchtower notification
    const containerName = notification.title || 'ai-service';
    const message = notification.message || 'Container updated';
    
    // Extract version info if available
    const versionInfo = {
      version: process.env.VERSION || 'unknown',
      commit: process.env.COMMIT_SHORT || 'unknown',
      buildDate: process.env.BUILD_DATE || 'unknown'
    };
    
    // Send Telegram notification
    try {
      const telegramService = getTelegramService();
      if (!telegramService) {
        console.log('⚠️ Telegram service not available for notifications');
        res.json({
          success: true,
          message: 'Notification processed (Telegram unavailable)',
          version: versionInfo
        });
        return;
      }
      
      const deployMessage = `🚀 *Nueva Versión Desplegada*\n\n` +
        `📦 Container: \`${containerName}\`\n` +
        `🏷️ Versión: \`${versionInfo.version}\`\n` +
        `📋 Commit: \`${versionInfo.commit}\`\n` +
        `🕐 Build: \`${versionInfo.buildDate}\`\n` +
        `📝 Detalle: ${message}\n\n` +
        `✅ Sistema actualizado automáticamente`;
      
      // Send to configured admin chat
      await telegramService.sendAlert(deployMessage, 'info');
      
      console.log('✅ Deployment notification sent via Telegram');
    } catch (telegramError) {
      console.error('❌ Failed to send Telegram notification:', telegramError);
    }
    
    // Log deployment
    console.log(`🎉 Deployment completed: ${versionInfo.version} (${versionInfo.commit})`);
    
    res.json({
      success: true,
      message: 'Notification processed successfully',
      version: versionInfo
    });
    
  } catch (error) {
    console.error('❌ Error processing Watchtower notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process notification'
    });
  }
});

// Manual deployment test notification
router.post('/test-notification', async (req: Request, res: Response) => {
  try {
    const telegramService = getTelegramService();
    if (!telegramService) {
      res.status(503).json({
        success: false,
        error: 'Telegram service not available'
      });
      return;
    }
    
    const versionInfo = {
      version: process.env.VERSION || 'development',
      commit: process.env.COMMIT_SHORT || 'unknown',
      buildDate: process.env.BUILD_DATE || 'unknown'
    };
    
    const testMessage = `🧪 *Test de Notificación*\n\n` +
      `📦 Sistema: AI Service\n` +
      `🏷️ Versión: \`${versionInfo.version}\`\n` +
      `📋 Commit: \`${versionInfo.commit}\`\n` +
      `🕐 Build: \`${versionInfo.buildDate}\`\n\n` +
      `✅ Notificaciones funcionando correctamente`;
    
    await telegramService.sendAlert(testMessage, 'info');
    
    res.json({
      success: true,
      message: 'Test notification sent',
      version: versionInfo
    });
    
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

export default router;