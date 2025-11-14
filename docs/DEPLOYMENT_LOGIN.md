# EpiCheck - Deployment Login and Usage Guide

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Option 1: Use GitHub Container Registry (Recommended)](#option-1-use-github-container-registry-recommended)
- [Option 2: Use Docker Hub](#option-2-use-docker-hub)
- [Option 3: Deploy Locally Without Pushing](#option-3-deploy-locally-without-pushing)
- [Deployment Script Usage](#deployment-script-usage)
- [Troubleshooting](#troubleshooting)

## Overview

This guide explains how to authenticate with container registries and deploy the EpiCheck application using the automated deployment script (`kubernetes/deploy.sh`).

## Prerequisites

Before deploying, ensure you have:
- Docker installed and running
- kubectl configured with your Kubernetes cluster
- Access to a container registry (GitHub Container Registry or Docker Hub)
- Appropriate permissions to push images to the registry

## Option 1: Use GitHub Container Registry (Recommended)

GitHub Container Registry (ghcr.io) is the recommended option as it integrates seamlessly with GitHub Actions CI/CD pipeline.

### Step 1: Create a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Or visit: https://github.com/settings/tokens

2. Click **"Generate new token"** → **"Generate new token (classic)"**

3. Configure the token:
   - **Note**: `EpiCheck Container Registry`
   - **Expiration**: Choose duration (90 days, 1 year, or no expiration)
   - **Scopes**: Select the following:
     - ✅ `write:packages` (Upload packages to GitHub Package Registry)
     - ✅ `read:packages` (Download packages from GitHub Package Registry)
     - ✅ `delete:packages` (Delete packages from GitHub Package Registry)
     - ✅ `repo` (Full control of private repositories - if repo is private)

4. Click **"Generate token"**

5. **IMPORTANT**: Copy the token immediately (it won't be shown again)
   - Format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Login to GitHub Container Registry

```bash
# Set your token as environment variable (replace with your actual token)
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u epitech-nice --password-stdin
```

**Expected Output**:
```
Login Succeeded
```

### Step 3: Verify Repository Access

Ensure the container registry repository exists and is accessible:

```bash
# Check if you can see the repository (after first push)
docker pull ghcr.io/epitech-nice/epicheck:latest
```

### Step 4: Run Deployment Script

```bash
# Navigate to project root
cd /path/to/EpiCheck

# Run deployment script (uses ghcr.io/epitech-nice by default)
./kubernetes/deploy.sh
```

The script will:
1. Check registry login status
2. Build the Docker image
3. Tag the image with version and latest
4. Push to GitHub Container Registry
5. Deploy to Kubernetes cluster

### Step 5: Verify Deployment

```bash
# Check if images were pushed
docker images | grep epicheck

# Check Kubernetes deployment
kubectl get pods -n epicheck
kubectl get services -n epicheck
```

### GitHub Actions Integration

For automated CI/CD with GitHub Container Registry:

1. Add the token as a GitHub secret:
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Click **"New repository secret"**
   - Name: `GITHUB_TOKEN` (or use the built-in `secrets.GITHUB_TOKEN`)
   - Value: Your personal access token

2. The workflow (`.github/workflows/deploy.yml`) will automatically:
   - Login to ghcr.io using the token
   - Build and push images on every push to `main` branch
   - Deploy to Kubernetes cluster

### Making Registry Public or Private

**To make the registry public** (anyone can pull):
```bash
# Using GitHub CLI
gh api /user/packages/container/epicheck/versions --method PATCH \
  -f visibility=public

# Or via GitHub web interface:
# Go to: Package → Package settings → Change visibility
```

**Keep private** for restricted access (requires authentication to pull).

---

## Option 2: Use Docker Hub

If you prefer Docker Hub over GitHub Container Registry.

### Step 1: Create Docker Hub Account

1. Go to https://hub.docker.com/
2. Sign up or login to your account
3. Note your Docker Hub username (e.g., `epitechnice`)

### Step 2: Create Repository (Optional)

1. Go to https://hub.docker.com/repositories
2. Click **"Create Repository"**
3. Repository name: `epicheck`
4. Visibility: Choose **Public** or **Private**
5. Click **"Create"**

Your repository will be: `epitechnice/epicheck`

### Step 3: Login to Docker Hub

```bash
# Interactive login (will prompt for password)
docker login

# Or with username/password
docker login -u epitechnice

# Or using access token (recommended for automation)
echo "YOUR_ACCESS_TOKEN" | docker login -u epitechnice --password-stdin
```

**To create an access token**:
1. Go to Account Settings → Security → Access Tokens
2. Click **"New Access Token"**
3. Description: `EpiCheck Deployment`
4. Permissions: **Read, Write, Delete**
5. Copy the token

### Step 4: Run Deployment with Custom Registry

```bash
# Set Docker Hub registry as environment variable
export DOCKER_REGISTRY=epitechnice

# Run deployment script
./kubernetes/deploy.sh
```

Or directly:
```bash
# Specify registry when running script
DOCKER_REGISTRY=epitechnice ./kubernetes/deploy.sh
```

The script will:
1. Check Docker Hub login
2. Build the image
3. Tag as `epitechnice/epicheck:version` and `epitechnice/epicheck:latest`
4. Push to Docker Hub
5. Deploy to Kubernetes

### Step 5: Update Kubernetes Manifests

Update the image reference in `kubernetes/deployment.yaml`:

```yaml
spec:
  containers:
  - name: epicheck
    image: epitechnice/epicheck:latest  # Changed from ghcr.io/epitech-nice/epicheck
```

### Step 6: Update GitHub Actions (if using CI/CD)

Update `.github/workflows/deploy.yml`:

```yaml
- name: Login to Docker Hub
  uses: docker/login-action@v2
  with:
    username: ${{ secrets.DOCKERHUB_USERNAME }}
    password: ${{ secrets.DOCKERHUB_TOKEN }}

- name: Build and push Docker image
  run: |
    docker build -t epitechnice/epicheck:${{ github.sha }} .
    docker tag epitechnice/epicheck:${{ github.sha }} epitechnice/epicheck:latest
    docker push epitechnice/epicheck:${{ github.sha }}
    docker push epitechnice/epicheck:latest
```

Add secrets in GitHub:
- `DOCKERHUB_USERNAME`: Your Docker Hub username
- `DOCKERHUB_TOKEN`: Your Docker Hub access token

---

## Option 3: Deploy Locally Without Pushing

For local development and testing without a remote registry.

### Step 1: Build Images Locally

```bash
# Navigate to project root
cd /path/to/EpiCheck

# Build the image
docker build -t epicheck:latest .
docker build -t epicheck:$(git describe --tags --always) .
```

### Step 2: Load Images to Kubernetes

#### For Minikube:

```bash
# Use Minikube's Docker daemon
eval $(minikube docker-env)

# Build image (will be available in Minikube)
docker build -t epicheck:latest .

# Or load from local Docker
docker save epicheck:latest | (eval $(minikube docker-env) && docker load)
```

#### For kind (Kubernetes in Docker):

```bash
# Load image into kind cluster
kind load docker-image epicheck:latest --name epicheck-cluster
```

#### For k3s/k3d:

```bash
# Import image to k3d cluster
k3d image import epicheck:latest -c epicheck-cluster
```

### Step 3: Update Kubernetes Manifests

Modify `kubernetes/deployment.yaml` to use local images:

```yaml
spec:
  containers:
  - name: epicheck
    image: epicheck:latest
    imagePullPolicy: Never  # Important: Don't try to pull from registry
```

Or use `IfNotPresent`:
```yaml
    imagePullPolicy: IfNotPresent  # Use local if available
```

### Step 4: Deploy to Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secrets.yaml
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/ingress.yaml
```

Or use the deployment script in local mode:

```bash
# Skip push and deploy locally
SKIP_PUSH=true ./kubernetes/deploy.sh
```

### Step 5: Access the Application

#### Port Forward (Quick Testing):

```bash
# Forward service port to localhost
kubectl port-forward -n epicheck service/epicheck 8080:80

# Access at: http://localhost:8080
```

#### NodePort (Minikube):

```bash
# Get Minikube IP
minikube ip

# Get NodePort
kubectl get svc -n epicheck epicheck -o jsonpath='{.spec.ports[0].nodePort}'

# Access at: http://<minikube-ip>:<nodeport>
```

#### Ingress (Production-like):

```bash
# For Minikube, enable ingress addon
minikube addons enable ingress

# Update /etc/hosts
echo "$(minikube ip) epicheck.local" | sudo tee -a /etc/hosts

# Access at: http://epicheck.local
```

---

## Deployment Script Usage

The `kubernetes/deploy.sh` script automates the deployment process.

### Basic Usage

```bash
# Default: Uses ghcr.io/epitech-nice registry
./kubernetes/deploy.sh
```

### Environment Variables

Configure deployment with environment variables:

```bash
# Use custom registry
DOCKER_REGISTRY=epitechnice ./kubernetes/deploy.sh

# Use custom image name
IMAGE_NAME=my-epicheck ./kubernetes/deploy.sh

# Use custom tag
TAG=v1.0.0 ./kubernetes/deploy.sh

# Skip pushing to registry (local only)
SKIP_PUSH=true ./kubernetes/deploy.sh

# Combine multiple options
DOCKER_REGISTRY=epitechnice IMAGE_NAME=epicheck TAG=production ./kubernetes/deploy.sh
```

### Script Flow

1. **Check Prerequisites**:
   - Verifies Docker is installed and running
   - Verifies kubectl is configured
   - Checks registry login status (if not skipping push)

2. **Build Image**:
   - Builds Docker image using Dockerfile
   - Tags with specified version and `latest`

3. **Push to Registry** (if not skipped):
   - Pushes versioned tag
   - Pushes latest tag
   - Handles push errors gracefully

4. **Deploy to Kubernetes**:
   - Applies namespace
   - Applies configmap and secrets
   - Applies deployment with image
   - Applies service and ingress
   - Waits for rollout completion

5. **Verification**:
   - Shows deployment status
   - Lists running pods
   - Displays service endpoints

### Interactive Prompts

The script will prompt you if:
- Not logged into the registry (offers login instructions)
- Push fails (asks if you want to deploy locally)
- Kubernetes context is not set (asks which cluster to use)

---

## Troubleshooting

### Docker Login Issues

#### "Error response from daemon: Get https://ghcr.io/v2/: denied"

**Solution**:
```bash
# Verify token has correct permissions
# Re-login with valid token
echo $GITHUB_TOKEN | docker login ghcr.io -u epitech-nice --password-stdin
```

#### "unauthorized: authentication required"

**Solution**:
```bash
# Check if logged in
docker info | grep Username

# Login again
docker login ghcr.io
# Or for Docker Hub
docker login
```

### Push Failures

#### "denied: requested access to the resource is denied"

**Cause**: Repository doesn't exist or you lack permissions

**Solution**:
1. Ensure repository exists on registry
2. Verify token/password has `write:packages` permission
3. Check organization membership (for ghcr.io)
4. Make first push to create repository

#### "unauthorized: unauthenticated: User cannot be authenticated"

**Solution**:
```bash
# Re-authenticate
docker logout ghcr.io
docker login ghcr.io -u epitech-nice
```

### Kubernetes Deployment Issues

#### "ImagePullBackOff" error

**Cause**: Kubernetes can't pull the image from registry

**Solution**:

1. **For private registries**, create image pull secret:
```bash
kubectl create secret docker-registry regcred \
  --docker-server=ghcr.io \
  --docker-username=epitech-nice \
  --docker-password=$GITHUB_TOKEN \
  --namespace=epicheck
```

2. Update `kubernetes/deployment.yaml`:
```yaml
spec:
  imagePullSecrets:
  - name: regcred
  containers:
  - name: epicheck
    image: ghcr.io/epitech-nice/epicheck:latest
```

3. For local images, use `imagePullPolicy: Never`

#### "context deadline exceeded" during deployment

**Solution**:
```bash
# Check cluster connectivity
kubectl cluster-info

# Check node status
kubectl get nodes

# Increase timeout in deploy.sh
kubectl rollout status deployment/epicheck -n epicheck --timeout=10m
```

### Registry-Specific Issues

#### GitHub Container Registry: "Package does not exist"

**Solution**:
- Make first push to create the package
- Ensure organization visibility settings allow packages
- Check repository permissions

#### Docker Hub: "rate limit exceeded"

**Solution**:
- Login to increase rate limits
- Use Docker Hub Pro account
- Switch to GitHub Container Registry (no rate limits)

### Permission Issues

#### "You don't have permission to push to this repository"

**Solution**:
1. Verify you're a member of the `epitech-nice` organization
2. Check organization settings allow package creation
3. Ensure token has `write:packages` scope
4. Contact repository administrator

---

## Best Practices

### Security

1. **Never commit tokens or passwords** to git
2. **Use access tokens** instead of passwords
3. **Set token expiration** to limit security exposure
4. **Use GitHub secrets** for CI/CD automation
5. **Keep registries private** unless content is public

### Registry Management

1. **Tag images properly**:
   - Use semantic versioning (v1.0.0, v1.0.1)
   - Keep `latest` tag updated
   - Tag with git SHA for traceability

2. **Clean old images**:
   ```bash
   # List all tags
   docker images | grep epicheck
   
   # Remove old images
   docker image prune -a
   ```

3. **Monitor storage usage**:
   - GitHub Container Registry: Free for public, 500MB for private
   - Docker Hub: 6 months retention for free tier

### Deployment

1. **Test locally first** (Option 3) before pushing
2. **Use staging environment** before production
3. **Monitor deployment** with `kubectl rollout status`
4. **Keep backups** of Kubernetes manifests
5. **Document custom configurations**

---

## Quick Reference

### Login Commands

```bash
# GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u epitech-nice --password-stdin

# Docker Hub
docker login -u epitechnice

# Check login status
docker info | grep Username
```

### Deployment Commands

```bash
# GitHub Container Registry (default)
./kubernetes/deploy.sh

# Docker Hub
DOCKER_REGISTRY=epitechnice ./kubernetes/deploy.sh

# Local only
SKIP_PUSH=true ./kubernetes/deploy.sh
```

### Verification Commands

```bash
# Check images
docker images | grep epicheck

# Check deployment
kubectl get all -n epicheck

# Check logs
kubectl logs -n epicheck -l app=epicheck --tail=50
```

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**For**: EpiCheck Deployment Infrastructure
