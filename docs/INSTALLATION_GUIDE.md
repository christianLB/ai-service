# Guía de Instalación

Esta guía explica cómo poner en marcha el proyecto AI Service desde cero.

## Requisitos Previos
- Node.js 20+
- PostgreSQL 14+
- Docker (opcional para despliegue)

## Pasos Básicos
1. Clonar el repositorio:
   ```bash
   git clone https://example.com/ai-service.git
   cd ai-service
   ```
2. Instalar dependencias:
   ```bash
   npm install
   npm run install:frontend
   ```
3. Configurar las variables de entorno copiando `production.env.template` a `.env.local` y editando los valores.
4. Ejecutar las migraciones de base de datos:
   ```bash
   npm run migrate:up
   ```
5. Iniciar el entorno de desarrollo:
   ```bash
   npm run dev:full
   ```
6. Acceder al dashboard en `http://localhost:3000`.

### Variables de Entorno para Integraciones Crypto

Además de las variables existentes, define las siguientes en `.env.local` para habilitar la sincronización con exchanges y wallets:

```dotenv
CRYPTOCOM_API_KEY=tu-api-key
CRYPTOCOM_SECRET_KEY=tu-secret
BINANCE_API_KEY=tu-binance-key
BINANCE_SECRET_KEY=tu-binance-secret
METAMASK_PRIVATE_KEY=clave-privada
ETH_RPC_URL=https://mainnet.infura.io/v3/tu-id
```

Luego ejecuta `npm run migrate:up` para crear las tablas necesarias.

Para más detalles consulte la documentación en `docs/`.
