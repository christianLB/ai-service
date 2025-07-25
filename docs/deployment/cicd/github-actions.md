# GitHub Actions CI/CD Workflows

This document describes the GitHub Actions workflows used for continuous integration and deployment of the AI Service.

## Workflow Files

All workflow files are located in `.github/workflows/`:

### Production Workflows
- **`deploy-production.yml`** - Main production deployment to Synology NAS
- **`deploy-production-nas.yml`** - Alternative NAS deployment workflow
- **`release.yml`** - Release creation and tagging

### Development Workflows
- **`deploy.yml`** - Development environment deployment
- **`deploy-v2.yml`** - Enhanced deployment with better error handling
- **`docker-publish.yml`** - Docker image building and registry push

### Quality Workflows
- **`test.yml`** - Automated testing pipeline
- **`lint.yml`** - Code quality and linting checks

## Production Deployment Flow

### Triggers
```yaml
on:
  push:
    branches: [ main ]
  workflow_dispatch:  # Manual trigger
```

### Environment Variables
```yaml
env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
  DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
```

### Key Steps

1. **Build and Test**
   ```yaml
   - name: Build application
     run: |
       npm ci
       npm run build
       npm test
   ```

2. **Docker Build**
   ```yaml
   - name: Build Docker image
     uses: docker/build-push-action@v4
     with:
       context: .
       push: true
       tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
   ```

3. **Deploy to Synology**
   ```yaml
   - name: Deploy to NAS
     uses: appleboy/ssh-action@v0.1.5
     with:
       host: ${{ secrets.DEPLOY_HOST }}
       username: ${{ secrets.DEPLOY_USER }}
       key: ${{ secrets.DEPLOY_KEY }}
       script: |
         cd /volume1/docker/ai-service
         docker-compose pull
         docker-compose up -d
   ```

## Security Configuration

### Required Secrets
```
DEPLOY_HOST         # Synology NAS IP/hostname
DEPLOY_USER         # SSH user for deployment
DEPLOY_KEY          # SSH private key
DOCKER_USERNAME     # Docker registry username
DOCKER_PASSWORD     # Docker registry password
NPM_TOKEN           # NPM registry token (if needed)
```

### Security Best Practices
1. Use GitHub Environments for production secrets
2. Enable required reviewers for production deployments
3. Use OIDC for cloud provider authentication
4. Implement deployment protection rules

## Deployment Strategies

### Blue-Green Deployment
```yaml
- name: Deploy Blue-Green
  run: |
    # Deploy to inactive color
    docker-compose -f docker-compose.blue.yml up -d
    
    # Health check
    ./scripts/health-check.sh blue
    
    # Switch traffic
    ./scripts/switch-traffic.sh blue
    
    # Stop old version
    docker-compose -f docker-compose.green.yml down
```

### Rolling Update
```yaml
- name: Rolling Update
  run: |
    docker service update \
      --image ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
      --update-parallelism 1 \
      --update-delay 10s \
      ai-service
```

## Monitoring and Rollback

### Health Checks
```yaml
- name: Verify Deployment
  run: |
    for i in {1..30}; do
      if curl -f http://${{ secrets.DEPLOY_HOST }}:3001/health; then
        echo "Deployment successful"
        exit 0
      fi
      sleep 10
    done
    echo "Deployment failed"
    exit 1
```

### Automatic Rollback
```yaml
- name: Rollback on Failure
  if: failure()
  run: |
    ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} \
      "cd /volume1/docker/ai-service && \
       docker-compose down && \
       git checkout HEAD~1 && \
       docker-compose up -d"
```

## Manual Deployment

For manual deployment when GitHub Actions is unavailable:

```bash
# SSH to Synology NAS
ssh user@nas-ip

# Navigate to project
cd /volume1/docker/ai-service

# Pull latest changes
git pull origin main

# Update containers
docker-compose pull
docker-compose up -d

# Verify deployment
docker-compose ps
docker-compose logs -f
```

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Verify DEPLOY_HOST is correct
   - Check SSH key permissions
   - Ensure port 22 is open

2. **Docker Build Failed**
   - Check Dockerfile syntax
   - Verify base image availability
   - Review build logs

3. **Deployment Timeout**
   - Increase timeout values
   - Check NAS resources
   - Verify network connectivity

### Debug Mode
```yaml
- name: Enable Debug
  run: |
    echo "::debug::Debug mode enabled"
    docker-compose config
    docker ps -a
    docker logs ai-service-api
```

## Best Practices

1. **Version Tagging**
   - Tag production deployments
   - Use semantic versioning
   - Keep deployment history

2. **Environment Separation**
   - Separate dev/staging/prod workflows
   - Use environment-specific secrets
   - Implement approval gates

3. **Monitoring Integration**
   - Send deployment notifications
   - Update monitoring dashboards
   - Track deployment metrics

## Related Documentation

- [CI/CD Security](./security.md)
- [Docker Configuration](../docker/)
- [Synology Deployment](../synology/)