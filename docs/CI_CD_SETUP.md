# GitHub Actions CI/CD Pipeline - Complete Setup

## ✅ Files Created

### GitHub Actions Workflows
1. **`.github/workflows/deploy.yml`** - Main production deployment pipeline
2. **`.github/workflows/deploy-staging.yml`** - Staging environment pipeline
3. **`.github/workflows/README.md`** - Comprehensive documentation
4. **`.github/workflows/QUICKSTART.md`** - Quick reference guide
5. **`.github/workflows/setup-secrets.sh`** - Automated secrets setup script

## 🎯 What the Pipeline Does

### Production Pipeline (deploy.yml)
Triggered on:
- Push to `main` branch
- Tag creation (`v*`)
- Manual workflow dispatch

Actions:
1. ✅ Builds Docker images for app and proxy
2. ✅ Pushes to GitHub Container Registry (ghcr.io)
3. ✅ Deploys to Kubernetes cluster
4. ✅ Creates/updates secrets and config
5. ✅ Performs rolling update
6. ✅ Verifies deployment
7. ✅ Runs smoke tests

### Staging Pipeline (deploy-staging.yml)
Triggered on:
- Push to `develop` branch
- Manual workflow dispatch

Actions:
1. ✅ Builds images with staging tags
2. ✅ Deploys to staging namespace
3. ✅ Runs integration tests
4. ✅ Enables testing before production

## 🚀 Setup Instructions

### Step 1: Install GitHub CLI (if not installed)

```bash
# macOS
brew install gh

# Linux
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Or download from: https://cli.github.com/
```

### Step 2: Run Automated Setup

```bash
# Make script executable (already done)
chmod +x .github/workflows/setup-secrets.sh

# Run the setup script
./.github/workflows/setup-secrets.sh
```

The script will:
- ✅ Verify GitHub CLI authentication
- ✅ Detect your kubeconfig
- ✅ Interactively collect all credentials
- ✅ Set all GitHub secrets
- ✅ Verify configuration

### Step 3: Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Authenticate with GitHub
gh auth login

# Set Kubernetes config
cat ~/.kube/config | base64 | tr -d '\n' | gh secret set KUBE_CONFIG

# Set application secrets
gh secret set EPITECH_USERNAME -b"your-username"
gh secret set EPITECH_PASSWORD -b"your-password"
gh secret set OFFICE365_CLIENT_ID -b"your-client-id"
gh secret set OFFICE365_CLIENT_SECRET -b"your-secret"
gh secret set OFFICE365_TENANT_ID -b"your-tenant"
gh secret set AZURE_AD_CLIENT_ID -b"your-client-id"
gh secret set AZURE_AD_CLIENT_SECRET -b"your-secret"
gh secret set AZURE_AD_TENANT_ID -b"your-tenant"
gh secret set API_KEY -b"$(openssl rand -hex 32)"
gh secret set SESSION_SECRET -b"$(openssl rand -hex 64)"

# Verify secrets
gh secret list
```

### Step 4: Update Domain Configuration

Edit `kubernetes/ingress.yaml`:

```yaml
spec:
  tls:
  - hosts:
    - your-domain.com  # ← Change this
    - www.your-domain.com  # ← Change this
    secretName: epicheck-tls
  rules:
  - host: your-domain.com  # ← Change this
```

### Step 5: Enable GitHub Container Registry

1. Go to repository **Settings**
2. Navigate to **Actions** → **General**
3. Under **Workflow permissions**, select:
   - ✅ **Read and write permissions**
4. Click **Save**

### Step 6: Trigger First Deployment

```bash
# Commit your changes
git add .
git commit -m "Add CI/CD pipeline"

# Push to main (triggers production deploy)
git push origin main

# Or push to develop (triggers staging deploy)
git push origin develop
```

## 📊 Monitoring Deployments

### View in GitHub UI

1. Go to **Actions** tab
2. Click on the running workflow
3. View real-time logs for each step
4. See success/failure status

### View with GitHub CLI

```bash
# List recent workflow runs
gh run list --workflow=deploy.yml

# View specific run
gh run view <run-id>

# Watch a run in real-time
gh run watch

# View logs
gh run view <run-id> --log
```

### Check Kubernetes Status

```bash
# Quick overview
kubectl get all -n epicheck

# Detailed pod status
kubectl get pods -n epicheck -o wide

# View deployment events
kubectl get events -n epicheck --sort-by='.lastTimestamp'

# View application logs
kubectl logs -f deployment/epicheck-app -n epicheck

# Check rollout status
kubectl rollout status deployment/epicheck-app -n epicheck

# View HPA status
kubectl get hpa -n epicheck
```

## 🔄 Common Workflows

### Deploy New Version

```bash
# 1. Make your changes
git add .
git commit -m "Your changes"

# 2. Push to trigger deployment
git push origin main

# 3. Monitor deployment
gh run watch
```

### Create Tagged Release

```bash
# Create and push tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# This triggers deployment with version tag
```

### Rollback Deployment

```bash
# View deployment history
kubectl rollout history deployment/epicheck-app -n epicheck

# Rollback to previous version
kubectl rollout undo deployment/epicheck-app -n epicheck

# Rollback to specific revision
kubectl rollout undo deployment/epicheck-app --to-revision=2 -n epicheck
```

### Manual Deployment Trigger

1. Go to **Actions** tab
2. Click **Build and Deploy to Kubernetes**
3. Click **Run workflow**
4. Select branch
5. Click **Run workflow** button

Or via CLI:
```bash
gh workflow run deploy.yml --ref main
```

## 🔐 Required Secrets

| Secret | Description | How to Get |
|--------|-------------|-----------|
| `KUBE_CONFIG` | Base64 Kubernetes config | `cat ~/.kube/config \| base64` |
| `EPITECH_USERNAME` | Epitech username | Your Epitech credentials |
| `EPITECH_PASSWORD` | Epitech password | Your Epitech credentials |
| `OFFICE365_CLIENT_ID` | OAuth Client ID | Azure Portal → App Registrations |
| `OFFICE365_CLIENT_SECRET` | OAuth Secret | Azure Portal → App Registrations |
| `OFFICE365_TENANT_ID` | Tenant ID | Azure Portal → Azure AD |
| `AZURE_AD_CLIENT_ID` | Azure AD Client ID | Same as Office 365 or separate |
| `AZURE_AD_CLIENT_SECRET` | Azure AD Secret | Same as Office 365 or separate |
| `AZURE_AD_TENANT_ID` | Azure AD Tenant | Same as Office 365 or separate |
| `API_KEY` | General API key | Generate: `openssl rand -hex 32` |
| `SESSION_SECRET` | Session encryption | Generate: `openssl rand -hex 64` |

## 🐛 Troubleshooting

### Issue: "Context access might be invalid"

These are linter warnings and can be ignored. The secrets will work once configured in GitHub.

### Issue: Cannot connect to cluster

```bash
# Verify kubeconfig locally
kubectl cluster-info

# Regenerate secret
cat ~/.kube/config | base64 | tr -d '\n' | gh secret set KUBE_CONFIG

# Verify in GitHub
gh secret list
```

### Issue: Image pull errors

```bash
# Make images public
gh repo edit --visibility public

# Or create image pull secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<github-token> \
  --namespace=epicheck
```

### Issue: Deployment timeout

```bash
# Check pod status
kubectl describe pod <pod-name> -n epicheck

# View logs
kubectl logs <pod-name> -n epicheck

# Check events
kubectl get events -n epicheck
```

## 📈 Advanced Features

### Multi-Environment Setup

The pipeline supports:
- **Production**: `main` branch → `epicheck` namespace
- **Staging**: `develop` branch → `epicheck-staging` namespace

### Environment Protection

Configure in GitHub:
1. Settings → Environments
2. Add "production" environment
3. Configure protection rules:
   - Required reviewers
   - Wait timer
   - Deployment branches

### Notifications

Add to workflow:

```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Automatic Rollback

Add to workflow:

```yaml
- name: Health check
  run: |
    sleep 60
    kubectl run health-check --image=curlimages/curl --rm -i --restart=Never \
      --namespace=epicheck -- curl -f http://epicheck-app:80/ || \
    (kubectl rollout undo deployment/epicheck-app -n epicheck && exit 1)
```

## 📚 Documentation Links

- **Quick Start**: [QUICKSTART.md](.github/workflows/QUICKSTART.md)
- **Full Documentation**: [README.md](.github/workflows/README.md)
- **Kubernetes Guide**: [kubernetes/README.md](kubernetes/README.md)
- **Docker Guide**: [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)

## 🎓 Best Practices

1. ✅ **Always test in staging first** before deploying to production
2. ✅ **Use semantic versioning** for releases (v1.0.0, v1.1.0, etc.)
3. ✅ **Monitor deployments** and set up alerts
4. ✅ **Keep secrets secure** and rotate regularly
5. ✅ **Review logs** after each deployment
6. ✅ **Test rollback procedures** periodically
7. ✅ **Document changes** in commit messages
8. ✅ **Use pull requests** for code review
9. ✅ **Enable branch protection** on main branch
10. ✅ **Keep dependencies updated**

## 🎉 You're All Set!

Your CI/CD pipeline is configured and ready to use. Here's what happens next:

1. **Push to `main`** → Automatic deployment to production
2. **Push to `develop`** → Automatic deployment to staging
3. **Create tag `v*`** → Versioned release
4. **Open PR** → Build and test only

Monitor your deployments in the **Actions** tab and check Kubernetes with `kubectl get all -n epicheck`.

---

**Need help?** Check the documentation links above or create an issue in the repository.

**Happy Deploying! 🚀**
