# Requerimientos para Codex CLI – Proyecto `ai-service`

## Objetivo

Construir un microservicio `ai-service` autohosteado en Docker que orquesta la automatización financiera y operativa de mi stack personal, con capacidades de:

* Crear, modificar, testear y desplegar workflows en `n8n`.
* Integrarse con `Strapi`, `PostgreSQL`, `Redis`, `Binance API`, `GoCardless`.
* Generar, guardar y versionar workflows como JSON en un repo Git.
* Exponer endpoints HTTP para ser consumidos desde Next.js y/o Slack.
* Usar LLMs como OpenAI, Claude o Gemini para interpretar tareas y generar código.

---

## Alcance Fase 1 – MVP funcional (automatización de workflows n8n)

### 1. Repositorio y estructura

```bash
ai-service/
├── Dockerfile
├── docker-compose.yml
├── .env.template
├── src/
│   ├── index.ts          # HTTP server (Express or Hono)
│   ├── routes/
│   │   ├── flow-gen.ts   # POST /flow-gen
│   │   ├── flow-update.ts
│   │   └── flow-test.ts
│   ├── services/
│   │   ├── openai.ts     # client wrapper
│   │   ├── n8n.ts        # API client for n8n
│   │   └── validator.ts  # JSON schema + OPA
│   └── utils/
│       ├── log.ts
│       └── prompts.ts
├── workflows/            # carpeta donde guarda los JSON generados
└── tsconfig.json
```

### 2. Endpoints

| Método | Ruta           | Descripción                                |
| ------ | -------------- | ------------------------------------------ |
| POST   | `/flow-gen`    | Genera workflow desde descripción natural. |
| POST   | `/flow-update` | Modifica workflow existente.               |
| POST   | `/flow-test`   | Ejecuta test contra workflow (mocks).      |
| GET    | `/status`      | Prueba de vida.                            |

### 3. LLM integration

* Wrapper para **OpenAI GPT-4o** y **Claude 3.5 Sonnet**.
* Prompt templates JSON (function-calling) predefinidos para `create_workflow`, `modify_workflow`.

### 4. Seguridad y validación

* Validación con `Ajv` contra JSON Schema oficial de `n8n`.
* Política OPA (archivos `.rego`) con reglas:

  * nodos permitidos
  * límites de cantidad
  * límites de requests por IP/API-Key

### 5. Despliegue

* Dockerfile optimizado (`FROM node:20-alpine`) + healthcheck.
* `.env` con claves:

```env
OPENAI_API_KEY=sk-...
N8N_API_URL=http://n8n:5678
N8N_API_KEY=...
STRAPI_API_URL=http://strapi:1337
PORT=3000
```

* Imagen lista para publicar a GHCR si se desea.

---

## Alcance Fase 2 – Panel IA y versionado Git

* Añadir endpoint `/flows` → devuelve lista de flujos generados.
* Guardar cada workflow generado como archivo `workflows/<name>.json`.
* Commit automático en rama `ai-flows` del repo actual (`git` CLI desde Node).
* Dashboard `/ai/flows` en frontend (fuera de este alcance).

---

## Alcance Fase 3 – Automatizaciones extendidas

* Crear credenciales n8n desde IA (`POST /credentials`).
* Modificar cron, nodos, condiciones.
* Añadir test suite.
* Llamar a Slack webhook para notificar tareas completadas.
* Monitorizar errores y tiempo de respuesta de n8n.

---

## Dependencias

* Node.js 20+
* Docker
* OpenAI y/o Anthropic Key
* Acceso a instancia n8n con API Key activa
* Git (para versionado local de flujos)

---

## Instrucciones para Codex CLI

**"Leé este documento y ejecutá todo para levantar el servicio 'ai-service' y dejarlo listo para recibir instrucciones"**

---

## Notas

* Todo el output del asistente debe loguearse en consola y guardarse en `logs/ai.log`.
* Los workflows generados deben poder inspeccionarse, exportarse y reutilizarse.
* El servicio puede extenderse luego con conexión a Claude Code, Codex CLI u otro agente.

---

> Documento generado para uso directo de Codex CLI u otro asistente con capacidad de ejecutar proyectos devops completos.
