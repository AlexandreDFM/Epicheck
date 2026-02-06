# SSL Certificate Setup - Quick Start

## Problem
The SSL certificate wasn't working because the cert-manager ClusterIssuer and Certificate resources were missing from the Kubernetes deployment.

## Solution
Created the necessary certificate management resources and updated deployment scripts.

## What Was Created

### 1. [kubernetes/cert-issuer.yaml](cert-issuer.yaml)
Contains three resources:
- **letsencrypt-staging**: For testing certificates without hitting rate limits
- **letsencrypt-prod**: For production SSL certificates
- **Certificate**: Defines the certificate for all your domains

### 2. [kubernetes/SSL_TROUBLESHOOTING.md](SSL_TROUBLESHOOTING.md)
Comprehensive troubleshooting guide for SSL issues

## Quick Deploy

### Option 1: Using the deploy script
```bash
cd kubernetes
./deploy.sh
```

### Option 2: Manual deployment
```bash
# Apply the certificate issuer
kubectl apply -f kubernetes/cert-issuer.yaml

# Wait for certificate to be issued (takes 1-2 minutes)
kubectl get certificate -n epicheck -w

# Verify certificate is ready
kubectl describe certificate epicheck-tls-cert -n epicheck
```

### Option 3: GitHub Actions
Simply push to main branch - the workflow now automatically applies certificate configuration.

## Verify SSL is Working

```bash
# Check certificate status
kubectl get certificate -n epicheck

# Check certificate secret
kubectl get secret epicheck-tls-cert -n epicheck

# Test with curl
curl -I https://epicheck.alexandredfm.fr

# Or test in browser
open https://epicheck.alexandredfm.fr
```

## Prerequisites

Your cluster MUST have:

1. **cert-manager installed**
   ```bash
   # Check if cert-manager is installed
   kubectl get pods -n cert-manager
   
   # If not installed, run:
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
   ```

2. **DNS records pointing to cluster**
   - epicheck.alexandredfm.fr → Your cluster IP
   - www.epicheck.alexandredfm.fr → Your cluster IP
   - epicheck.nice-tek.eu → Your cluster IP
   - www.epicheck.nice-tek.eu → Your cluster IP

3. **Port 80 accessible** for ACME HTTP-01 challenges

## Troubleshooting

If certificate not working:

```bash
# 1. Check certificate status
kubectl describe certificate epicheck-tls-cert -n epicheck

# 2. Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager -f

# 3. Check for challenges
kubectl get challenges -n epicheck

# 4. Force renewal
kubectl delete certificate epicheck-tls-cert -n epicheck
kubectl apply -f kubernetes/cert-issuer.yaml
```

See [SSL_TROUBLESHOOTING.md](SSL_TROUBLESHOOTING.md) for detailed troubleshooting.

## Configuration

### Change Email for Let's Encrypt Notifications

Edit [kubernetes/cert-issuer.yaml](cert-issuer.yaml):
```yaml
email: your-email@example.com  # Line 13 and 33
```

### Add/Remove Domains

Edit [kubernetes/cert-issuer.yaml](cert-issuer.yaml):
```yaml
dnsNames:
  - epicheck.alexandredfm.fr
  - www.epicheck.alexandredfm.fr
  - epicheck.nice-tek.eu
  - www.epicheck.nice-tek.eu
  - new-domain.com  # Add your new domain here
```

Then reapply:
```bash
kubectl apply -f kubernetes/cert-issuer.yaml
```

## Certificate Details

- **Issuer**: Let's Encrypt (Production)
- **Auto-renewal**: 15 days before expiry
- **Certificate duration**: 90 days
- **Challenge type**: HTTP-01 (via Traefik ingress)

## Files Modified

1. ✅ Created [kubernetes/cert-issuer.yaml](cert-issuer.yaml) - Certificate issuers and certificate definition
2. ✅ Created [kubernetes/SSL_TROUBLESHOOTING.md](SSL_TROUBLESHOOTING.md) - Troubleshooting guide
3. ✅ Updated [kubernetes/kustomization.yaml](kustomization.yaml) - Added cert-issuer to resources
4. ✅ Updated [kubernetes/deploy.sh](deploy.sh) - Added certificate deployment step
5. ✅ Updated [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) - Added certificate deployment in CI/CD

## Next Steps

1. **Install cert-manager** if not already installed (see Prerequisites)
2. **Verify DNS** records point to your cluster
3. **Deploy** using one of the methods above
4. **Wait 1-2 minutes** for certificate issuance
5. **Verify** SSL is working in browser

## Support

- For SSL-specific issues: See [SSL_TROUBLESHOOTING.md](SSL_TROUBLESHOOTING.md)
- For general deployment: See [README.md](README.md)
- For cert-manager docs: https://cert-manager.io/docs/
