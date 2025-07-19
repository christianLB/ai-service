# AI Trading Bot - Plan de Implementación Completo

## 📋 Instrucciones para Claude Code

Este documento contiene el plan completo para transformar el AI Service en un sistema de trading algorítmico auto-mejorable. Lee este documento completamente y ejecuta las tareas en orden.

## 🎯 Objetivo Principal

Convertir el AI Service existente en un bot de trading inteligente que:
- Analice mercados en tiempo real
- Ejecute operaciones automáticamente
- Aprenda de sus errores y se auto-mejore
- Genere ingresos de forma autónoma

## 📁 Estructura del Proyecto

```
ai-service/
├── trading/                      # NUEVO - Sistema de trading
│   ├── core/
│   │   ├── market-intelligence.js
│   │   ├── trading-brain.js
│   │   ├── risk-manager.js
│   │   └── trade-executor.js
│   ├── strategies/
│   │   ├── arbitrage/
│   │   ├── market-making/
│   │   └── trend-following/
│   ├── analysis/
│   │   ├── backtest-engine.js
│   │   ├── performance-tracker.js
│   │   └── pattern-detector.js
│   └── connectors/
│       ├── binance.js
│       ├── coinbase.js
│       └── dex-aggregator.js
├── .superclaude/                # NUEVO - Configuración SuperClaude
│   ├── personas/
│   │   ├── quant.md
│   │   ├── trader.md
│   │   └── risk-manager.md
│   └── commands/
│       ├── backtest.md
│       ├── trade.md
│       └── analyze-market.md
├── mcp-trading-server/          # NUEVO - MCP Server local
│   ├── index.js
│   ├── tools/
│   └── package.json
└── [archivos existentes]
```

## 🛠️ Fase 1: Preparación del Entorno (Semana 1)

### 1.1 Instalar Dependencias Nuevas

```bash
# En el directorio raíz del proyecto
npm install --save \
  ccxt \                    # Trading en múltiples exchanges
  tulind \                  # Indicadores técnicos
  mathjs \                  # Cálculos complejos
  @influxdata/influxdb-client \ # Time series DB
  qdrant-js \              # Vector database
  bull \                   # Queue para procesamiento
  node-cron                # Tareas programadas
```

### 1.2 Configurar Bases de Datos Adicionales

Agregar a `docker-compose.yml`:

```yaml
  influxdb:
    image: influxdb:2.7-alpine
    ports:
      - "8086:8086"
    volumes:
      - /home/k2600x/dev/ai-service-data/influxdb:/var/lib/influxdb2
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=influx_password_2025
      - DOCKER_INFLUXDB_INIT_ORG=ai-trading
      - DOCKER_INFLUXDB_INIT_BUCKET=market-data
    networks:
      - ai-service-network

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - /home/k2600x/dev/ai-service-data/qdrant:/qdrant/storage
    networks:
      - ai-service-network
```

### 1.3 Configuración de Base de Datos para Claves Seguras

**NO usar variables de entorno para API keys**. Usar el sistema de claves encriptadas existente.

Crear migration `migrations/add-trading-integrations.sql`:

```sql
-- Tabla para claves de integración encriptadas
CREATE TABLE IF NOT EXISTS integration_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service VARCHAR(50) NOT NULL, -- 'binance', 'coinbase', 'claude', etc
  key_type VARCHAR(50) NOT NULL, -- 'api_key', 'secret', 'webhook_token'
  encrypted_value TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  environment VARCHAR(20) DEFAULT 'production', -- 'sandbox', 'production'
  last_rotated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(service, key_type, user_id, environment)
);

-- Tabla para configuración de trading
CREATE TABLE IF NOT EXISTS trading_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  config_key VARCHAR(100) NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, config_key)
);

-- Insertar configuración inicial de trading
INSERT INTO trading_config (user_id, config_key, config_value) VALUES
  (NULL, 'global.trading_mode', '"paper"'),
  (NULL, 'global.max_position_size', '1000'),
  (NULL, 'global.risk_per_trade', '0.02'),
  (NULL, 'global.stop_loss_percentage', '0.05');

-- Índices para performance
CREATE INDEX idx_integration_keys_service ON integration_keys(service);
CREATE INDEX idx_integration_keys_user ON integration_keys(user_id);
CREATE INDEX idx_trading_config_user ON trading_config(user_id);
```

Variables de entorno mínimas en `.env.production`:

```env
# === SOLO CONFIGURACIÓN DE SERVICIOS ===
INFLUXDB_URL=http://influxdb:8086
INFLUXDB_ORG=ai-trading
INFLUXDB_BUCKET=market-data

# === ENCRYPTION KEY ===
ENCRYPTION_KEY=your-32-char-encryption-key-here
```

## 📊 Fase 2: Core Trading System (Semana 2)

### 2.1 Market Intelligence Module con Gestión Segura de Claves

Crear `trading/core/secure-key-manager.js`:

```javascript
import crypto from 'crypto';

export class SecureKeyManager {
  constructor(db, cache) {
    this.db = db;
    this.cache = cache;
    this.algorithm = 'aes-256-gcm';
    this.keyCache = new Map();
  }

  async getKey(service, keyType, userId = null) {
    const cacheKey = `${service}:${keyType}:${userId || 'global'}`;
    
    // Check cache first
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey);
    }

    // Get from database
    const result = await this.db.query(
      `SELECT encrypted_value FROM integration_keys 
       WHERE service = $1 AND key_type = $2 
       AND ($3::uuid IS NULL OR user_id = $3)
       ORDER BY user_id DESC NULLS LAST LIMIT 1`,
      [service, keyType, userId]
    );

    if (!result.rows[0]) {
      throw new Error(`Key not found: ${service}.${keyType}`);
    }

    const decrypted = this.decrypt(result.rows[0].encrypted_value);
    
    // Cache for 5 minutes
    this.keyCache.set(cacheKey, decrypted);
    setTimeout(() => this.keyCache.delete(cacheKey), 5 * 60 * 1000);

    return decrypted;
  }

  async setKey(service, keyType, value, userId = null) {
    const encrypted = this.encrypt(value);
    
    await this.db.query(
      `INSERT INTO integration_keys (service, key_type, encrypted_value, user_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (service, key_type, user_id, environment) 
       DO UPDATE SET encrypted_value = $3, last_rotated = NOW()`,
      [service, keyType, encrypted, userId]
    );

    // Clear cache
    const cacheKey = `${service}:${keyType}:${userId || 'global'}`;
    this.keyCache.delete(cacheKey);
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

Actualizar `trading/core/market-intelligence.js`:

```javascript
import ccxt from 'ccxt';
import { InfluxDB, Point } from '@influxdata/influxdb-client';
import tulind from 'tulind';
import { SecureKeyManager } from './secure-key-manager.js';

export class MarketIntelligence {
  constructor(db, cache) {
    this.keyManager = new SecureKeyManager(db, cache);
    this.exchanges = {};
    this.influx = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUXDB_TOKEN,
    });
    
    this.writeApi = this.influx.getWriteApi(
      process.env.INFLUXDB_ORG, 
      process.env.INFLUXDB_BUCKET
    );
  }

  async initializeExchanges(userId = null) {
    // Inicializar Binance
    try {
      const binanceKey = await this.keyManager.getKey('binance', 'api_key', userId);
      const binanceSecret = await this.keyManager.getKey('binance', 'secret', userId);
      
      this.exchanges.binance = new ccxt.binance({
        apiKey: binanceKey,
        secret: binanceSecret,
        enableRateLimit: true,
      });
    } catch (err) {
      console.log('Binance keys not configured');
    }

    // Inicializar Coinbase
    try {
      const coinbaseKey = await this.keyManager.getKey('coinbase', 'api_key', userId);
      const coinbaseSecret = await this.keyManager.getKey('coinbase', 'secret', userId);
      
      this.exchanges.coinbase = new ccxt.coinbase({
        apiKey: coinbaseKey,
        secret: coinbaseSecret,
        enableRateLimit: true,
      });
    } catch (err) {
      console.log('Coinbase keys not configured');
    }
  }

  async getConfig(key, userId = null) {
    const result = await this.db.query(
      `SELECT config_value FROM trading_config 
       WHERE config_key = $1 AND ($2::uuid IS NULL OR user_id = $2)
       ORDER BY user_id DESC NULLS LAST LIMIT 1`,
      [key, userId]
    );
    
    return result.rows[0]?.config_value;
  }

  async startDataCollection() {
    // Implementar recolección de datos en tiempo real
    await this.initializeExchanges();
    // Resto de la implementación...
  }
}
```

### 2.2 Trading Brain con Claude y Gestión Segura

Crear `trading/core/trading-brain.js`:

```javascript
export class TradingBrain {
  constructor(db, cache, marketIntel, riskManager) {
    this.db = db;
    this.keyManager = new SecureKeyManager(db, cache);
    this.market = marketIntel;
    this.risk = riskManager;
    this.claudeClient = null;
  }

  async initialize(userId = null) {
    // Obtener API key de Claude desde la base de datos
    const claudeKey = await this.keyManager.getKey('claude', 'api_key', userId);
    
    this.claudeClient = new Anthropic({
      apiKey: claudeKey
    });
  }

  async evaluateOpportunity(signal, userId = null) {
    if (!this.claudeClient) {
      await this.initialize(userId);
    }

    // 1. Recopilar contexto completo
    const context = {
      signal,
      marketConditions: await this.market.getCurrentConditions(),
      portfolio: await this.getPortfolioStatus(userId),
      recentTrades: await this.getRecentTrades(userId),
      newsEvents: await this.getRelevantNews(),
      tradingConfig: await this.getTradingConfig(userId)
    };

    // 2. Claude analiza la oportunidad
    const response = await this.claudeClient.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Evalúa esta oportunidad de trading con el siguiente contexto:
        ${JSON.stringify(context, null, 2)}
        
        Responde con JSON:
        {
          "recommendation": "trade|skip",
          "confidence": 0.0-1.0,
          "action": "buy|sell",
          "amount": number,
          "stopLoss": number,
          "takeProfit": number,
          "reasoning": "explicación detallada"
        }`
      }]
    });

    const analysis = JSON.parse(response.content[0].text);

    // 3. Validar con risk manager
    if (analysis.recommendation === 'trade') {
      return this.risk.validateTrade(analysis, userId);
    }

    return { action: 'skip', reason: analysis.reasoning };
  }

  async getTradingConfig(userId) {
    const configs = await this.db.query(
      `SELECT config_key, config_value FROM trading_config 
       WHERE user_id = $1 OR user_id IS NULL`,
      [userId]
    );
    
    return configs.rows.reduce((acc, row) => {
      acc[row.config_key] = row.config_value;
      return acc;
    }, {});
  }
}
```

### 2.3 Sistema de Backtesting

Crear `trading/analysis/backtest-engine.js`:

```javascript
export class BacktestEngine {
  async runBacktest(strategy, startDate, endDate, initialCapital = 10000) {
    // Obtener datos históricos
    // Simular trades
    // Calcular métricas:
    // - Sharpe Ratio
    // - Max Drawdown
    // - Win Rate
    // - Profit Factor
    // Retornar resultados detallados
  }

  async optimizeParameters(strategy, paramRanges) {
    // Grid search o algoritmo genético
    // Encontrar mejores parámetros
    // Validar con walk-forward analysis
  }
}
```

## 🤖 Fase 3: Estrategias de Trading (Semana 3)

### 3.1 Estrategia de Arbitraje

Crear `trading/strategies/arbitrage/triangular-arbitrage.js`:

```javascript
export class TriangularArbitrage {
  constructor(exchanges) {
    this.exchanges = exchanges;
    this.minProfitThreshold = 0.003; // 0.3%
  }

  async findOpportunities() {
    // Escanear pares de trading
    // Calcular rutas de arbitraje
    // Verificar liquidez
    // Retornar oportunidades viables
  }

  async execute(opportunity) {
    // Ejecutar trades en secuencia
    // Manejar slippage
    // Confirmar profit
  }
}
```

### 3.2 Market Making

Crear `trading/strategies/market-making/simple-mm.js`:

```javascript
export class SimpleMarketMaker {
  constructor(exchange, pair, config) {
    this.exchange = exchange;
    this.pair = pair;
    this.spread = config.spread || 0.002;
    this.orderSize = config.orderSize;
  }

  async run() {
    // Obtener order book
    // Calcular precio medio
    // Colocar órdenes a ambos lados
    // Ajustar según volatilidad
    // Cancelar y rehacer si es necesario
  }
}
```

## 🔄 Fase 4: Auto-Mejora Continua (Semana 4)

### 4.1 Performance Tracker

Crear `trading/analysis/performance-tracker.js`:

```javascript
export class PerformanceTracker {
  async recordTrade(trade) {
    // Guardar en PostgreSQL
    // Calcular métricas en tiempo real
    // Detectar patrones de éxito/fracaso
  }

  async dailyAnalysis() {
    // Análisis completo del día
    // Identificar mejoras
    // Generar reporte
    // Sugerir ajustes de parámetros
  }

  async generateImprovement() {
    // Claude analiza el performance
    // Genera código de mejora
    // Crea PR en GitHub
  }
}
```

### 4.2 Sistema de A/B Testing

Crear `trading/analysis/ab-testing.js`:

```javascript
export class ABTestingFramework {
  async createTest(strategyA, strategyB, allocation = 0.5) {
    // Dividir capital
    // Ejecutar ambas estrategias en paralelo
    // Medir performance
    // Análisis estadístico
  }

  async evaluateResults(testId) {
    // Comparar métricas
    // Significancia estadística
    // Recomendar ganador
  }
}
```

## 🚀 Fase 5: MCP Server Local

### 5.1 Crear MCP Server

Crear `mcp-trading-server/index.js`:

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'ai-trading-mcp',
  version: '1.0.0',
});

// Definir herramientas disponibles
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'analyze_market',
      description: 'Analizar mercado para un activo',
      inputSchema: {
        type: 'object',
        properties: {
          symbol: { type: 'string' },
          timeframe: { type: 'string' }
        }
      }
    },
    {
      name: 'execute_trade',
      description: 'Ejecutar trade con gestión de riesgo',
      inputSchema: {
        type: 'object',
        properties: {
          action: { enum: ['buy', 'sell'] },
          symbol: { type: 'string' },
          amount: { type: 'number' }
        }
      }
    },
    {
      name: 'backtest_strategy',
      description: 'Backtest de estrategia',
      inputSchema: {
        type: 'object',
        properties: {
          strategy: { type: 'string' },
          period: { type: 'string' },
          capital: { type: 'number' }
        }
      }
    }
  ]
}));

// Implementar los handlers
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  switch(name) {
    case 'analyze_market':
      // Llamar a tu API en Synology
      const response = await fetch(
        `http://synology.local:3000/api/trading/analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        }
      );
      return await response.json();
      
    // Implementar otros casos...
  }
});

// Iniciar servidor
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 5.2 Configurar Claude Desktop

Actualizar `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-trading": {
      "command": "node",
      "args": ["/path/to/ai-service/mcp-trading-server/index.js"],
      "env": {
        "AI_SERVICE_URL": "http://synology.local:3000"
      }
    }
  }
}
```

## 🎨 Fase 6: Dashboard para Gestión de API Keys

### 6.1 UI para Gestión de Claves

Crear `pages/api/integrations/keys.js`:

```javascript
import { SecureKeyManager } from '../../../trading/core/secure-key-manager.js';

export default async function handler(req, res) {
  const { method } = req;
  const keyManager = new SecureKeyManager(db, redis);

  switch (method) {
    case 'GET':
      // Listar integraciones disponibles
      const integrations = await db.query(
        `SELECT DISTINCT service, key_type, last_rotated, 
         CASE WHEN encrypted_value IS NOT NULL THEN true ELSE false END as configured
         FROM integration_keys 
         WHERE user_id = $1 OR user_id IS NULL
         ORDER BY service`,
        [req.user.id]
      );
      
      res.json(integrations.rows);
      break;

    case 'POST':
      // Guardar nueva clave
      const { service, keyType, value } = req.body;
      
      try {
        await keyManager.setKey(service, keyType, value, req.user.id);
        
        // Log para auditoría
        await db.query(
          `INSERT INTO audit_log (user_id, action, entity_type, entity_id, metadata)
           VALUES ($1, 'update_api_key', 'integration', $2, $3)`,
          [req.user.id, service, { keyType, timestamp: new Date() }]
        );
        
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
      break;

    case 'DELETE':
      // Eliminar clave
      const { service: delService, keyType: delKeyType } = req.query;
      
      await db.query(
        `DELETE FROM integration_keys 
         WHERE service = $1 AND key_type = $2 AND user_id = $3`,
        [delService, delKeyType, req.user.id]
      );
      
      res.json({ success: true });
      break;
  }
}
```

Crear componente React `components/IntegrationManager.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Lock, Key, RefreshCw, AlertCircle } from 'lucide-react';

export function IntegrationManager() {
  const [integrations, setIntegrations] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedService, setSelectedService] = useState('');

  const services = [
    { id: 'binance', name: 'Binance', keys: ['api_key', 'secret'] },
    { id: 'coinbase', name: 'Coinbase', keys: ['api_key', 'secret'] },
    { id: 'claude', name: 'Claude AI', keys: ['api_key'] },
    { id: 'openai', name: 'OpenAI', keys: ['api_key'] },
    { id: 'telegram', name: 'Telegram', keys: ['bot_token', 'chat_id'] }
  ];

  async function saveKey(service, keyType, value) {
    const response = await fetch('/api/integrations/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service, keyType, value })
    });

    if (response.ok) {
      toast.success('API Key guardada de forma segura');
      loadIntegrations();
      setShowAddModal(false);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Gestión de Integraciones</h2>
      
      <div className="grid gap-4">
        {services.map(service => (
          <div key={service.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{service.name}</h3>
              <button
                onClick={() => {
                  setSelectedService(service);
                  setShowAddModal(true);
                }}
                className="btn btn-primary btn-sm"
              >
                <Key className="w-4 h-4 mr-1" />
                Configurar
              </button>
            </div>
            
            <div className="mt-2 space-y-1">
              {service.keys.map(keyType => {
                const config = integrations.find(
                  i => i.service === service.id && i.key_type === keyType
                );
                
                return (
                  <div key={keyType} className="flex items-center text-sm">
                    <Lock className="w-3 h-3 mr-2" />
                    <span className="font-mono">{keyType}:</span>
                    {config?.configured ? (
                      <span className="text-green-600 ml-2">Configurado ✓</span>
                    ) : (
                      <span className="text-gray-400 ml-2">No configurado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal para agregar/editar claves */}
      {showAddModal && (
        <KeyInputModal
          service={selectedService}
          onSave={saveKey}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
```

### 6.2 Configuración de Trading desde UI

Crear `pages/api/trading/config.js`:

```javascript
export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      const configs = await db.query(
        `SELECT config_key, config_value FROM trading_config 
         WHERE user_id = $1 OR user_id IS NULL
         ORDER BY config_key`,
        [req.user.id]
      );
      
      res.json(configs.rows);
      break;

    case 'PUT':
      const { key, value } = req.body;
      
      await db.query(
        `INSERT INTO trading_config (user_id, config_key, config_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, config_key) 
         DO UPDATE SET config_value = $3, updated_at = NOW()`,
        [req.user.id, key, JSON.stringify(value)]
      );
      
      res.json({ success: true });
      break;
  }
}
```

## 📊 Integración con Sistema Existente

### Arquitectura Unificada

Tu AI Service existente se mantiene como el núcleo central:

```
Synology NAS (Cerebro Central)
├── PostgreSQL (Base de datos única)
│   ├── transactions (financieras existentes)
│   ├── documents (inteligencia documental)
│   ├── integration_keys (API keys encriptadas)
│   ├── trading_config (configuración)
│   ├── trades (nuevas operaciones de trading)
│   └── audit_log (toda la actividad)
│
├── AI Service Core (Expandido)
│   ├── /api/financial/* (endpoints existentes)
│   ├── /api/documents/* (gestión documental)
│   ├── /api/telegram/* (bot existente)
│   ├── /api/trading/* (NUEVO - trading endpoints)
│   └── /api/integrations/* (NUEVO - gestión de claves)
│
├── Trading Module (NUEVO - plugin del AI Service)
│   ├── Usa la misma DB connection
│   ├── Usa el mismo Redis cache
│   ├── Usa el mismo sistema de auth
│   └── Se integra con n8n workflows
│
└── InfluxDB (NUEVO - solo para datos de mercado temporal)
    └── Cache de ticks y velas (no crítico)
```

### Flujo de Datos Integrado

1. **Telegram Bot** recibe comando → AI Service decide si es trading
2. **Document Intelligence** analiza reportes → Alimenta decisiones de trading
3. **Trading Module** ejecuta trades → Guarda en PostgreSQL central
4. **n8n Workflows** pueden automatizar estrategias complejas
5. **Dashboard unificado** muestra todo: finanzas + trading + documentos

### Ejemplo de Integración

```javascript
// En tu AI Service existente, agregar:
app.use('/api/trading', tradingRouter);

// El trading module usa tu infraestructura existente:
class TradingService {
  constructor(existingDb, existingCache, existingAuth) {
    this.db = existingDb;  // La misma PostgreSQL
    this.cache = existingCache;  // El mismo Redis
    this.auth = existingAuth;  // El mismo sistema de auth
    
    // Inicializar componentes de trading
    this.marketIntel = new MarketIntelligence(this.db, this.cache);
    this.tradingBrain = new TradingBrain(this.db, this.cache);
  }
}
```

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev:trading        # Modo desarrollo con hot reload
npm run test:strategies    # Test de estrategias
npm run backtest           # Ejecutar backtests

# Producción
npm run trading:start      # Iniciar trading bot
npm run trading:stop       # Detener trading bot
npm run trading:status     # Ver estado actual

# Análisis
npm run analyze:performance # Análisis de performance
npm run analyze:trades     # Análisis de trades
npm run generate:report    # Generar reporte
```

## 📝 Notas Importantes

1. **Seguridad**: Nunca hardcodees API keys. Usa variables de entorno.
2. **Risk Management**: Empieza con paper trading. Luego con montos pequeños.
3. **Monitoreo**: Configura alertas para movimientos anormales.
4. **Backups**: Backup diario de la base de datos de trades.
5. **Logs**: Guarda logs detallados de todas las decisiones.

## 🚨 Checklist de Seguridad

- [ ] API keys en variables de entorno
- [ ] Límites de posición configurados
- [ ] Stop loss obligatorio en cada trade
- [ ] Alertas de drawdown excesivo
- [ ] Circuit breakers para detener trading
- [ ] Logs de auditoría completos
- [ ] Backup automático de datos
- [ ] Monitoreo 24/7

## 💡 Recursos Adicionales

- [CCXT Documentation](https://docs.ccxt.com)
- [InfluxDB Time Series](https://docs.influxdata.com)
- [Backtesting Best Practices](https://www.quantstart.com/articles/backtesting/)
- [Risk Management](https://www.investopedia.com/trading/risk-management/)

---

**IMPORTANTE**: Este documento debe ser leído completamente por Claude Code antes de comenzar la implementación. Ejecuta las tareas en orden y consulta cualquier duda antes de proceder con cambios críticos.