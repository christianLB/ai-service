# 🧠 Neural Architecture Definition - AI Service

## 📋 Terminología Neuronal Oficial

### **Sistema de Clasificación**

```typescript
// Taxonomía oficial del sistema
enum ComponentType {
  CORE = 'core',           // ❤️ Vital - falla = muerte del sistema
  HEMISPHERE = 'hemisphere', // 🧠 Autónomo - puede operar independiente
  EXTREMITY = 'extremity',   // 🦾 Opcional - falla parcial tolerable
  RAMIFICATION = 'ramification' // 🌿 Sub-funcionalidad específica
}

enum HealthStatus {
  OPTIMAL = 'optimal',     // 🟢 100% funcional
  DEGRADED = 'degraded',   // 🟡 Funcional con limitaciones
  CRITICAL = 'critical',   // 🟠 Barely functional
  OFFLINE = 'offline'      // 🔴 No funcional
}
```

---

## 🏗️ Arquitectura Neural Actual

### **🔴 CORE (Sistema Nervioso Central)**

**Componentes Vitales:**
- **Cerebro**: `src/index.ts` - Orquestador principal
- **Médula**: `src/services/database.ts` - Conexión vital a datos
- **Corazón**: Health Check (`/status`) - Latido del sistema
- **Sistema Circulatorio**: Express Server + Database Pool

**Criterio de Falla:** Cualquier falla aquí = MUERTE TOTAL del sistema

### **🧠 HEMISFERIOS (Sistemas Autónomos)**

#### **🏦 Hemisferio Financiero (Financial Intelligence)**
```yaml
Core: src/services/financial/
Rutas: src/routes/financial.ts
Estado: OPERATIONAL
Dependencias Críticas:
  - GoCardless API (external)
  - OpenAI API (external)
  - PostgreSQL schema: financial.*
```

#### **📄 Hemisferio Documental (Document Intelligence)**
```yaml
Core: src/services/document-intelligence/
Rutas: src/routes/documents/
Estado: OPERATIONAL (PDF processing degraded)
Dependencias Críticas:
  - OpenAI API (external)
  - File System (local)
  - PostgreSQL schema: documents.*
```

#### **⚙️ Hemisferio Workflow (Automation Intelligence)**
```yaml
Core: src/routes/flow-*.ts
Integration: src/services/n8n.ts
Estado: OPERATIONAL
Dependencias Críticas:
  - PostgreSQL tables: workflows, executions
  - n8n API (external)
```

### **🦾 EXTREMIDADES (Funcionalidades Opcionales)**

#### **📱 Extremidad Comunicación**
```yaml
Core: src/services/communication/
Estado: OPERATIONAL
Impacto de Falla: MINIMAL - pérdida de notificaciones
```

#### **📊 Extremidad Métricas**
```yaml
Core: src/services/metrics.ts
Estado: OPERATIONAL
Impacto de Falla: INFORMACIONAL - pérdida de visibilidad
```

---

## 🎯 Matriz de Dependencias

### **Dependencias Críticas (Falla Total)**
| Componente | Tipo | Impacto Sin Él |
|------------|------|----------------|
| PostgreSQL | Core | 🔴 Sistema muerto |
| Express Server | Core | 🔴 Sin comunicación |
| Environment Vars | Core | 🔴 Sin configuración |

### **Dependencias de Hemisferio (Falla Parcial)**
| Componente | Hemisferio | Impacto Sin Él |
|------------|------------|----------------|
| OpenAI API | Financial + Document | 🟡 Sin IA, con datos básicos |
| GoCardless API | Financial | 🟡 Sin sync, con históricos |
| File System | Document | 🟡 Sin documentos, con metadatos |

### **Dependencias Opcionales (Degradación)**
| Componente | Extremidad | Impacto Sin Él |
|------------|------------|----------------|
| Telegram API | Comunicación | 🟢 Sin notificaciones |
| Redis | Métricas | 🟢 Sin cache |
| n8n API | Workflow | 🟢 Sin workflows externos |

---

## 🔄 Estados Operativos

### **Modo Completo (OPTIMAL)**
- Todos los hemisferios y extremidades operativas
- Todas las dependencias externas funcionando
- Capacidades completas de IA

### **Modo Esencial (DEGRADED)**
- Core + Hemisferios sin dependencias externas
- Sin OpenAI → Sin IA pero con CRUD
- Sin APIs externas → Solo datos locales

### **Modo Crítico (CRITICAL)**
- Solo Core + funcionalidades mínimas
- Health check + Database básico
- Sin hemisferios complejos

### **Modo Offline (OFFLINE)**
- Sistema no responde
- Requiere intervención manual
- Posible corrupción de datos

---

## 🎛️ Sistema de Auto-Reestructuración

### **Principios de Adaptación**

1. **Cascada Controlada**: Las fallas deben degradar gradualmente, no en avalancha
2. **Aislamiento de Hemisferios**: Un hemisferio caído no debe afectar otros
3. **Recuperación Automática**: Reintentos inteligentes para dependencias externas
4. **Modo Supervivencia**: Core debe poder operar con recursos mínimos

### **Algoritmo de Reestructuración**

```typescript
class NeuralOrchestrator {
  async evaluateSystemHealth(): Promise<SystemState> {
    // 1. Check CORE vitals
    // 2. Assess each HEMISPHERE
    // 3. Monitor EXTREMITIES
    // 4. Determine optimal operation mode
  }
  
  async adaptToConditions(currentState: SystemState): Promise<void> {
    // 1. Disable failed extremities
    // 2. Isolate damaged hemispheres
    // 3. Reroute traffic to healthy components
    // 4. Report new configuration
  }
}
```

---

## 📡 Terminología de Comunicación

### **Estados para Reporting**
- **"Sistema Neuronal Optimal"** = Todo funcionando
- **"Hemisferio X en modo degradado"** = Funcionalidad parcial
- **"Extremidad Y offline"** = Funcionalidad opcional caída
- **"Core en modo crítico"** = Solo funciones vitales

### **Alertas por Severidad**
- **🔴 NEURAL EMERGENCY**: Core comprometido
- **🟠 HEMISPHERE FAILURE**: Área funcional caída
- **🟡 EXTREMITY DEGRADED**: Funcionalidad opcional limitada
- **🟢 RAMIFICATION ISSUE**: Sub-funcionalidad específica

---

## 🎯 Próximo Paso Crítico

**CREAR EL ORQUESTADOR NEURAL** que:
1. Monitoree cada componente según esta taxonomía
2. Tome decisiones de reestructuración automática
3. Reporte estado usando terminología neuronal
4. Mantenga el sistema operativo bajo cualquier condición

Este será el verdadero "núcleo que sabe cómo reestructurarse".