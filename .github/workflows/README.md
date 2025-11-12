# GitHub Actions CI/CD Pipeline Setup

This guide explains how to configure the GitHub Actions pipeline to automatically build and deploy your EpiCheck app to your Kubernetes cluster.

## 📋 Pipeline Overview

The pipeline consists of three main jobs:

1. **build-and-push**: Builds Docker images and pushes to GitHub Container Registry
2. **deploy-to-kubernetes**: Deploys the application to your Kubernetes cluster
3. **notify**: Sends deployment status notifications

## 🔧 Setup Instructions

### Step 1: Configure Kubernetes Access

You need to provide your Kubernetes config to GitHub Actions.

#### Generate base64-encoded kubeconfig

```bash
# Encode your kubeconfig file
cat ~/.kube/config | base64 | tr -d '\n'
```

Copy the output - you'll need it in the next step.

#### Add to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:
   - Name: `KUBE_CONFIG`
   - Value: The base64-encoded kubeconfig from above

### Step 2: Configure Application Secrets

Add the following secrets to your GitHub repository:

#### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `KUBE_CONFIG` | Base64-encoded Kubernetes config | (from Step 1) |
| `EPITECH_USERNAME` | Epitech Intra username | `john.doe@epitech.eu` |
| `EPITECH_PASSWORD` | Epitech Intra password | `your-password` |
| `OFFICE365_CLIENT_ID` | Office 365 OAuth Client ID | `abc123...` |
| `OFFICE365_CLIENT_SECRET` | Office 365 OAuth Client Secret | `secret123...` |
| `OFFICE365_TENANT_ID` | Office 365 Tenant ID | `tenant-id` |
| `AZURE_AD_CLIENT_ID` | Azure AD Client ID | `client-id` |
| `AZURE_AD_CLIENT_SECRET` | Azure AD Client Secret | `secret` |
| `AZURE_AD_TENANT_ID` | Azure AD Tenant ID | `tenant-id` |
| `API_KEY` | General API key | `your-api-key` |
| `SESSION_SECRET` | Session secret for encryption | `random-secret-string` |

#### How to Add Secrets

```bash
# Navigate to GitHub repository
# Settings → Secrets and variables → Actions → New repository secret
```

Add each secret listed above.

### Step 3: Update Domain Configuration

Edit `kubernetes/ingress.yaml` to set your domain:

```yaml
spec:
  tls:
  - hosts:
    - your-domain.com  # Change this
    secretName: epicheck-tls
  rules:
  - host: your-domain.com  # Change this
```

### Step 4: Verify Kubernetes Cluster

Ensure your Kubernetes cluster has:

- [ ] NGINX Ingress Controller installed
- [ ] cert-manager installed (for TLS certificates)
- [ ] Sufficient resources available
- [ ] Network access from GitHub Actions runners

#### Install NGINX Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
```

#### Install cert-manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### Step 5: Create Initial Resources (First Deploy)

For the first deployment, manually create some resources:

```bash
# Create namespace
kubectl create namespace epicheck

# Apply ConfigMap
kubectl apply -f kubernetes/configmap.yaml

# Apply initial deployments (optional)
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/ingress.yaml
kubectl apply -f kubernetes/hpa.yaml
```

## 🚀 Triggering Deployments

### Automatic Triggers

The pipeline automatically runs on:

1. **Push to main branch** - Deploys to production
2. **Push to develop branch** - Deploys to staging (if configured)
3. **Tag creation** (v*) - Versioned deployment
4. **Pull Request** - Builds only (no deployment)

### Manual Trigger

You can manually trigger a deployment:

1. Go to **Actions** tab in GitHub
2. Select **Build and Deploy to Kubernetes**
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## 📊 Pipeline Workflow

```
┌─────────────────────────────────────────────────┐
│  Trigger (Push/PR/Tag/Manual)                   │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  Job 1: Build and Push Images                   │
│  - Checkout code                                 │
│  - Build app Docker image                        │
│  - Build proxy Docker image                      │
│  - Push to GitHub Container Registry             │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  Job 2: Deploy to Kubernetes                    │
│  - Setup kubectl                                 │
│  - Configure cluster access                      │
│  - Create/Update secrets                         │
│  - Apply manifests                               │
│  - Update deployments with new images            │
│  - Wait for rollout                              │
│  - Verify deployment                             │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  Job 3: Notify Status                           │
│  - Send success/failure notification             │
└──────────────────────────────────────────────────┘
```

## 🔍 Monitoring Deployments

### View Pipeline Status

1. Go to **Actions** tab in GitHub
2. Click on the latest workflow run
3. View logs for each job

### Check Kubernetes Deployment

```bash
# View pods
kubectl get pods -n epicheck

# View deployment status
kubectl rollout status deployment/epicheck-app -n epicheck

# View logs
kubectl logs -f deployment/epicheck-app -n epicheck

# View events
kubectl get events -n epicheck --sort-by='.lastTimestamp'
```

## 🐛 Troubleshooting

### Issue: "Unable to connect to the server"

**Cause**: Invalid or expired kubeconfig

**Solution**:
1. Generate new kubeconfig
2. Update `KUBE_CONFIG` secret in GitHub
3. Re-run workflow

### Issue: "ImagePullBackOff"

**Cause**: Cannot pull images from GitHub Container Registry

**Solution**:
1. Make images public OR
2. Create image pull secret:

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<github-token> \
  --namespace=epicheck
```

3. Add to deployment:

```yaml
spec:
  template:
    spec:
      imagePullSecrets:
      - name: ghcr-secret
```

### Issue: "No space left on device"

**Cause**: Insufficient storage in cluster

**Solution**:
1. Clean up old resources
2. Increase PVC size
3. Add more storage to nodes

### Issue: Deployment timeout

**Cause**: Pods not starting in time

**Solution**:
1. Check pod logs: `kubectl logs <pod-name> -n epicheck`
2. Describe pod: `kubectl describe pod <pod-name> -n epicheck`
3. Increase timeout in workflow if needed
4. Check resource limits

### Issue: "Forbidden: User cannot list resource"

**Cause**: Insufficient permissions in kubeconfig

**Solution**:
Create a service account with proper RBAC:

```bash
# Create service account
kubectl create serviceaccount github-actions -n epicheck

# Create cluster role binding
kubectl create clusterrolebinding github-actions \
  --clusterrole=cluster-admin \
  --serviceaccount=epicheck:github-actions

# Get token
kubectl create token github-actions -n epicheck
```

## 🔐 Security Best Practices

### 1. Use Least Privilege

Create a dedicated service account with minimal permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: github-actions
  namespace: epicheck
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: github-actions-role
  namespace: epicheck
rules:
- apiGroups: ["", "apps", "autoscaling", "networking.k8s.io"]
  resources: ["*"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: github-actions-binding
  namespace: epicheck
subjects:
- kind: ServiceAccount
  name: github-actions
  namespace: epicheck
roleRef:
  kind: Role
  name: github-actions-role
  apiGroup: rbac.authorization.k8s.io
```

### 2. Rotate Secrets Regularly

- Update secrets every 90 days
- Use secret management tools (e.g., HashiCorp Vault)
- Enable secret scanning in GitHub

### 3. Scan Images for Vulnerabilities

Add to workflow:

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_APP }}:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'
```

### 4. Enable Branch Protection

- Require pull request reviews
- Require status checks to pass
- Restrict who can push to main

## 📈 Advanced Configuration

### Multi-Environment Deployment

Create separate workflows for different environments:

```yaml
# .github/workflows/deploy-staging.yml
on:
  push:
    branches:
      - develop

# Use different namespace and secrets
```

### Rollback Strategy

Add manual approval for production:

```yaml
deploy-to-production:
  environment:
    name: production
    url: https://epicheck.example.com
  needs: build-and-push
```

### Notifications

Add Slack/Discord notifications:

```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 📝 Maintenance

### Regular Tasks

- [ ] Review pipeline logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate secrets every 90 days
- [ ] Monitor resource usage
- [ ] Review and update RBAC permissions
- [ ] Test disaster recovery procedures

### Pipeline Updates

To update the pipeline:

1. Edit `.github/workflows/deploy.yml`
2. Test in a branch
3. Create PR and review
4. Merge to main

## 🔗 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kubectl Reference](https://kubernetes.io/docs/reference/kubectl/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

## 🆘 Support

If you encounter issues:

1. Check workflow logs in GitHub Actions
2. Check Kubernetes logs: `kubectl logs -n epicheck`
3. Review this documentation
4. Check Kubernetes events: `kubectl get events -n epicheck`
5. Create an issue in the repository

---

**Last Updated**: November 12, 2025  
**Version**: 1.0.0  
**Maintainer**: EpiCheck DevOps Team
