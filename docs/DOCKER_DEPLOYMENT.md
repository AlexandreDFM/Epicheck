# EpiCheck - Docker & Kubernetes Deployment

This document provides comprehensive instructions for deploying EpiCheck using Docker and Kubernetes.

## 📋 Table of Contents

- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [Architecture](#architecture)

---

## 🐳 Docker Deployment

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

### Development Environment

Start the development environment with hot-reload:

```bash
# Start development containers
docker-compose -f docker-compose.dev.yml up

# Start in detached mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop containers
docker-compose -f docker-compose.dev.yml down
```

Access the application at:
- Expo DevTools: http://localhost:19000
- Metro Bundler: http://localhost:19002
- Proxy Server: http://localhost:3001

### Production Environment

Start the production environment:

```bash
# Build and start production containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

Access the application at:
- Web App: http://localhost
- Proxy API: http://localhost:3001

### Building Individual Images

```bash
# Build development image
docker build -f Dockerfile.dev -t epicheck:dev .

# Build production image
docker build -t epicheck:latest .

# Build proxy image
docker build -t epicheck-proxy:latest ./proxy-server
```

### Running Individual Containers

```bash
# Run development container
docker run -p 19000:19000 -p 19001:19001 -p 19002:19002 \
  -v $(pwd):/app \
  -v /app/node_modules \
  epicheck:dev

# Run production container
docker run -p 80:80 epicheck:latest

# Run proxy container
docker run -p 3001:3001 epicheck-proxy:latest
```

---

## ☸️ Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl CLI configured
- Docker registry access
- NGINX Ingress Controller
- cert-manager (for TLS)

### Quick Deployment

Use the automated deployment script:

```bash
cd kubernetes
./deploy.sh
```

Or deploy manually:

```bash
# Apply all manifests
kubectl apply -f kubernetes/

# Or step by step
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secrets.yaml
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/ingress.yaml
kubectl apply -f kubernetes/hpa.yaml
```

### Verify Deployment

```bash
# Check all resources
kubectl get all -n epicheck

# Check pods
kubectl get pods -n epicheck -w

# View logs
kubectl logs -f deployment/epicheck-app -n epicheck
```

For detailed Kubernetes documentation, see [kubernetes/README.md](kubernetes/README.md)

---

## 🛠️ Development Setup

### Local Development with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EpiCheck
   ```

2. **Start development environment**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

3. **Access the application**
   - Open Expo DevTools at http://localhost:19000
   - Scan QR code with Expo Go app on your device
   - Or press `w` to open in web browser

### Hot Reload

The development container is configured with volume mounts for hot-reload:
- Source code changes are immediately reflected
- No need to rebuild the container

### Debugging

```bash
# View application logs
docker-compose -f docker-compose.dev.yml logs -f app

# View proxy logs
docker-compose -f docker-compose.dev.yml logs -f proxy

# Execute commands in container
docker-compose -f docker-compose.dev.yml exec app sh
```

---

## 🚀 Production Setup

### 1. Build Production Images

```bash
# Build images
docker build -t your-registry/epicheck:v1.0.0 .
docker build -t your-registry/epicheck-proxy:v1.0.0 ./proxy-server

# Push to registry
docker push your-registry/epicheck:v1.0.0
docker push your-registry/epicheck-proxy:v1.0.0
```

### 2. Configure Environment

**For Docker Compose:**
Create a `.env` file:
```env
NODE_ENV=production
API_BASE_URL=https://intra.epitech.eu
# Add other environment variables
```

**For Kubernetes:**
1. Copy secrets template:
   ```bash
   cp kubernetes/secrets.yaml.example kubernetes/secrets.yaml
   ```

2. Edit with your credentials:
   ```bash
   vim kubernetes/secrets.yaml
   ```

3. Update ConfigMap:
   ```bash
   vim kubernetes/configmap.yaml
   ```

### 3. Deploy

**Docker Compose:**
```bash
docker-compose up -d
```

**Kubernetes:**
```bash
./kubernetes/deploy.sh
```

### 4. Set Up TLS/SSL

**For Kubernetes:**
The ingress is configured to use Let's Encrypt via cert-manager:
- Update domain in `kubernetes/ingress.yaml`
- cert-manager will automatically provision certificates

**For Docker Compose:**
Add an HTTPS proxy (nginx/Traefik) or use a cloud load balancer

---

## 🏗️ Architecture

### Container Architecture

```
┌─────────────────────────────────────────┐
│           Load Balancer/Ingress         │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌─────▼──────┐
│  Web App    │  │   Proxy    │
│  (Nginx)    │  │  (Node.js) │
│  Port: 80   │  │ Port: 3001 │
└─────────────┘  └────────┬───┘
                          │
                   ┌──────▼──────┐
                   │ External    │
                   │ APIs        │
                   │ (Epitech,   │
                   │  Office365) │
                   └─────────────┘
```

### Components

1. **Web App Container (epicheck)**
   - Expo web build served by Nginx
   - Static assets with caching
   - SPA routing configured

2. **Proxy Server Container (epicheck-proxy)**
   - Node.js proxy for API calls
   - Handles CORS issues
   - Rate limiting

3. **Kubernetes Components**
   - Deployments: Manage pod replicas
   - Services: Internal networking
   - Ingress: External access
   - HPA: Auto-scaling based on metrics
   - ConfigMap: Configuration
   - Secrets: Sensitive data

---

## 📊 Resource Requirements

### Minimum Requirements

**Development:**
- CPU: 2 cores
- RAM: 4 GB
- Disk: 10 GB

**Production (per replica):**
- Web App: 250m CPU, 256Mi RAM
- Proxy: 100m CPU, 128Mi RAM

### Recommended Production Setup

- **Replicas**: 3+ for high availability
- **HPA**: Auto-scale 2-10 pods based on CPU/Memory
- **Resources**: See `kubernetes/deployment.yaml`

---

## 🔒 Security Best Practices

1. **Secrets Management**
   - Never commit secrets to version control
   - Use Kubernetes Secrets or external secret managers
   - Rotate credentials regularly

2. **Network Security**
   - Enable network policies
   - Use TLS for all external communication
   - Restrict ingress/egress traffic

3. **Container Security**
   - Use official base images
   - Scan for vulnerabilities
   - Run as non-root user (where possible)
   - Keep dependencies updated

4. **Access Control**
   - Implement RBAC in Kubernetes
   - Use least privilege principle
   - Enable audit logging

---

## 🔍 Monitoring & Logging

### Docker Compose

```bash
# View logs
docker-compose logs -f

# View specific service
docker-compose logs -f app

# Check container stats
docker stats
```

### Kubernetes

```bash
# View logs
kubectl logs -f deployment/epicheck-app -n epicheck

# Check pod metrics
kubectl top pods -n epicheck

# Check HPA status
kubectl get hpa -n epicheck

# View events
kubectl get events -n epicheck --sort-by='.lastTimestamp'
```

### Recommended Tools

- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack or Loki
- **Tracing**: Jaeger
- **Alerting**: AlertManager

---

## 🐛 Troubleshooting

### Common Issues

**1. Container fails to start**
```bash
# Check logs
docker logs <container-id>

# Or for Kubernetes
kubectl describe pod <pod-name> -n epicheck
```

**2. Network connectivity issues**
```bash
# Test from inside container
docker exec -it <container-id> sh
wget http://example.com

# For Kubernetes
kubectl exec -it <pod-name> -n epicheck -- sh
```

**3. Image pull errors**
```bash
# Login to registry
docker login your-registry

# For Kubernetes, create image pull secret
kubectl create secret docker-registry regcred \
  --docker-server=<server> \
  --docker-username=<username> \
  --docker-password=<password> \
  -n epicheck
```

**4. Permission issues**
```bash
# Fix file permissions
chmod -R 755 /path/to/files

# For Kubernetes volumes
# Check PVC and storage class
kubectl get pvc -n epicheck
```

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Expo Documentation](https://docs.expo.dev/)
- [NGINX Documentation](https://nginx.org/en/docs/)

---

## 🆘 Support

For issues or questions:
1. Check the documentation in `docs/` directory
2. Review the [Kubernetes README](kubernetes/README.md)
3. Create an issue in the repository
4. Contact the development team

---

## 📝 License

Copyright (c) 2025 Epitech. All rights reserved.
