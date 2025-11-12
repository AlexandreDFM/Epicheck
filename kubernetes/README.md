# EpiCheck Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the EpiCheck application to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl CLI configured
- Docker registry access (Docker Hub, Google Container Registry, etc.)
- NGINX Ingress Controller installed
- cert-manager installed (for TLS certificates)

## Architecture

The deployment consists of:
- **epicheck-app**: Main web application (Expo web build served by Nginx)
- **epicheck-proxy**: Proxy server for API calls (Node.js)
- **ConfigMap**: Environment configuration
- **Secrets**: Sensitive credentials
- **Ingress**: External access with TLS
- **HPA**: Horizontal Pod Autoscaling

## Quick Start

### 1. Build and Push Docker Images

```bash
# Build production images
docker build -t your-registry/epicheck:latest .
docker build -t your-registry/epicheck-proxy:latest ./proxy-server

# Push to registry
docker push your-registry/epicheck:latest
docker push your-registry/epicheck-proxy:latest
```

### 2. Update Image References

Edit `kubernetes/deployment.yaml` and replace:
- `epicheck:latest` with `your-registry/epicheck:latest`
- `epicheck-proxy:latest` with `your-registry/epicheck-proxy:latest`

### 3. Configure Secrets

```bash
# Copy the secrets template
cp kubernetes/secrets.yaml.example kubernetes/secrets.yaml

# Edit with your actual credentials
vim kubernetes/secrets.yaml

# IMPORTANT: Add secrets.yaml to .gitignore
echo "kubernetes/secrets.yaml" >> .gitignore
```

### 4. Update Domain Names

Edit `kubernetes/ingress.yaml` and replace `epicheck.example.com` with your actual domain.

### 5. Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f kubernetes/namespace.yaml

# Create ConfigMap
kubectl apply -f kubernetes/configmap.yaml

# Create Secrets
kubectl apply -f kubernetes/secrets.yaml

# Deploy applications
kubectl apply -f kubernetes/deployment.yaml

# Create services
kubectl apply -f kubernetes/service.yaml

# Create ingress
kubectl apply -f kubernetes/ingress.yaml

# Enable autoscaling
kubectl apply -f kubernetes/hpa.yaml
```

### 6. Verify Deployment

```bash
# Check namespace
kubectl get all -n epicheck

# Check pods
kubectl get pods -n epicheck

# Check services
kubectl get svc -n epicheck

# Check ingress
kubectl get ingress -n epicheck

# View logs
kubectl logs -f deployment/epicheck-app -n epicheck
kubectl logs -f deployment/epicheck-proxy -n epicheck
```

## Deploy All at Once

You can deploy everything with a single command:

```bash
kubectl apply -f kubernetes/
```

## Configuration

### Environment Variables

Edit `kubernetes/configmap.yaml` to configure:
- API endpoints
- Feature flags
- Application settings

### Secrets

Edit `kubernetes/secrets.yaml` to set:
- Epitech API credentials
- Office 365 OAuth credentials
- API keys
- Database credentials

### Resource Limits

Adjust resources in `kubernetes/deployment.yaml`:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Scaling

Modify `kubernetes/hpa.yaml` to adjust auto-scaling:
- `minReplicas`: Minimum number of pods
- `maxReplicas`: Maximum number of pods
- CPU/Memory thresholds

## Monitoring

### Check Pod Status

```bash
kubectl get pods -n epicheck -w
```

### View Logs

```bash
# App logs
kubectl logs -f deployment/epicheck-app -n epicheck

# Proxy logs
kubectl logs -f deployment/epicheck-proxy -n epicheck

# All logs with label
kubectl logs -f -l app=epicheck -n epicheck
```

### Describe Resources

```bash
kubectl describe deployment epicheck-app -n epicheck
kubectl describe svc epicheck-app -n epicheck
kubectl describe ingress epicheck-ingress -n epicheck
```

### Check HPA Status

```bash
kubectl get hpa -n epicheck
kubectl describe hpa epicheck-app-hpa -n epicheck
```

## Troubleshooting

### Pods not starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n epicheck

# Check logs
kubectl logs <pod-name> -n epicheck

# Check events
kubectl get events -n epicheck --sort-by='.lastTimestamp'
```

### Image Pull Errors

```bash
# Create image pull secret if using private registry
kubectl create secret docker-registry regcred \
  --docker-server=<your-registry-server> \
  --docker-username=<your-name> \
  --docker-password=<your-password> \
  --docker-email=<your-email> \
  -n epicheck

# Add to deployment.yaml under spec.template.spec
imagePullSecrets:
- name: regcred
```

### DNS/Ingress Issues

```bash
# Check ingress
kubectl describe ingress epicheck-ingress -n epicheck

# Check ingress controller
kubectl get pods -n ingress-nginx

# Verify DNS
nslookup epicheck.example.com
```

### Certificate Issues

```bash
# Check certificate
kubectl get certificate -n epicheck
kubectl describe certificate epicheck-tls -n epicheck

# Check cert-manager
kubectl get clusterissuer
```

## Updating the Application

### Rolling Update

```bash
# Update image
kubectl set image deployment/epicheck-app \
  epicheck=your-registry/epicheck:v2 \
  -n epicheck

# Check rollout status
kubectl rollout status deployment/epicheck-app -n epicheck

# View rollout history
kubectl rollout history deployment/epicheck-app -n epicheck
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/epicheck-app -n epicheck

# Rollback to specific revision
kubectl rollout undo deployment/epicheck-app --to-revision=2 -n epicheck
```

## Scaling

### Manual Scaling

```bash
# Scale app
kubectl scale deployment epicheck-app --replicas=5 -n epicheck

# Scale proxy
kubectl scale deployment epicheck-proxy --replicas=3 -n epicheck
```

### Auto-scaling

HPA is already configured. To modify:

```bash
kubectl edit hpa epicheck-app-hpa -n epicheck
```

## Cleanup

### Delete Everything

```bash
# Delete all resources in namespace
kubectl delete namespace epicheck
```

### Delete Specific Resources

```bash
kubectl delete -f kubernetes/hpa.yaml
kubectl delete -f kubernetes/ingress.yaml
kubectl delete -f kubernetes/service.yaml
kubectl delete -f kubernetes/deployment.yaml
kubectl delete -f kubernetes/secrets.yaml
kubectl delete -f kubernetes/configmap.yaml
kubectl delete -f kubernetes/namespace.yaml
```

## Production Checklist

- [ ] Update all image references to your registry
- [ ] Configure secrets with actual credentials
- [ ] Update domain names in ingress
- [ ] Set up TLS certificates (Let's Encrypt via cert-manager)
- [ ] Configure resource limits appropriately
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure logging aggregation (ELK/Loki)
- [ ] Set up backup strategy
- [ ] Configure network policies
- [ ] Enable pod security policies
- [ ] Set up CI/CD pipeline
- [ ] Configure health checks
- [ ] Test disaster recovery procedures

## Security Best Practices

1. **Never commit secrets**: Always use `secrets.yaml.example`
2. **Use RBAC**: Create service accounts with minimal permissions
3. **Network Policies**: Restrict pod-to-pod communication
4. **Image Security**: Scan images for vulnerabilities
5. **TLS Everywhere**: Use TLS for all external communication
6. **Regular Updates**: Keep Kubernetes and dependencies updated

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)

## Support

For issues or questions, please refer to the main project documentation or create an issue in the repository.
