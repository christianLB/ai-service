import TelegramBot from 'node-telegram-bot-api';
import { TelegramConfig, FinancialAlert, TelegramCommand, SystemStatus, FinancialSummary, ReportType, AlertPriority } from './types';
import { FinancialDatabaseService } from '../financial/database.service';
import { logger } from '../../utils/log';

export class TelegramService {
  private bot: TelegramBot;
  private config: TelegramConfig;
  private financialService: FinancialDatabaseService;

  constructor(config: TelegramConfig, financialService: FinancialDatabaseService) {
    this.config = config;
    this.financialService = financialService;
    
    this.bot = new TelegramBot(config.botToken, {
      polling: false,  // Usaremos webhook
      webHook: false
    });

    this.setupCommands();
    logger.info('Telegram service initialized');
  }

  private setupCommands(): void {
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
      { command: 'dashboard', description: 'Enlace al dashboard' }
    ]);
  }

  async setWebhook(url: string): Promise<void> {
    try {
      await this.bot.setWebHook(url);
      logger.info(`Webhook configurado: ${url}`);
    } catch (error) {
      logger.error('Error configurando webhook:', error);
      throw error;
    }
  }

  async sendMessage(chatId: string, message: string, options?: any): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        ...options
      });
      logger.info(`Mensaje enviado a ${chatId}`);
    } catch (error) {
      logger.error('Error enviando mensaje:', error);
      throw error;
    }
  }

  async sendAlert(alert: FinancialAlert): Promise<void> {
    if (!this.config.alertsEnabled) {
      logger.info('Alertas deshabilitadas, ignorando');
      return;
    }

    const emoji = this.getAlertEmoji(alert.priority);
    const message = `${emoji} <b>${alert.type.toUpperCase()}</b>\\n\\n${alert.message}\\n\\n<i>Timestamp: ${alert.timestamp.toISOString()}</i>`;
    
    try {
      await this.sendMessage(this.config.chatId, message);
      logger.info(`Alerta enviada: ${alert.type} - ${alert.priority}`);
    } catch (error) {
      logger.error('Error enviando alerta:', error);
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
        case '/complete_setup':
          await this.handleCompleteSetupCommand(chatId, params);
          break;
        case '/dashboard':
          await this.handleDashboardCommand(chatId);
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
🤖 <b>¡Hola! Soy tu Bot Financiero AI</b>

Estoy conectado a tu sistema AI Service y puedo ayudarte con:

💰 <b>Información financiera</b>
📊 <b>Reportes automáticos</b>
🔄 <b>Sincronización bancaria</b>
⚙️ <b>Control del sistema</b>

Usa /help para ver todos los comandos disponibles.

<i>Sistema inicializado: ${new Date().toLocaleString()}</i>
    `;
    
    await this.sendMessage(chatId, message);
  }

  private async handleHelpCommand(chatId: string): Promise<void> {
    const message = `
📖 <b>Comandos Disponibles</b>

<b>💰 Financieros:</b>
/balance - Balance actual de cuentas
/gastos [categoría] - Gastos por categoría
/reporte [periodo] - Generar reporte (daily/weekly/monthly)
/sync - Sincronizar transacciones bancarias
/setup - Configurar conexión bancaria

<b>⚙️ Sistema:</b>
/status - Estado del sistema AI
/dashboard - Enlace al dashboard web

<b>ℹ️ Ayuda:</b>
/help - Mostrar esta ayuda
/start - Reiniciar el bot

<i>Ejemplo: /gastos alimentacion</i>
<i>Ejemplo: /reporte weekly</i>
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
        const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/financial/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
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

Para comenzar, necesito que elijas tu banco. Por ejemplo:
• Para BBVA: /setup_bbva
• Para otro banco: Contacta soporte

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
        
        // Guardar requisition ID para este usuario (por ahora en memoria)
        // TODO: Persistir esto en base de datos con el chat_id del usuario
        
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
        `);
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
        categorizedTransactions: transactions.items.filter((t: any) => t.category).length,
        pendingCategorizations: transactions.items.filter((t: any) => !t.category).length
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

  // Método para procesar webhook
  async processWebhook(update: any): Promise<void> {
    try {
      if (update.message) {
        const message = update.message;
        
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
    } catch (error) {
      logger.error('Error procesando webhook:', error);
    }
  }
}