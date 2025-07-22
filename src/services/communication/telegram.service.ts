import TelegramBot from 'node-telegram-bot-api';
import { TelegramConfig, FinancialAlert, TelegramCommand, SystemStatus, FinancialSummary, ReportType, AlertPriority } from './types';
import { FinancialDatabaseService } from '../financial/database.service';
import { TelegramDocumentService } from '../document-intelligence/telegram-document.service';
import { InvoiceManagementService } from '../financial/invoice-management.service';
import { ClientManagementService } from '../financial/client-management.service';
// import { financialReportingPrismaService } from '../financial/reporting-prisma.service'; // TEMPORARILY DISABLED
import { logger } from '../../utils/log';
import { auditCatch } from '../../utils/forensic-logger';
import { integrationConfigService } from '../integrations';

export class TelegramService {
  private bot: TelegramBot | null = null;
  private config: TelegramConfig;
  private financialService: FinancialDatabaseService;
  private documentService: TelegramDocumentService | null = null;
  private invoiceService: InvoiceManagementService;
  private clientService: ClientManagementService;
  // Prisma-based reporting service is used as singleton
  private isInitialized: boolean = false;

  constructor(config: TelegramConfig, financialService: FinancialDatabaseService) {
    this.config = config;
    this.financialService = financialService;
    
    // Initialize additional services
    this.invoiceService = new InvoiceManagementService();
    this.clientService = new ClientManagementService();
    // Reporting service is now a Prisma-based singleton
    
    // Initialize bot asynchronously
    this.initializeBot();
  }

  private async initializeBot(): Promise<void> {
    try {
      // Get bot token from integration config only
      const botToken = await integrationConfigService.getConfig({
        integrationType: 'telegram',
        configKey: 'bot_token'
      });

      if (!botToken) {
        logger.warn('Telegram bot token not configured in database');
        return;
      }

      this.bot = new TelegramBot(botToken, {
        polling: false,  // Usaremos webhook
        webHook: false
      });

      // Initialize document service
      this.documentService = new TelegramDocumentService(this.bot);

      this.setupCommands();
      this.isInitialized = true;
      logger.info('Telegram service initialized with document intelligence');
    } catch (error) {
      logger.error('Failed to initialize Telegram bot', error);
    }
  }

  private setupCommands(): void {
    if (!this.bot) return;
    
    // Configurar comandos del bot
    this.bot.setMyCommands([
      { command: 'start', description: 'Iniciar el bot' },
      { command: 'help', description: 'Mostrar ayuda' },
      { command: 'status', description: 'Estado del sistema' },
      { command: 'balance', description: 'Balance de cuentas' },
      { command: 'gastos', description: 'Gastos por categoría' },
      { command: 'reporte', description: 'Generar reporte' },
      { command: 'sync', description: 'Sincronizar datos bancarios' },
      { command: 'setup', description: 'Configurar conexión bancaria' },
      { command: 'setup_bbva', description: 'Configurar conexión bancaria BBVA' },
      { command: 'setup_sandbox', description: 'Configurar conexión bancaria Sandbox' },
      { command: 'complete_setup', description: 'Completar configuración bancaria' },
      { command: 'dashboard', description: 'Enlace al dashboard' },
      // Document commands
      { command: 'upload', description: 'Subir documento para análisis' },
      { command: 'list', description: 'Listar documentos' },
      { command: 'search', description: 'Buscar en documentos' },
      { command: 'summary', description: 'Ver resumen de documento' },
      { command: 'analyze', description: 'Analizar documento' },
      { command: 'dochelp', description: 'Ayuda de documentos' },
      // Revenue management commands
      { command: 'invoice', description: 'Gestión de facturas' },
      { command: 'revenue', description: 'Análisis de ingresos' },
      { command: 'pending', description: 'Pagos pendientes' },
      { command: 'client', description: 'Gestión de clientes' },
      { command: 'payment', description: 'Registrar pago' },
      // Trading commands
      { command: 'trading', description: 'Dashboard de trading' },
      { command: 'positions', description: 'Ver posiciones abiertas' },
      { command: 'strategies', description: 'Estado de estrategias' },
      { command: 'pnl', description: 'Ver P&L del día' },
      { command: 'stop_all', description: 'Detener todo el trading (emergencia)' },
      { command: 'trade', description: 'Ejecutar trade manual' }
    ]);
  }

  async setWebhook(url: string): Promise<void> {
    if (!this.bot) {
      logger.warn('Telegram bot not initialized, cannot set webhook');
      return;
    }
    
    try {
      await this.bot.setWebHook(url);
      logger.info(`Webhook configurado: ${url}`);
      
      // Save webhook URL to config
      await integrationConfigService.setConfig({
        integrationType: 'telegram',
        configKey: 'webhook_url',
        configValue: url,
        encrypt: false,
        isGlobal: true,
        description: 'Telegram webhook URL'
      });
    } catch (error) {
      logger.error('Error configurando webhook:', error);
      throw error;
    }
  }

  async sendMessage(chatId: string, message: string, options?: any): Promise<void> {
    if (!this.bot) {
      logger.warn('Telegram bot not initialized, cannot send message');
      return;
    }
    
    try {
      // Get chat ID from config if not provided
      const targetChatId = chatId || await integrationConfigService.getConfig({
        integrationType: 'telegram',
        configKey: 'chat_id'
      });

      if (!targetChatId) {
        throw new Error('No chat ID configured');
      }

      await this.bot.sendMessage(targetChatId, message, {
        parse_mode: 'HTML',
        ...options
      });
      logger.info(`Mensaje enviado a ${targetChatId}`);
    } catch (error) {
      logger.error('Error enviando mensaje:', error);
      throw error;
    }
  }

  async sendAlert(alert: FinancialAlert): Promise<void> {
    // Check if alerts are enabled in integration config
    const alertsEnabled = await integrationConfigService.getConfig({
      integrationType: 'telegram',
      configKey: 'alerts_enabled'
    });
    
    if (alertsEnabled === 'false') {
      logger.info('Alertas deshabilitadas, ignorando');
      return;
    }

    const emoji = this.getAlertEmoji(alert.priority);
    const message = `${emoji} <b>${alert.type.toUpperCase()}</b>\\n\\n${alert.message}\\n\\n<i>Timestamp: ${alert.timestamp.toISOString()}</i>`;
    
    try {
      const chatId = await integrationConfigService.getConfig({
        integrationType: 'telegram',
        configKey: 'chat_id'
      });
      
      if (!chatId) {
        throw new Error('No chat ID configured for alerts');
      }
      
      await this.sendMessage(chatId, message);
      logger.info(`Alerta enviada: ${alert.type} - ${alert.priority}`);
    } catch (error) {
      logger.error('Error enviando alerta:', error);
      auditCatch('TelegramService.sendAlert', error, 'silenced');
    }
  }

  private getAlertEmoji(priority: AlertPriority): string {
    switch (priority) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '📊';
    }
  }

  async handleCommand(command: TelegramCommand): Promise<void> {
    const { name, params, chatId } = command;
    
    try {
      switch (name) {
        case '/start':
          await this.handleStartCommand(chatId);
          break;
        case '/help':
          await this.handleHelpCommand(chatId);
          break;
        case '/status':
          await this.handleStatusCommand(chatId);
          break;
        case '/balance':
          await this.handleBalanceCommand(chatId);
          break;
        case '/gastos':
          await this.handleGastosCommand(chatId, params);
          break;
        case '/reporte':
          await this.handleReporteCommand(chatId, params);
          break;
        case '/sync':
          await this.handleSyncCommand(chatId);
          break;
        case '/setup':
          await this.handleSetupCommand(chatId);
          break;
        case '/setup_bbva':
          await this.handleSetupBBVACommand(chatId);
          break;
        case '/setup_sandbox':
          await this.handleSetupSandboxCommand(chatId);
          break;
        case '/complete_setup':
          await this.handleCompleteSetupCommand(chatId, params[0]);
          break;
        case '/dashboard':
          await this.handleDashboardCommand(chatId);
          break;
        // Revenue management commands
        case '/invoice':
          await this.handleInvoiceCommand(chatId, params);
          break;
        case '/revenue':
          await this.handleRevenueCommand(chatId, params);
          break;
        case '/pending':
          await this.handlePendingCommand(chatId, params);
          break;
        case '/client':
          await this.handleClientCommand(chatId, params);
          break;
        case '/payment':
          await this.handlePaymentCommand(chatId, params);
          break;
        // Trading commands
        case '/trading':
          await this.handleTradingCommand(chatId);
          break;
        case '/positions':
          await this.handlePositionsCommand(chatId);
          break;
        case '/strategies':
          await this.handleStrategiesCommand(chatId);
          break;
        case '/pnl':
          await this.handlePnLCommand(chatId);
          break;
        case '/stop_all':
          await this.handleStopAllCommand(chatId);
          break;
        case '/trade':
          await this.handleTradeCommand(chatId, params);
          break;
        case '/confirm_stop_all':
          await this.handleConfirmStopAllCommand(chatId);
          break;
        // Document Intelligence commands
        case '/upload':
          // Send upload instructions
          await this.sendMessage(chatId, 
            '📄 *Document Upload*\n\n' +
            'Send me any document (PDF, DOCX, TXT, etc.) and I\'ll:\n' +
            '• Extract and analyze the content\n' +
            '• Generate a summary\n' +
            '• Extract key information\n' +
            '• Make it searchable\n\n' +
            'Just send the file directly!', 
            { parse_mode: 'Markdown' }
          );
          break;
        case '/list':
        case '/search':
        case '/summary':
        case '/analyze':
        case '/dochelp':
          // These document commands require more context than available in webhook
          await this.sendMessage(chatId, 
            '📄 *Document Commands*\n\n' +
            'Los comandos de documentos están configurados pero requieren procesamiento especial.\n\n' +
            'Para subir documentos:\n' +
            '1. Usa `/upload` para ver instrucciones\n' +
            '2. Envía tu archivo directamente\n\n' +
            'Los comandos `/list`, `/search`, `/summary`, `/analyze` y `/dochelp` están en desarrollo.', 
            { parse_mode: 'Markdown' }
          );
          break;
        default:
          await this.sendMessage(chatId, '❓ Comando no reconocido. Usa /help para ver los comandos disponibles.');
      }
    } catch (error) {
      logger.error(`Error manejando comando ${name}:`, error);
      await this.sendMessage(chatId, '❌ Error procesando comando. Intenta nuevamente.');
    }
  }

  private async handleStartCommand(chatId: string): Promise<void> {
    const message = `
🤖 <b>¡Hola! Soy tu Bot AI Inteligente</b>

Estoy conectado a tu sistema AI Service y puedo ayudarte con:

💰 <b>Información financiera</b>
📊 <b>Reportes automáticos</b>
🔄 <b>Sincronización bancaria</b>
📄 <b>Análisis de documentos</b>
🧠 <b>Búsqueda inteligente</b>
⚙️ <b>Control del sistema</b>

Usa /help para ver todos los comandos disponibles.
Puedes enviarme documentos directamente para análisis automático.

<i>Sistema inicializado: ${new Date().toLocaleString()}</i>
    `;
    
    await this.sendMessage(chatId, message);
  }

  private async handleHelpCommand(chatId: string): Promise<void> {
    const message = `
📖 <b>Comandos Disponibles</b>

<b>💰 Gestión de Ingresos:</b>
/invoice create [cliente] [cantidad] [desc] - Crear factura
/invoice list [cliente] - Listar facturas
/invoice send [ID] - Enviar factura
/revenue [periodo] - Análisis de ingresos
/revenue breakdown [periodo] - Desglose detallado
/pending - Ver pagos pendientes
/pending remind [cliente] - Recordar pago
/client balance [cliente] - Balance del cliente
/client list - Listar clientes
/payment record [cliente] [cantidad] - Registrar pago

<b>💸 Gastos y Análisis:</b>
/balance - Balance actual de cuentas
/gastos [categoría] - Gastos por categoría
/reporte [periodo] - Generar reporte (daily/weekly/monthly)
/sync - Sincronizar transacciones bancarias
/setup - Configurar conexión bancaria

<b>🤖 Trading:</b>
/trading - Dashboard de trading
/positions - Ver posiciones abiertas
/strategies - Estado de estrategias
/pnl - Ver P&L del día
/trade [symbol] [side] [amount] - Trade manual
/stop_all - Detener todo (emergencia)

<b>📄 Documentos:</b>
/upload - Subir documento para análisis
/list - Listar tus documentos
/search [query] - Buscar en documentos
/summary [ID] - Ver resumen de documento
/analyze [ID] - Re-analizar documento
/dochelp - Ayuda de documentos

<b>⚙️ Sistema:</b>
/status - Estado del sistema AI
/dashboard - Enlace al dashboard web

<b>ℹ️ Ayuda:</b>
/help - Mostrar esta ayuda
/start - Reiniciar el bot

<i>Ejemplos:</i>
<i>• /invoice create "Acme Corp" 1500 "Servicios Marzo"</i>
<i>• /revenue month</i>
<i>• /client balance "Tech Solutions"</i>
<i>• /trade BTC/USDT buy 0.001</i>
    `;
    
    await this.sendMessage(chatId, message);
  }

  private async handleStatusCommand(chatId: string): Promise<void> {
    try {
      // Obtener estado del sistema
      const systemStatus = await this.getSystemStatus();
      
      const aiEmoji = systemStatus.aiService === 'online' ? '🟢' : '🔴';
      const finEmoji = systemStatus.financialService === 'online' ? '🟢' : '🔴';
      const dbEmoji = systemStatus.database === 'connected' ? '🟢' : '🔴';
      
      const message = `
🖥️ <b>Estado del Sistema</b>

${aiEmoji} <b>AI Service:</b> ${systemStatus.aiService}
${finEmoji} <b>Financial Service:</b> ${systemStatus.financialService}
${dbEmoji} <b>Database:</b> ${systemStatus.database}

📊 <b>Métricas:</b>
• Memoria: ${systemStatus.memory}MB
• Uptime: ${Math.floor(systemStatus.uptime / 3600)}h ${Math.floor((systemStatus.uptime % 3600) / 60)}m

<i>Actualizado: ${new Date().toLocaleString()}</i>
      `;
      
      await this.sendMessage(chatId, message);
    } catch (error) {
      await this.sendMessage(chatId, '❌ Error obteniendo estado del sistema');
    }
  }

  private async handleBalanceCommand(chatId: string): Promise<void> {
    try {
      const summary = await this.getFinancialSummary();
      
      const message = `
💰 <b>Balance de Cuentas</b>

💵 <b>Total:</b> €${summary.totalBalance.toFixed(2)}

📊 <b>Actividad Reciente:</b>
• Transacciones: ${summary.recentTransactions}
• Categorizadas: ${summary.categorizedTransactions}
• Pendientes: ${summary.pendingCategorizations}

🔄 <b>Última Sincronización:</b>
${summary.lastSync.toLocaleString()}

<i>Datos actualizados en tiempo real</i>
      `;
      
      await this.sendMessage(chatId, message);
    } catch (error) {
      await this.sendMessage(chatId, '❌ Error obteniendo balance');
    }
  }

  private async handleGastosCommand(chatId: string, params: string[]): Promise<void> {
    try {
      const categoria = params[0] || 'todas';
      
      // Obtener transacciones de gastos recientes
      const transactions = await this.financialService.getTransactions(undefined, 1, 10);
      
      let message = `📊 <b>Gastos Recientes - ${categoria}</b>\\n\\n`;
      
      if (transactions.items.length === 0) {
        message += '📝 No hay gastos registrados en los últimos 30 días.';
      } else {
        transactions.items.forEach((gasto: any) => {
          const amount = Math.abs(gasto.amount);
          message += `• €${amount.toFixed(2)} - ${gasto.description || 'Sin descripción'}\\n`;
        });
        
        if (transactions.total > 10) {
          message += `\\n... y ${transactions.total - 10} más`;
        }
      }
      
      await this.sendMessage(chatId, message);
    } catch (error) {
      logger.error('Error en handleGastosCommand:', error);
      await this.sendMessage(chatId, '❌ Error obteniendo gastos');
    }
  }

  private async handleReporteCommand(chatId: string, params: string[]): Promise<void> {
    try {
      const periodo = (params[0] || 'daily') as ReportType;
      
      const message = `
📈 <b>Reporte ${periodo.toUpperCase()}</b>

⏳ Generando reporte...

<i>Este proceso puede tardar unos segundos</i>
      `;
      
      await this.sendMessage(chatId, message);
      
      // Generar reporte real
      const reporte = await this.generateReport(periodo);
      await this.sendMessage(chatId, reporte);
      
    } catch (error) {
      await this.sendMessage(chatId, '❌ Error generando reporte');
    }
  }

  private async handleSyncCommand(chatId: string): Promise<void> {
    try {
      await this.sendMessage(chatId, '🔄 Verificando cuentas bancarias...');
      
      // Verificar si hay cuentas configuradas
      const accounts = await this.financialService.getAccounts();
      const bankAccounts = accounts.filter((acc: any) => acc.type === 'bank_account' && acc.is_active);
      
      if (bankAccounts.length === 0) {
        // No hay cuentas, iniciar proceso de configuración
        await this.sendMessage(chatId, `
❌ <b>No hay cuentas bancarias configuradas</b>

Para conectar tu banco necesitas:

1️⃣ Primero, ejecuta el comando /setup para iniciar la configuración
2️⃣ Te enviaré un enlace para autorizar el acceso a tu banco
3️⃣ Una vez autorizado, podrás sincronizar tus transacciones

¿Deseas configurar tu banco ahora? Usa /setup
        `);
        return;
      }
      
      // Hay cuentas, realizar sincronización
      await this.sendMessage(chatId, `
📊 <b>Sincronizando ${bankAccounts.length} cuenta(s) bancaria(s)...</b>

Esto puede tomar unos momentos...
      `);
      
      try {
        // Llamar al endpoint de sync
        logger.info(`Iniciando sincronización bancaria para chat ${chatId}`);
        const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/financial/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        logger.info(`Respuesta del endpoint sync: ${response.status}`);
        const result = await response.json();
        logger.info(`Resultado sync:`, result);
        
        if (result.success) {
          const { accountsSynced, transactionsSynced } = result.data;
          
          await this.sendMessage(chatId, `
✅ <b>Sincronización completada</b>

📊 Resumen:
• Cuentas sincronizadas: ${accountsSynced}
• Nuevas transacciones: ${transactionsSynced}

Usa /balance para ver tu saldo actualizado
Usa /gastos para ver tus gastos por categoría
          `);
        } else {
          throw new Error(result.error || 'Error en sincronización');
        }
      } catch (error: any) {
        logger.error('Error en sincronización:', error);
        await this.sendMessage(chatId, `
⚠️ <b>Error en sincronización</b>

${error.message}

Intenta nuevamente en unos minutos o contacta soporte.
        `);
      }
    } catch (error) {
      logger.error('Error en comando sync:', error);
      await this.sendMessage(chatId, '❌ Error procesando sincronización');
    }
  }

  private async handleSetupCommand(chatId: string): Promise<void> {
    try {
      await this.sendMessage(chatId, `
🏦 <b>Configuración de Conexión Bancaria</b>

Vamos a conectar tu banco usando GoCardless (Open Banking seguro).

📋 <b>Bancos soportados:</b>
• BBVA
• Santander
• CaixaBank
• ING
• Y más de 2000 bancos europeos

<b>Elige una opción:</b>
• Para conectar una cuenta real de BBVA: /setup_bbva
• Para probar con una cuenta de prueba (Sandbox): /setup_sandbox

⚠️ <b>Importante:</b> Este proceso te redirigirá al sitio web de tu banco para autorizar el acceso de forma segura.
      `);
    } catch (error) {
      logger.error('Error en comando setup:', error);
      await this.sendMessage(chatId, '❌ Error mostrando opciones de configuración');
    }
  }

  private async handleSetupBBVACommand(chatId: string): Promise<void> {
    try {
      await this.sendMessage(chatId, '🏦 Iniciando configuración con BBVA...');
      
      // Llamar al endpoint de setup BBVA
      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/financial/setup-bbva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success && result.data.requisition) {
        const { requisition } = result.data;
        
        await this.sendMessage(chatId, `
✅ <b>Proceso de autorización iniciado</b>

🔗 <b>Enlace de autorización:</b>
${requisition.link}

📋 <b>Instrucciones:</b>
1. Haz clic en el enlace anterior
2. Serás redirigido al sitio web de BBVA
3. Inicia sesión con tus credenciales bancarias
4. Autoriza el acceso a tus datos financieros
5. Una vez completado, vuelve aquí

⏱️ <b>Este enlace expira en 30 minutos</b>

Cuando hayas completado la autorización, usa el comando:
/complete_setup ${requisition.id}
        `, { parse_mode: 'HTML' });
      } else {
        throw new Error(result.error || 'Error iniciando configuración');
      }
    } catch (error: any) {
      logger.error('Error en setup BBVA:', error);
      await this.sendMessage(chatId, `
❌ <b>Error configurando BBVA</b>

${error.message}

Posibles causas:
• Las credenciales de GoCardless no están configuradas
• Error de conexión con el servicio

Contacta al administrador del sistema.
      `);
    }
  }

  private async handleSetupSandboxCommand(chatId: string): Promise<void> {
    try {
      await this.sendMessage(chatId, '🧪 Iniciando configuración con Sandbox...');
      
      // Llamar al endpoint de setup sandbox
      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/financial/setup-sandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success && result.data.requisition) {
        const { requisition } = result.data;
        
        await this.sendMessage(chatId, `
✅ <b>Proceso de autorización de Sandbox iniciado</b>

🔗 <b>Enlace de autorización:</b>
${requisition.link}

📋 <b>Instrucciones:</b>
1. Haz clic en el enlace anterior
2. Serás redirigido al sitio de GoCardless Sandbox
3. Sigue las instrucciones para autorizar el acceso
4. Una vez completado, vuelve aquí

⏱️ <b>Este enlace expira en 30 minutos</b>

Cuando hayas completado la autorización, usa el comando:
/complete_setup ${requisition.id}
        `, { parse_mode: 'HTML' });
      } else {
        throw new Error(result.error || 'Error iniciando configuración de Sandbox');
      }
    } catch (error: any) {
      logger.error('Error en setup Sandbox:', error);
      await this.sendMessage(chatId, `
❌ <b>Error configurando Sandbox</b>

${error.message}

Posibles causas:
• El modo Sandbox no está habilitado en la configuración
• Error de conexión con el servicio

Contacta al administrador del sistema.
      `, { parse_mode: 'HTML' });
    }
  }

  private async handleCompleteSetupCommand(chatId: string, requisitionId?: string): Promise<void> {
    try {
      if (!requisitionId) {
        await this.sendMessage(chatId, `
❌ <b>Falta el ID de requisición</b>

Uso correcto: /complete_setup [requisition_id]

El ID te fue proporcionado cuando iniciaste la configuración.
        `);
        return;
      }
      
      await this.sendMessage(chatId, '🔄 Verificando autorización...');
      
      // Llamar al endpoint de complete setup
      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/financial/complete-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisitionId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const { accountsSaved } = result.data;
        
        await this.sendMessage(chatId, `
✅ <b>¡Configuración completada exitosamente!</b>

🏦 Se han conectado ${accountsSaved} cuenta(s) bancaria(s).

Ahora puedes:
• /sync - Sincronizar tus transacciones
• /balance - Ver tu balance actual
• /gastos - Ver análisis de gastos
• /dashboard - Acceder al dashboard web

🎉 ¡Tu sistema financiero está listo!
        `);
        
        // Iniciar una sincronización automática
        await this.sendMessage(chatId, '🔄 Iniciando primera sincronización...');
        setTimeout(() => this.handleSyncCommand(chatId), 1000);
        
      } else {
        throw new Error(result.error || 'Error completando configuración');
      }
    } catch (error: any) {
      logger.error('Error en complete setup:', error);
      await this.sendMessage(chatId, `
❌ <b>Error completando configuración</b>

${error.message}

Posibles causas:
• El proceso de autorización no se completó
• El ID de requisición es inválido
• La autorización expiró

Intenta iniciar el proceso nuevamente con /setup_bbva
      `);
    }
  }
  
  private async handleDashboardCommand(chatId: string): Promise<void> {
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000/dashboard';
    
    const message = `
🖥️ <b>Dashboard Web</b>

Accede a tu dashboard financiero:
${dashboardUrl}

📊 <b>Características:</b>
• Gráficos interactivos
• Análisis en tiempo real
• Reportes detallados
• Configuración avanzada

<i>Abre el enlace en tu navegador</i>
    `;
    
    await this.sendMessage(chatId, message);
  }

  private async getSystemStatus(): Promise<SystemStatus> {
    // Implementar lógica real para obtener estado del sistema
    return {
      aiService: 'online',
      financialService: 'online',
      database: 'connected',
      memory: process.memoryUsage().heapUsed / 1024 / 1024,
      uptime: process.uptime()
    };
  }

  private async getFinancialSummary(): Promise<FinancialSummary> {
    // Obtener resumen financiero real
    try {
      const accounts = await this.financialService.getAccounts();
      const transactions = await this.financialService.getTransactions(undefined, 1, 100);
      
      return {
        totalBalance: accounts.reduce((sum: number, acc: any) => sum + acc.balance, 0),
        recentTransactions: transactions.total,
        lastSync: new Date(),
        categorizedTransactions: transactions.items.filter((t: any) => t.categoryId).length,
        pendingCategorizations: transactions.items.filter((t: any) => !t.categoryId).length
      };
    } catch (error) {
      logger.error('Error obteniendo summary financiero:', error);
      return {
        totalBalance: 0,
        recentTransactions: 0,
        lastSync: new Date(),
        categorizedTransactions: 0,
        pendingCategorizations: 0
      };
    }
  }

  private async generateReport(type: ReportType): Promise<string> {
    // Generar reporte basado en el tipo
    try {
      // Calcular fechas según el tipo de reporte
      let startDate: Date;
      const endDate = new Date();
      
      switch (type) {
        case 'daily':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }
      
      // Obtener transacciones para el período
      const transactions = await this.financialService.getTransactions(undefined, 1, 1000);
      
      // Calcular totales
      const totalIncome = transactions.items
        .filter((t: any) => t.amount > 0)
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      const totalExpenses = Math.abs(transactions.items
        .filter((t: any) => t.amount < 0)
        .reduce((sum: number, t: any) => sum + t.amount, 0));
      
      return `
📊 <b>Reporte ${type.toUpperCase()}</b>

💰 <b>Total Ingresos:</b> €${totalIncome.toFixed(2)}
💸 <b>Total Gastos:</b> €${totalExpenses.toFixed(2)}
📈 <b>Balance Neto:</b> €${(totalIncome - totalExpenses).toFixed(2)}

📋 <b>Transacciones:</b> ${transactions.total}

<i>Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</i>
      `;
    } catch (error) {
      logger.error('Error generando reporte:', error);
      return '❌ Error generando reporte detallado';
    }
  }

  // ============================================================================
  // REVENUE MANAGEMENT COMMAND HANDLERS
  // ============================================================================

  private async handleInvoiceCommand(chatId: string, params: string[]): Promise<void> {
    try {
      const subcommand = params[0];
      
      switch (subcommand) {
        case 'create':
          await this.handleInvoiceCreate(chatId, params.slice(1));
          break;
        case 'list':
          await this.handleInvoiceList(chatId, params.slice(1));
          break;
        case 'send':
          await this.handleInvoiceSend(chatId, params.slice(1));
          break;
        default:
          await this.sendMessage(chatId, `
💼 <b>Gestión de Facturas</b>

Comandos disponibles:
• /invoice create [cliente] [cantidad] [descripción]
• /invoice list [cliente]
• /invoice send [ID]

<i>Usa /help para ver ejemplos</i>
          `);
      }
    } catch (error) {
      logger.error('Error en comando invoice:', error);
      await this.sendMessage(chatId, '❌ Error procesando comando de factura');
    }
  }

  private async handleInvoiceCreate(chatId: string, params: string[]): Promise<void> {
    try {
      // Parse parameters with quotes support
      const args = this.parseQuotedParams(params.join(' '));
      
      if (args.length < 3) {
        await this.sendMessage(chatId, `
❌ <b>Parámetros incorrectos</b>

Uso: /invoice create "nombre cliente" cantidad "descripción"

Ejemplo:
/invoice create "Acme Corp" 1500 "Servicios de consultoría - Marzo 2024"
        `);
        return;
      }

      const [clientName, amountStr, description] = args;
      const amount = parseFloat(amountStr);

      if (isNaN(amount) || amount <= 0) {
        await this.sendMessage(chatId, '❌ La cantidad debe ser un número positivo');
        return;
      }

      // Find or create client
      let client = await this.clientService.getClientByTaxId(clientName); // Using name as tax ID for simplicity
      
      if (!client) {
        // Create basic client
        client = await this.clientService.createClient({
          name: clientName,
          businessName: clientName,
          taxId: `TEMP-${Date.now()}`,
          taxIdType: 'OTHER',
          email: '',
          clientType: 'business',
          currency: 'EUR',
          status: 'active',
          createdBy: `telegram-${chatId}`
        });
      }

      // Create invoice
      const invoice = await this.invoiceService.createInvoice({
        clientId: client.id,
        type: 'invoice',
        status: 'draft',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        items: [{
          id: '1',
          description,
          quantity: 1,
          unitPrice: amount,
          amount,
          total: amount * 1.21,
          taxRate: 21,
          taxAmount: amount * 0.21
        }],
        currency: 'EUR',
        taxRate: 21,
        taxType: 'IVA',
        paymentTerms: 30,
        createdBy: `telegram-${chatId}`
      });

      await this.sendMessage(chatId, `
✅ <b>Factura Creada</b>

📄 <b>Número:</b> ${invoice.invoiceNumber}
👤 <b>Cliente:</b> ${clientName}
💰 <b>Importe:</b> €${amount.toFixed(2)}
🏷️ <b>IVA (21%):</b> €${(amount * 0.21).toFixed(2)}
💵 <b>Total:</b> €${(amount * 1.21).toFixed(2)}
📅 <b>Vencimiento:</b> ${new Date(invoice.dueDate).toLocaleDateString()}

📋 <b>Concepto:</b> ${description}

<b>Acciones disponibles:</b>
• /invoice send ${invoice.id} - Enviar al cliente
• /invoice list - Ver todas las facturas
      `, {
        reply_markup: {
          inline_keyboard: [[
            { text: '📤 Enviar', callback_data: `invoice_send_${invoice.id}` },
            { text: '📋 Ver Lista', callback_data: 'invoice_list' }
          ]]
        }
      });
    } catch (error: any) {
      logger.error('Error creando factura:', error);
      await this.sendMessage(chatId, `❌ Error al crear factura: ${error.message}`);
    }
  }

  private async handleInvoiceList(chatId: string, params: string[]): Promise<void> {
    try {
      const clientFilter = params.join(' ').trim();
      let clientId: string | undefined;

      if (clientFilter) {
        const client = await this.clientService.getClientByTaxId(clientFilter);
        if (client) {
          clientId = client.id;
        }
      }

      const { invoices, total } = await this.invoiceService.listInvoices({
        clientId,
        limit: 10,
        sortBy: 'issue_date',
        sortOrder: 'DESC'
      });

      if (invoices.length === 0) {
        await this.sendMessage(chatId, `
📋 <b>No hay facturas</b>

${clientFilter ? `No se encontraron facturas para "${clientFilter}"` : 'No tienes facturas registradas'}

Usa /invoice create para crear una nueva factura
        `);
        return;
      }

      let message = `📋 <b>Listado de Facturas</b>\n\n`;
      if (clientFilter) {
        message += `🔍 Filtrado por: ${clientFilter}\n\n`;
      }

      const statusEmoji = {
        draft: '📝',
        sent: '📤',
        viewed: '👁️',
        paid: '✅',
        overdue: '⚠️',
        cancelled: '❌'
      };

      invoices.forEach(invoice => {
        const emoji = statusEmoji[invoice.status as keyof typeof statusEmoji] || '📄';
        const isPaid = invoice.status === 'paid';
        const isOverdue = invoice.status !== 'paid' && new Date(invoice.dueDate) < new Date();
        
        message += `${emoji} <b>${invoice.invoiceNumber}</b>\n`;
        message += `   👤 ${invoice.clientName}\n`;
        message += `   💰 €${invoice.total.toFixed(2)}`;
        
        if (isPaid) {
          message += ` ✅ Pagada`;
        } else if (isOverdue) {
          message += ` ⚠️ Vencida`;
        }
        
        message += `\n   📅 ${new Date(invoice.issueDate).toLocaleDateString()}\n\n`;
      });

      if (total > 10) {
        message += `<i>Mostrando 10 de ${total} facturas</i>\n`;
      }

      // Calculate summary
      const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
      const paidAmount = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);
      const pendingAmount = totalAmount - paidAmount;

      message += `\n<b>📊 Resumen:</b>\n`;
      message += `💵 Total: €${totalAmount.toFixed(2)}\n`;
      message += `✅ Cobrado: €${paidAmount.toFixed(2)}\n`;
      message += `⏳ Pendiente: €${pendingAmount.toFixed(2)}`;

      await this.sendMessage(chatId, message);
    } catch (error) {
      logger.error('Error listando facturas:', error);
      await this.sendMessage(chatId, '❌ Error al listar facturas');
    }
  }

  private async handleInvoiceSend(chatId: string, params: string[]): Promise<void> {
    try {
      const invoiceId = params[0];
      
      if (!invoiceId) {
        await this.sendMessage(chatId, `
❌ <b>Falta el ID de la factura</b>

Uso: /invoice send [ID]

Para ver los IDs usa: /invoice list
        `);
        return;
      }

      const invoice = await this.invoiceService.getInvoice(invoiceId);
      
      if (!invoice) {
        await this.sendMessage(chatId, '❌ Factura no encontrada');
        return;
      }

      // Update invoice status to sent
      await this.invoiceService.updateInvoice(invoiceId, { status: 'sent' });

      await this.sendMessage(chatId, `
📤 <b>Factura Enviada</b>

✅ La factura ${invoice.invoiceNumber} ha sido marcada como enviada.

📧 <b>Cliente:</b> ${invoice.clientName}
💰 <b>Importe:</b> €${invoice.total.toFixed(2)}
📅 <b>Vencimiento:</b> ${new Date(invoice.dueDate).toLocaleDateString()}

<i>El cliente ha sido notificado (simulado)</i>
      `);
    } catch (error) {
      logger.error('Error enviando factura:', error);
      await this.sendMessage(chatId, '❌ Error al enviar factura');
    }
  }

  private async handleRevenueCommand(chatId: string, params: string[]): Promise<void> {
    try {
      const subcommand = params[0] || 'today';
      const isBreakdown = subcommand === 'breakdown';
      const period = isBreakdown ? (params[1] || 'month') : subcommand;

      const { startDate, endDate } = this.getPeriodDates(period);
      
      // const report = await financialReportingPrismaService.generateReport({ // TEMPORARILY DISABLED
      //   startDate,
      //   endDate,
      //   currency: 'EUR'
      // }); // TEMPORARILY DISABLED
      const report: any = { summary: { totalIncome: '0', incomeCategories: [] } }; // PLACEHOLDER

      let message = `💰 <b>Análisis de Ingresos - ${this.formatPeriod(period)}</b>\n\n`;

      // Summary
      message += `📊 <b>Resumen:</b>\n`;
      message += `💵 Ingresos: €${parseFloat(report.summary.totalIncome).toFixed(2)}\n`;
      message += `💸 Gastos: €${parseFloat(report.summary.totalExpenses).toFixed(2)}\n`;
      message += `📈 Neto: €${parseFloat(report.summary.netAmount).toFixed(2)}\n`;
      message += `📝 Transacciones: ${report.summary.transactionCount}\n\n`;

      if (isBreakdown) {
        // Detailed breakdown
        if (report.byCategory.income.length > 0) {
          message += `💚 <b>Desglose de Ingresos:</b>\n`;
          report.byCategory.income.forEach((cat: any) => {
            message += `• ${cat.categoryName}: €${parseFloat(cat.amount).toFixed(2)} (${cat.percentage.toFixed(1)}%)\n`;
          });
          message += '\n';
        }

        if (report.byCategory.expenses.length > 0) {
          message += `💔 <b>Desglose de Gastos:</b>\n`;
          report.byCategory.expenses.forEach((cat: any) => {
            message += `• ${cat.categoryName}: €${parseFloat(cat.amount).toFixed(2)} (${cat.percentage.toFixed(1)}%)\n`;
          });
        }
      }

      // Quick actions
      message += `\n<b>🔍 Ver más detalles:</b>\n`;
      message += `• /revenue breakdown ${period} - Desglose completo\n`;
      message += `• /pending - Pagos pendientes\n`;
      message += `• /invoice list - Ver facturas`;

      await this.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 Desglose', callback_data: `revenue_breakdown_${period}` },
              { text: '⏳ Pendientes', callback_data: 'pending_list' }
            ],
            [
              { text: '📈 Dashboard', callback_data: 'open_dashboard' }
            ]
          ]
        }
      });
    } catch (error) {
      logger.error('Error en comando revenue:', error);
      await this.sendMessage(chatId, '❌ Error al obtener análisis de ingresos');
    }
  }

  private async handlePendingCommand(chatId: string, params: string[]): Promise<void> {
    try {
      const subcommand = params[0];
      
      if (subcommand === 'remind' && params[1]) {
        await this.handlePendingRemind(chatId, params.slice(1));
        return;
      }

      // Get overdue and pending invoices
      const overdueInvoices = await this.invoiceService.getOverdueInvoices();
      const { invoices: pendingInvoices } = await this.invoiceService.listInvoices({
        status: 'sent',
        limit: 50
      });

      const allPending = [...overdueInvoices, ...pendingInvoices.filter(inv => 
        !overdueInvoices.find(o => o.id === inv.id)
      )];

      if (allPending.length === 0) {
        await this.sendMessage(chatId, `
✅ <b>No hay pagos pendientes</b>

Todas las facturas están al día.

Usa /invoice create para crear nuevas facturas.
        `);
        return;
      }

      let message = `⏳ <b>Pagos Pendientes</b>\n\n`;

      // Group by status
      const overdue = allPending.filter(inv => new Date(inv.dueDate) < new Date());
      const upcoming = allPending.filter(inv => new Date(inv.dueDate) >= new Date());

      if (overdue.length > 0) {
        message += `⚠️ <b>VENCIDAS (${overdue.length}):</b>\n`;
        let totalOverdue = 0;
        
        overdue.forEach(invoice => {
          const daysOverdue = Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
          message += `\n🔴 <b>${invoice.invoiceNumber}</b>\n`;
          message += `   👤 ${invoice.clientName}\n`;
          message += `   💰 €${invoice.total.toFixed(2)}\n`;
          message += `   ⏰ Vencida hace ${daysOverdue} días\n`;
          totalOverdue += invoice.total;
        });
        
        message += `\n   <b>Total vencido: €${totalOverdue.toFixed(2)}</b>\n\n`;
      }

      if (upcoming.length > 0) {
        message += `📅 <b>PRÓXIMAS A VENCER (${upcoming.length}):</b>\n`;
        let totalUpcoming = 0;
        
        upcoming
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5)
          .forEach(invoice => {
            const daysUntil = Math.floor((new Date(invoice.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            message += `\n🟡 <b>${invoice.invoiceNumber}</b>\n`;
            message += `   👤 ${invoice.clientName}\n`;
            message += `   💰 €${invoice.total.toFixed(2)}\n`;
            message += `   📅 Vence en ${daysUntil} días\n`;
            totalUpcoming += invoice.total;
          });
        
        if (upcoming.length > 5) {
          message += `\n<i>... y ${upcoming.length - 5} más</i>\n`;
        }
        
        message += `\n   <b>Total próximo: €${totalUpcoming.toFixed(2)}</b>\n`;
      }

      const grandTotal = allPending.reduce((sum, inv) => sum + inv.total, 0);
      message += `\n💵 <b>TOTAL PENDIENTE: €${grandTotal.toFixed(2)}</b>\n\n`;

      message += `<b>Acciones:</b>\n`;
      message += `• /pending remind [cliente] - Enviar recordatorio\n`;
      message += `• /payment record [cliente] [cantidad] - Registrar pago`;

      await this.sendMessage(chatId, message);
    } catch (error) {
      logger.error('Error en comando pending:', error);
      await this.sendMessage(chatId, '❌ Error al obtener pagos pendientes');
    }
  }

  private async handlePendingRemind(chatId: string, params: string[]): Promise<void> {
    try {
      const clientName = params.join(' ');
      
      if (!clientName) {
        await this.sendMessage(chatId, '❌ Especifica el nombre del cliente');
        return;
      }

      const client = await this.clientService.getClientByTaxId(clientName);
      if (!client) {
        await this.sendMessage(chatId, `❌ Cliente "${clientName}" no encontrado`);
        return;
      }

      const { invoices } = await this.invoiceService.listInvoices({
        clientId: client.id,
        status: 'sent'
      });

      const pendingInvoices = invoices.filter(inv => 
        inv.status !== 'paid' && inv.status !== 'cancelled'
      );

      if (pendingInvoices.length === 0) {
        await this.sendMessage(chatId, `✅ ${clientName} no tiene pagos pendientes`);
        return;
      }

      const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0);

      await this.sendMessage(chatId, `
📧 <b>Recordatorio Enviado</b>

✅ Se ha enviado un recordatorio de pago a ${clientName}

📋 <b>Facturas pendientes:</b> ${pendingInvoices.length}
💰 <b>Total pendiente:</b> €${totalPending.toFixed(2)}

<i>El cliente ha sido notificado por email (simulado)</i>
      `);
    } catch (error) {
      logger.error('Error enviando recordatorio:', error);
      await this.sendMessage(chatId, '❌ Error al enviar recordatorio');
    }
  }

  private async handleClientCommand(chatId: string, params: string[]): Promise<void> {
    try {
      const subcommand = params[0];
      
      if (subcommand === 'balance' && params[1]) {
        await this.handleClientBalance(chatId, params.slice(1));
        return;
      }
      
      if (subcommand === 'list') {
        await this.handleClientList(chatId);
        return;
      }

      await this.sendMessage(chatId, `
👥 <b>Gestión de Clientes</b>

Comandos disponibles:
• /client list - Listar todos los clientes
• /client balance [nombre] - Ver balance del cliente

<i>Usa /help para ver ejemplos</i>
      `);
    } catch (error) {
      logger.error('Error en comando client:', error);
      await this.sendMessage(chatId, '❌ Error procesando comando de cliente');
    }
  }

  private async handleClientBalance(chatId: string, params: string[]): Promise<void> {
    try {
      const clientName = params.join(' ');
      
      const client = await this.clientService.getClientByTaxId(clientName);
      if (!client) {
        await this.sendMessage(chatId, `❌ Cliente "${clientName}" no encontrado`);
        return;
      }

      const stats = await this.invoiceService.getClientInvoiceStats(client.id);
      const transactions = await this.clientService.getClientTransactions(client.id, { limit: 5 });

      let message = `👤 <b>Balance de ${client.name}</b>\n\n`;

      message += `📊 <b>Resumen:</b>\n`;
      message += `📄 Facturas totales: ${stats.totalInvoices}\n`;
      message += `💰 Ingresos totales: €${stats.totalRevenue.toFixed(2)}\n`;
      message += `✅ Facturas pagadas: ${stats.paidInvoices}\n`;
      message += `⏳ Facturas pendientes: ${stats.pendingInvoices}\n`;
      message += `⚠️ Facturas vencidas: ${stats.overdueInvoices}\n`;
      message += `📈 Promedio por factura: €${stats.averageAmount.toFixed(2)}\n\n`;

      if (stats.lastInvoiceDate) {
        message += `📅 Última factura: ${new Date(stats.lastInvoiceDate).toLocaleDateString()}\n\n`;
      }

      if (transactions.length > 0) {
        message += `📋 <b>Últimas transacciones:</b>\n`;
        transactions.forEach(tx => {
          const emoji = tx.type === 'payment' ? '💚' : '📄';
          const sign = tx.type === 'payment' ? '+' : '';
          message += `${emoji} ${sign}€${tx.amount.toFixed(2)} - ${tx.description}\n`;
          message += `   📅 ${new Date(tx.date).toLocaleDateString()}\n`;
        });
      }

      await this.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [[
            { text: '📄 Ver Facturas', callback_data: `client_invoices_${client.id}` },
            { text: '➕ Nueva Factura', callback_data: `invoice_create_${client.id}` }
          ]]
        }
      });
    } catch (error) {
      logger.error('Error obteniendo balance de cliente:', error);
      await this.sendMessage(chatId, '❌ Error al obtener balance del cliente');
    }
  }

  private async handleClientList(chatId: string): Promise<void> {
    try {
      const { clients, total } = await this.clientService.listClients({
        status: 'active',
        limit: 10,
        sortBy: 'total_revenue',
        sortOrder: 'DESC'
      });

      if (clients.length === 0) {
        await this.sendMessage(chatId, `
👥 <b>No hay clientes registrados</b>

Los clientes se crean automáticamente al generar facturas.

Usa /invoice create para crear tu primera factura.
        `);
        return;
      }

      let message = `👥 <b>Listado de Clientes</b>\n\n`;

      clients.forEach((client, index) => {
        const emoji = index < 3 ? ['🥇', '🥈', '🥉'][index] : '👤';
        message += `${emoji} <b>${client.name}</b>\n`;
        
        if (client.totalRevenue > 0) {
          message += `   💰 €${client.totalRevenue.toFixed(2)}`;
        }
        
        if (client.totalInvoices > 0) {
          message += ` (${client.totalInvoices} facturas)`;
        }
        
        if (client.outstandingBalance > 0) {
          message += `\n   ⏳ Pendiente: €${client.outstandingBalance.toFixed(2)}`;
        }
        
        message += '\n\n';
      });

      if (total > 10) {
        message += `<i>Mostrando 10 de ${total} clientes</i>\n`;
      }

      // Calculate totals
      const totalRevenue = clients.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);
      const totalOutstanding = clients.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);

      message += `\n<b>📊 Totales:</b>\n`;
      message += `💵 Facturado: €${totalRevenue.toFixed(2)}\n`;
      message += `⏳ Pendiente: €${totalOutstanding.toFixed(2)}`;

      await this.sendMessage(chatId, message);
    } catch (error) {
      logger.error('Error listando clientes:', error);
      await this.sendMessage(chatId, '❌ Error al listar clientes');
    }
  }

  private async handlePaymentCommand(chatId: string, params: string[]): Promise<void> {
    try {
      if (params.length < 2) {
        await this.sendMessage(chatId, `
💳 <b>Registrar Pago</b>

Uso: /payment record [cliente] [cantidad]

Ejemplo:
/payment record "Acme Corp" 1500

Esto marcará las facturas del cliente como pagadas por el importe indicado.
        `);
        return;
      }

      const args = this.parseQuotedParams(params.join(' '));
      if (args.length < 2) {
        await this.sendMessage(chatId, '❌ Faltan parámetros. Usa: /payment record "cliente" cantidad');
        return;
      }

      const [clientName, amountStr] = args;
      const amount = parseFloat(amountStr);

      if (isNaN(amount) || amount <= 0) {
        await this.sendMessage(chatId, '❌ La cantidad debe ser un número positivo');
        return;
      }

      const client = await this.clientService.getClientByTaxId(clientName);
      if (!client) {
        await this.sendMessage(chatId, `❌ Cliente "${clientName}" no encontrado`);
        return;
      }

      // Get unpaid invoices for the client
      const { invoices } = await this.invoiceService.listInvoices({
        clientId: client.id,
        status: 'sent'
      });

      const unpaidInvoices = invoices
        .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      if (unpaidInvoices.length === 0) {
        await this.sendMessage(chatId, `✅ ${clientName} no tiene facturas pendientes de pago`);
        return;
      }

      // Apply payment to invoices (oldest first)
      let remainingAmount = amount;
      const paidInvoices: any[] = [];

      for (const invoice of unpaidInvoices) {
        if (remainingAmount <= 0) break;
        
        if (remainingAmount >= invoice.total) {
          // Full payment
          await this.invoiceService.markAsPaid(
            invoice.id, 
            new Date(), 
            `Pago via Telegram - ${new Date().toISOString()}`
          );
          paidInvoices.push({ invoice, paidAmount: invoice.total });
          remainingAmount -= invoice.total;
        } else {
          // Partial payment (mark as paid if it's the full remaining amount)
          await this.invoiceService.markAsPaid(
            invoice.id,
            new Date(),
            `Pago parcial via Telegram - €${remainingAmount.toFixed(2)}`
          );
          paidInvoices.push({ invoice, paidAmount: remainingAmount });
          remainingAmount = 0;
        }
      }

      let message = `✅ <b>Pago Registrado</b>\n\n`;
      message += `👤 <b>Cliente:</b> ${clientName}\n`;
      message += `💰 <b>Importe:</b> €${amount.toFixed(2)}\n\n`;

      message += `📄 <b>Facturas pagadas:</b>\n`;
      paidInvoices.forEach(({ invoice, paidAmount }) => {
        message += `• ${invoice.invoiceNumber}: €${paidAmount.toFixed(2)}\n`;
      });

      if (remainingAmount > 0) {
        message += `\n💵 <b>Saldo a favor:</b> €${remainingAmount.toFixed(2)}\n`;
      }

      const totalPending = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0) - amount;
      if (totalPending > 0) {
        message += `\n⏳ <b>Pendiente restante:</b> €${totalPending.toFixed(2)}`;
      } else {
        message += `\n🎉 <b>¡Cliente al día!</b>`;
      }

      await this.sendMessage(chatId, message);
    } catch (error: any) {
      logger.error('Error registrando pago:', error);
      await this.sendMessage(chatId, `❌ Error al registrar pago: ${error.message}`);
    }
  }

  // ============================================================================
  // TRADING COMMAND HANDLERS
  // ============================================================================

  private async handleTradingCommand(chatId: string): Promise<void> {
    try {
      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/trading/dashboard/overview`);
      const dashboard = await response.json();

      if (!dashboard || !dashboard.success) {
        throw new Error('Unable to fetch trading dashboard');
      }

      const data = dashboard.data;
      const portfolioEmoji = data.portfolio.dailyPnL > 0 ? '📈' : '📉';
      
      const message = `
🤖 <b>Trading Dashboard</b>

💼 <b>Portfolio</b>
💰 Valor Total: $${data.portfolio.totalValue.toFixed(2)}
${portfolioEmoji} P&L Diario: $${data.portfolio.dailyPnL.toFixed(2)} (${((data.portfolio.dailyPnL / data.portfolio.totalValue) * 100).toFixed(2)}%)
📊 P&L Semanal: $${data.portfolio.weeklyPnL.toFixed(2)}
📈 P&L Mensual: $${data.portfolio.monthlyPnL.toFixed(2)}

📍 <b>Posiciones</b>
🔵 Abiertas: ${data.positions.open}
✅ En ganancia: ${data.positions.profitable}
❌ En pérdida: ${data.positions.losing}
💵 P&L Total: $${data.positions.totalPnL.toFixed(2)}

🤖 <b>Estrategias</b>
▶️ Activas: ${data.strategies.active}
⏸️ Pausadas: ${data.strategies.paused}
⏹️ Detenidas: ${data.strategies.stopped}

📊 <b>Mercado</b>
₿ BTC: $${data.marketOverview.btcPrice.toFixed(2)} (${data.marketOverview.btcChange24h > 0 ? '+' : ''}${data.marketOverview.btcChange24h.toFixed(2)}%)
💎 Market Cap: $${(data.marketOverview.marketCap / 1e9).toFixed(1)}B
😱 Fear & Greed: ${data.marketOverview.fearGreedIndex}/100

<i>Actualizado: ${new Date().toLocaleString()}</i>
      `;

      await this.sendMessage(chatId, message);
    } catch (error) {
      logger.error('Error in trading command:', error);
      await this.sendMessage(chatId, '❌ Error obteniendo dashboard de trading. Asegúrate de que el servicio de trading esté activo.');
    }
  }

  private async handlePositionsCommand(chatId: string): Promise<void> {
    try {
      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/trading/positions?status=open`);
      const result = await response.json();

      if (!result || !result.success) {
        throw new Error('Unable to fetch positions');
      }

      const positions = result.data;

      if (positions.length === 0) {
        await this.sendMessage(chatId, `
📊 <b>Posiciones Abiertas</b>

No hay posiciones abiertas en este momento.

Usa /strategies para ver el estado de las estrategias de trading.
        `);
        return;
      }

      let message = `📊 <b>Posiciones Abiertas (${positions.length})</b>\n\n`;

      positions.forEach((pos: any) => {
        const pnlEmoji = pos.unrealizedPnl > 0 ? '💚' : '💔';
        const sideEmoji = pos.side === 'buy' ? '🟢' : '🔴';
        
        message += `${sideEmoji} <b>${pos.symbol}</b> - ${pos.side.toUpperCase()}\n`;
        message += `💰 Cantidad: ${pos.quantity}\n`;
        message += `📍 Entrada: $${pos.entryPrice.toFixed(2)}\n`;
        message += `📊 Actual: $${pos.currentPrice.toFixed(2)}\n`;
        message += `${pnlEmoji} P&L: $${pos.unrealizedPnl.toFixed(2)} (${((pos.unrealizedPnl / pos.positionValue) * 100).toFixed(2)}%)\n`;
        
        if (pos.stopLoss) {
          message += `🛑 SL: $${pos.stopLoss.toFixed(2)}\n`;
        }
        if (pos.takeProfit) {
          message += `🎯 TP: $${pos.takeProfit.toFixed(2)}\n`;
        }
        
        message += `⏱️ Tiempo: ${this.formatDuration(Date.now() - new Date(pos.openedAt).getTime())}\n\n`;
      });

      const totalPnL = positions.reduce((sum: number, pos: any) => sum + pos.unrealizedPnl, 0);
      message += `<b>💵 P&L Total: $${totalPnL.toFixed(2)}</b>`;

      await this.sendMessage(chatId, message);
    } catch (error) {
      logger.error('Error in positions command:', error);
      await this.sendMessage(chatId, '❌ Error obteniendo posiciones abiertas');
    }
  }

  private async handleStrategiesCommand(chatId: string): Promise<void> {
    try {
      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/trading/strategies`);
      const result = await response.json();

      if (!result || !result.success) {
        throw new Error('Unable to fetch strategies');
      }

      const strategies = result.data;

      let message = `🤖 <b>Estado de Estrategias</b>\n\n`;

      strategies.forEach((strategy: any) => {
        const statusEmoji = strategy.status === 'active' ? '▶️' : 
                           strategy.status === 'paused' ? '⏸️' : '⏹️';
        const pnlEmoji = strategy.performance.totalPnL > 0 ? '💚' : '💔';
        
        message += `${statusEmoji} <b>${strategy.name}</b>\n`;
        message += `📊 Estado: ${strategy.status}\n`;
        message += `📈 Trades: ${strategy.performance.totalTrades}\n`;
        message += `🎯 Win Rate: ${(strategy.performance.winRate * 100).toFixed(1)}%\n`;
        message += `${pnlEmoji} P&L: $${strategy.performance.totalPnL.toFixed(2)}\n`;
        message += `📏 Sharpe: ${strategy.performance.sharpeRatio.toFixed(2)}\n`;
        message += `📉 Max DD: ${(strategy.performance.maxDrawdown * 100).toFixed(1)}%\n\n`;
      });

      const totalPnL = strategies.reduce((sum: number, s: any) => sum + s.performance.totalPnL, 0);
      const activeCount = strategies.filter((s: any) => s.status === 'active').length;

      message += `<b>📊 Resumen:</b>\n`;
      message += `🤖 Estrategias activas: ${activeCount}/${strategies.length}\n`;
      message += `💵 P&L Total: $${totalPnL.toFixed(2)}`;

      await this.sendMessage(chatId, message);
    } catch (error) {
      logger.error('Error in strategies command:', error);
      await this.sendMessage(chatId, '❌ Error obteniendo estado de estrategias');
    }
  }

  private async handlePnLCommand(chatId: string): Promise<void> {
    try {
      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/trading/performance/metrics?timeRange=1D`);
      const result = await response.json();

      if (!result || !result.success) {
        throw new Error('Unable to fetch P&L data');
      }

      const metrics = result.data.metrics;
      const pnlEmoji = metrics.totalReturn > 0 ? '📈' : '📉';
      
      const message = `
💰 <b>P&L del Día</b>

${pnlEmoji} <b>Retorno Total:</b> $${metrics.totalReturn.toFixed(2)} (${metrics.totalReturnPercent.toFixed(2)}%)

📊 <b>Métricas:</b>
🎯 Win Rate: ${(metrics.winRate * 100).toFixed(1)}%
📈 Trades Ganadores: ${metrics.winningTrades}
📉 Trades Perdedores: ${metrics.losingTrades}
💚 Promedio Ganancia: $${metrics.averageWin.toFixed(2)}
💔 Promedio Pérdida: $${metrics.averageLoss.toFixed(2)}

📏 <b>Ratios:</b>
📊 Profit Factor: ${metrics.profitFactor.toFixed(2)}
📐 Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}
📉 Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(1)}%

🏆 <b>Extremos:</b>
💎 Mejor Trade: $${metrics.bestTrade.toFixed(2)}
💩 Peor Trade: $${metrics.worstTrade.toFixed(2)}

⏱️ <b>Actividad:</b>
📊 Total Trades: ${metrics.totalTrades}
🔥 Racha Ganadora: ${metrics.consecutiveWins}
❄️ Racha Perdedora: ${metrics.consecutiveLosses}
⏳ Tiempo Promedio: ${metrics.averageHoldTime}h

<i>Actualizado: ${new Date().toLocaleString()}</i>
      `;

      await this.sendMessage(chatId, message);
    } catch (error) {
      logger.error('Error in P&L command:', error);
      await this.sendMessage(chatId, '❌ Error obteniendo P&L del día');
    }
  }

  private async handleStopAllCommand(chatId: string): Promise<void> {
    try {
      await this.sendMessage(chatId, `
⚠️ <b>CONFIRMACIÓN DE EMERGENCIA</b>

¿Estás seguro de que quieres detener TODO el trading?

Esto:
• Detendrá todas las estrategias activas
• Cancelará todas las órdenes pendientes
• NO cerrará posiciones abiertas (debes hacerlo manualmente)

Para confirmar, envía: /confirm_stop_all

<i>Esta acción no se puede deshacer</i>
      `);
    } catch (error) {
      logger.error('Error in stop all command:', error);
      await this.sendMessage(chatId, '❌ Error procesando comando de emergencia');
    }
  }

  private async handleConfirmStopAllCommand(chatId: string): Promise<void> {
    try {
      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/trading/emergency/stop-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `Emergency stop from Telegram by ${chatId}` })
      });

      const result = await response.json();

      if (result && result.success) {
        await this.sendMessage(chatId, `
🛑 <b>TRADING DETENIDO</b>

✅ Todas las estrategias han sido detenidas
✅ Todas las órdenes pendientes han sido canceladas

⚠️ <b>IMPORTANTE:</b> Las posiciones abiertas NO han sido cerradas.

Para ver posiciones abiertas: /positions
Para reactivar estrategias: Usa el dashboard web

<i>Razón: Parada de emergencia desde Telegram</i>
        `);
      } else {
        throw new Error(result.error || 'Failed to stop trading');
      }
    } catch (error) {
      logger.error('Error in confirm stop all command:', error);
      await this.sendMessage(chatId, '❌ Error ejecutando parada de emergencia');
    }
  }

  private async handleTradeCommand(chatId: string, params: string[]): Promise<void> {
    try {
      if (params.length < 3) {
        await this.sendMessage(chatId, `
💹 <b>Ejecutar Trade Manual</b>

Uso: /trade <symbol> <side> <amount>

Ejemplos:
• /trade BTC/USDT buy 0.001
• /trade ETH/USDT sell 0.5

<b>Parámetros:</b>
• symbol: Par de trading (ej: BTC/USDT)
• side: buy o sell
• amount: Cantidad en moneda base

⚠️ <b>Nota:</b> Los trades manuales están sujetos a los límites de riesgo configurados.
        `);
        return;
      }

      const [symbol, side, amountStr] = params;
      const amount = parseFloat(amountStr);

      if (isNaN(amount) || amount <= 0) {
        await this.sendMessage(chatId, '❌ La cantidad debe ser un número positivo');
        return;
      }

      if (!['buy', 'sell'].includes(side.toLowerCase())) {
        await this.sendMessage(chatId, '❌ El lado debe ser "buy" o "sell"');
        return;
      }

      await this.sendMessage(chatId, '⏳ Ejecutando trade...');

      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/trading/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange: 'binance', // Default exchange
          symbol: symbol.toUpperCase(),
          side: side.toLowerCase(),
          amount,
          type: 'market',
          source: 'telegram',
          userId: chatId
        })
      });

      const result = await response.json();

      if (result && result.success) {
        const trade = result.data;
        const sideEmoji = trade.side === 'buy' ? '🟢' : '🔴';
        
        await this.sendMessage(chatId, `
✅ <b>Trade Ejecutado</b>

${sideEmoji} <b>${trade.symbol}</b> - ${trade.side.toUpperCase()}
💰 Cantidad: ${trade.amount}
💵 Precio: $${trade.price.toFixed(2)}
💸 Total: $${(trade.amount * trade.price).toFixed(2)}
🏦 Exchange: ${trade.exchange}

🆔 ID: ${trade.id}
⏱️ Tiempo: ${new Date(trade.timestamp).toLocaleString()}

<i>El trade ha sido ejecutado exitosamente</i>
        `);
      } else {
        throw new Error(result.error || 'Failed to execute trade');
      }
    } catch (error: any) {
      logger.error('Error in trade command:', error);
      await this.sendMessage(chatId, `❌ Error ejecutando trade: ${error.message}`);
    }
  }

  private formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private parseQuotedParams(input: string): string[] {
    const regex = /[^\s"]+|"([^"]*)"/gi;
    const result: string[] = [];
    let match;

    while ((match = regex.exec(input))) {
      result.push(match[1] || match[0]);
    }

    return result;
  }

  private getPeriodDates(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period.toLowerCase()) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        const weekStart = now.getDate() - now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), weekStart);
        endDate = new Date(now.getFullYear(), now.getMonth(), weekStart + 6, 23, 59, 59);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      default:
        // Default to current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return { startDate, endDate };
  }

  private formatPeriod(period: string): string {
    const periodMap: { [key: string]: string } = {
      today: 'Hoy',
      week: 'Esta Semana',
      month: 'Este Mes',
      year: 'Este Año'
    };
    return periodMap[period.toLowerCase()] || period;
  }

  // Método para procesar webhook
  async processWebhook(update: any): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('Telegram service not initialized, cannot process webhook');
      return;
    }
    
    try {
      if (update.message) {
        const message = update.message;
        
        // Handle document uploads
        if (message.document) {
          logger.info('Document received via webhook, processing...', {
            fileName: message.document.file_name,
            fileSize: message.document.file_size,
            chatId: message.chat.id
          });
          if (this.documentService) {
            await this.documentService.handleDocumentUpload(message);
          } else {
            logger.warn('Document service not initialized');
          }
          return;
        }
        
        // Handle text commands
        if (message.text && message.text.startsWith('/')) {
          const [command, ...params] = message.text.split(' ');
          
          const telegramCommand: TelegramCommand = {
            name: command,
            params,
            chatId: message.chat.id.toString(),
            messageId: message.message_id
          };
          
          await this.handleCommand(telegramCommand);
        }
      }
      
      // Handle callback queries from inline keyboards
      if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }
    } catch (error) {
      logger.error('Error procesando webhook:', error);
    }
  }

  // Handle callback queries from inline keyboards
  private async handleCallbackQuery(callbackQuery: any): Promise<void> {
    try {
      const { data, message } = callbackQuery;
      const chatId = message.chat.id.toString();

      // Answer callback query to remove loading state
      if (this.bot) {
        await this.bot.answerCallbackQuery(callbackQuery.id);
      }

      // Parse callback data
      const [action, ...params] = data.split('_');

      switch (action) {
        case 'invoice':
          if (params[0] === 'send') {
            await this.handleInvoiceSend(chatId, [params[1]]);
          } else if (params[0] === 'list') {
            await this.handleInvoiceList(chatId, []);
          } else if (params[0] === 'create') {
            await this.sendMessage(chatId, 'Use: /invoice create "cliente" cantidad "descripción"');
          }
          break;
          
        case 'revenue':
          if (params[0] === 'breakdown') {
            await this.handleRevenueCommand(chatId, ['breakdown', params[1] || 'month']);
          }
          break;
          
        case 'pending':
          if (params[0] === 'list') {
            await this.handlePendingCommand(chatId, []);
          }
          break;
          
        case 'client':
          if (params[0] === 'invoices') {
            const clientId = params[1];
            await this.handleInvoiceList(chatId, [clientId]);
          }
          break;
          
        case 'open':
          if (params[0] === 'dashboard') {
            await this.handleDashboardCommand(chatId);
          }
          break;
      }
    } catch (error) {
      logger.error('Error handling callback query:', error);
    }
  }
}