# SSL Certificate Troubleshooting Guide

This guide helps you diagnose and fix SSL certificate issues in the EpiCheck Kubernetes deployment.

## Overview

The EpiCheck deployment uses:
- **cert-manager** for automatic SSL certificate management
- **Let's Encrypt** as the certificate authority
- **Traefik** ingress controller with ACME HTTP-01 challenge

## Prerequisites

Before troubleshooting, ensure:
1. cert-manager is installed in your cluster
2. Traefik ingress controller is running
3. DNS records point to your cluster's external IP
4. Port 80 (HTTP) is accessible for ACME challenges

## Quick Diagnostics

### Check Certificate Status

```bash
# Check if certificate exists
kubectl get certificate -n epicheck

# Check certificate details
kubectl describe certificate epicheck-tls-cert -n epicheck

# Check certificate secret
kubectl get secret epicheck-tls-cert -n epicheck
```

### Check ClusterIssuer

```bash
# List all cluster issuers
kubectl get clusterissuer

# Check letsencrypt-prod issuer
kubectl describe clusterissuer letsencrypt-prod
```

### Check CertificateRequest

```bash
# List certificate requests
kubectl get certificaterequest -n epicheck

# Describe the latest request
kubectl describe certificaterequest -n epicheck
```

### Check cert-manager Logs

```bash
# Find cert-manager pod
kubectl get pods -n cert-manager

# View logs
kubectl logs -n cert-manager deployment/cert-manager -f
```

## Common Issues and Solutions

### 1. Certificate Not Being Issued

**Symptoms:**
- Certificate status shows "Pending" or "False"
- HTTPS not working, browser shows certificate error

**Check:**
```bash
kubectl describe certificate epicheck-tls-cert -n epicheck
kubectl get challenges -n epicheck
```

**Common causes:**
- DNS not properly configured
- Port 80 blocked or not forwarded
- ACME challenge failing

**Solution:**
```bash
# Delete and recreate certificate
kubectl delete certificate epicheck-tls-cert -n epicheck
kubectl apply -f kubernetes/cert-issuer.yaml

# Wait a few minutes and check status
kubectl get certificate -n epicheck -w
```

### 2. Certificate Expired

**Symptoms:**
- Browser shows "Certificate expired" error
- Certificate was working but stopped

**Check expiry:**
```bash
kubectl get secret epicheck-tls-cert -n epicheck -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates
```

**Solution:**
```bash
# Force certificate renewal
kubectl delete secret epicheck-tls-cert -n epicheck
kubectl delete certificate epicheck-tls-cert -n epicheck

# Reapply
kubectl apply -f kubernetes/cert-issuer.yaml

# cert-manager will automatically request a new certificate
```

### 3. HTTP-01 Challenge Failing

**Symptoms:**
- Certificate shows error about challenge failure
- Events show "Waiting for HTTP-01 challenge propagation"

**Check ingress:**
```bash
# Ensure ingress is accessible
kubectl get ingress -n epicheck
kubectl describe ingress -n epicheck

# Test HTTP endpoint
curl -v http://epicheck.alexandredfm.fr/.well-known/acme-challenge/test
```

**Common causes:**
- Ingress not properly configured
- DNS not pointing to cluster
- Firewall blocking port 80

**Solution:**
```bash
# Check DNS resolution
nslookup epicheck.alexandredfm.fr
dig epicheck.alexandredfm.fr

# Check external IP
kubectl get svc -n kube-system traefik
# OR
kubectl get svc -n ingress-nginx

# Update DNS A records to point to the external IP
```

### 4. cert-manager Not Installed

**Symptoms:**
- ClusterIssuer not found
- Certificate resource not recognized

**Install cert-manager:**
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Verify installation
kubectl get pods -n cert-manager

# Wait for all pods to be ready, then apply cert-issuer
kubectl apply -f kubernetes/cert-issuer.yaml
```

### 5. Rate Limit Hit (Let's Encrypt)

**Symptoms:**
- Error message about rate limits
- "too many certificates already issued"

**Let's Encrypt rate limits:**
- 50 certificates per registered domain per week
- 5 duplicate certificates per week

**Solution:**
```bash
# Use staging issuer first for testing
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: epicheck-tls-cert
  namespace: epicheck
spec:
  secretName: epicheck-tls-cert
  issuerRef:
    name: letsencrypt-staging  # Use staging
    kind: ClusterIssuer
  dnsNames:
    - epicheck.alexandredfm.fr
    - www.epicheck.alexandredfm.fr
    - epicheck.nice-tek.eu
    - www.epicheck.nice-tek.eu
EOF

# Once it works with staging, switch back to prod
# Wait for rate limit to reset (1 week)
```

### 6. Wrong Ingress Class

**Symptoms:**
- Certificate stays in pending
- No ACME challenges created

**Check ingress class:**
```bash
kubectl get ingressclass
```

**Solution:**
Update [cert-issuer.yaml](cert-issuer.yaml#L17) to use the correct ingress class:
```yaml
solvers:
  - http01:
      ingress:
        class: traefik  # or nginx, depending on your setup
```

### 7. Multiple Domains Not Working

**Symptoms:**
- Only one domain has valid certificate
- Some SANs (Subject Alternative Names) missing

**Check certificate SANs:**
```bash
kubectl get secret epicheck-tls-cert -n epicheck -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep DNS
```

**Solution:**
Ensure all domains are listed in [cert-issuer.yaml](cert-issuer.yaml#L45-L49):
```yaml
dnsNames:
  - epicheck.alexandredfm.fr
  - www.epicheck.alexandredfm.fr
  - epicheck.nice-tek.eu
  - www.epicheck.nice-tek.eu
```

## Manual Certificate Management

### Force Certificate Renewal

```bash
# Delete the certificate (not the secret)
kubectl delete certificate epicheck-tls-cert -n epicheck

# Reapply
kubectl apply -f kubernetes/cert-issuer.yaml

# Monitor progress
kubectl get certificate -n epicheck -w
```

### Test with Staging Certificate

```bash
# Update to use staging
kubectl patch certificate epicheck-tls-cert -n epicheck --type merge -p '{"spec":{"issuerRef":{"name":"letsencrypt-staging"}}}'

# Wait for certificate
kubectl get certificate -n epicheck -w

# Once verified, switch back to prod
kubectl patch certificate epicheck-tls-cert -n epicheck --type merge -p '{"spec":{"issuerRef":{"name":"letsencrypt-prod"}}}'
```

### Manual Certificate from Let's Encrypt

If automatic issuance fails, you can manually obtain a certificate:

```bash
# Install certbot
sudo apt-get install certbot  # or brew install certbot

# Get certificate manually
sudo certbot certonly --manual --preferred-challenges http \
  -d epicheck.alexandredfm.fr \
  -d www.epicheck.alexandredfm.fr \
  -d epicheck.nice-tek.eu \
  -d www.epicheck.nice-tek.eu

# Create secret from certificate
kubectl create secret tls epicheck-tls-cert \
  --cert=/etc/letsencrypt/live/epicheck.alexandredfm.fr/fullchain.pem \
  --key=/etc/letsencrypt/live/epicheck.alexandredfm.fr/privkey.pem \
  -n epicheck
```

## Verification

### Verify Certificate in Browser

1. Open https://epicheck.alexandredfm.fr
2. Click the padlock icon
3. View certificate details
4. Verify:
   - Issuer: Let's Encrypt
   - Valid dates
   - All domains in SANs

### Verify with OpenSSL

```bash
# Check certificate
echo | openssl s_client -servername epicheck.alexandredfm.fr -connect epicheck.alexandredfm.fr:443 2>/dev/null | openssl x509 -noout -text

# Check expiry
echo | openssl s_client -servername epicheck.alexandredfm.fr -connect epicheck.alexandredfm.fr:443 2>/dev/null | openssl x509 -noout -dates

# Check issuer
echo | openssl s_client -servername epicheck.alexandredfm.fr -connect epicheck.alexandredfm.fr:443 2>/dev/null | openssl x509 -noout -issuer
```

### Online SSL Checkers

- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [WhyNoPadlock](https://www.whynopadlock.com/)

## Maintenance

### Automatic Renewal

cert-manager automatically renews certificates 15 days before expiry (configurable in [cert-issuer.yaml](cert-issuer.yaml#L52)).

### Monitor Certificate Expiry

```bash
# Set up monitoring (example with Prometheus)
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  selector:
    matchLabels:
      app: cert-manager
  endpoints:
  - port: metrics
EOF
```

### Email Notifications

Update the email in [cert-issuer.yaml](cert-issuer.yaml#L13) to receive expiry notifications:
```yaml
email: your-email@example.com
```

## Best Practices

1. **Always test with staging first** to avoid rate limits
2. **Monitor certificate expiry** with automated alerts
3. **Keep DNS records updated** and pointing to correct IPs
4. **Ensure port 80 is accessible** for ACME challenges
5. **Use descriptive certificate names** for easy identification
6. **Document any manual certificate processes**
7. **Regular backups** of certificate secrets

## Resources

- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [Traefik cert-manager Integration](https://doc.traefik.io/traefik/https/acme/)
