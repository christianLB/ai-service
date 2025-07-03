# 🔧 Solución: Problema con archivo .env.production

## El Problema

Docker/Portainer puede tener problemas con archivos que empiezan con punto (`.`) en ciertas configuraciones, especialmente cuando se usa `env_file`.

## Soluciones

### Opción 1: Renombrar el archivo (RECOMENDADO)

En tu Synology NAS:
```bash
cd /volume1/docker/ai-service/config
mv .env.production production.env
```

Luego usa: `docker-compose.production-env.yml`

### Opción 2: Crear un enlace simbólico

```bash
cd /volume1/docker/ai-service/config
ln -s .env.production production.env
```

### Opción 3: Copiar el archivo

```bash
cd /volume1/docker/ai-service/config
cp .env.production production.env
```

## Docker Compose Actualizado

Usa este docker-compose que apunta a `production.env` (sin punto):

```yaml
https://raw.githubusercontent.com/christianLB/ai-service/main/docker-compose.production-env.yml
```

## Verificación

Para verificar si este es el problema, ejecuta:
```yaml
https://raw.githubusercontent.com/christianLB/ai-service/main/docker-compose.test-dot-file.yml
```

Este test te dirá si Docker está viendo `.env.production` como archivo o directorio.