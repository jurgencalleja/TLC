# Kubernetes Deployment Guide

Deploy TLC server on Kubernetes for distributed teams.

## Prerequisites

- Kubernetes cluster (1.24+)
- Helm 3.x
- kubectl configured
- Ingress controller (nginx-ingress recommended)
- cert-manager for TLS (optional but recommended)
- Domain with wildcard DNS configured

## Quick Start

```bash
# Add TLC Helm repo
helm repo add tlc https://jurgencalleja.github.io/TLC/charts
helm repo update

# Install with minimal config
helm install tlc tlc/tlc-server \
  --set domain=project.example.com \
  --set tlc.admin.email=admin@example.com
```

## Installation Options

### Option 1: Helm Repository (Recommended)

```bash
# Add repo
helm repo add tlc https://jurgencalleja.github.io/TLC/charts

# Install
helm install tlc tlc/tlc-server \
  --namespace tlc \
  --create-namespace \
  --set domain=project.example.com \
  --set tlc.admin.email=admin@example.com \
  --set tlc.slack.webhookUrl=https://hooks.slack.com/...
```

### Option 2: Local Chart

```bash
# Clone repository
git clone https://github.com/jurgencalleja/TLC.git
cd TLC/charts/tlc-server

# Install
helm install tlc . \
  --namespace tlc \
  --create-namespace \
  -f values.yaml
```

### Option 3: Custom Values File

Create `my-values.yaml`:

```yaml
domain: project.example.com

tlc:
  admin:
    email: admin@example.com
  slack:
    webhookUrl: https://hooks.slack.com/services/xxx

postgresql:
  auth:
    password: "secure-password-here"

ingress:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi
```

```bash
helm install tlc tlc/tlc-server -f my-values.yaml
```

## Configuration Reference

### Required Values

| Parameter | Description | Example |
|-----------|-------------|---------|
| `domain` | Base domain for deployments | `project.example.com` |
| `tlc.admin.email` | Admin user email | `admin@example.com` |

### Database

#### Built-in PostgreSQL (default)

```yaml
postgresql:
  enabled: true
  auth:
    username: tlc
    database: tlc
    password: "your-secure-password"
  primary:
    persistence:
      size: 20Gi
```

#### External PostgreSQL

```yaml
postgresql:
  enabled: false

externalPostgresql:
  host: postgres.example.com
  port: 5432
  username: tlc
  database: tlc
  existingSecret: my-postgres-secret  # Secret with 'password' key
```

### Secrets Management

For production, use existing Kubernetes secrets:

```yaml
tlc:
  jwt:
    existingSecret: tlc-jwt-secret
  webhook:
    existingSecret: tlc-webhook-secret
  admin:
    existingSecret: tlc-admin-secret
  slack:
    existingSecret: tlc-slack-secret
```

Create secrets beforehand:

```bash
kubectl create secret generic tlc-jwt-secret \
  --from-literal=jwt-secret=$(openssl rand -hex 32)

kubectl create secret generic tlc-webhook-secret \
  --from-literal=webhook-secret=$(openssl rand -hex 16)

kubectl create secret generic tlc-admin-secret \
  --from-literal=password=$(openssl rand -base64 12)

kubectl create secret generic tlc-slack-secret \
  --from-literal=slack-webhook-url='https://hooks.slack.com/...'
```

### Ingress

#### With cert-manager (recommended)

```yaml
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
  tls:
    enabled: true
    secretName: tlc-tls
```

#### Without TLS (development only)

```yaml
ingress:
  enabled: true
  className: nginx
  tls:
    enabled: false
```

### Resource Limits

```yaml
resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi

deployments:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
```

### Persistence

```yaml
persistence:
  enabled: true
  storageClass: "standard"  # Use your cluster's storage class
  size: 50Gi
```

## DNS Configuration

Configure your DNS provider with:

| Record | Type | Value |
|--------|------|-------|
| `dashboard.project.example.com` | A | `<ingress-ip>` |
| `*.project.example.com` | A | `<ingress-ip>` |

Get ingress IP:

```bash
kubectl get ingress tlc-tlc-server -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

## Post-Installation

### 1. Get Admin Credentials

```bash
# If using generated secrets
kubectl get secret tlc-tlc-server-secrets -o jsonpath='{.data.admin-password}' | base64 -d
```

### 2. Access Dashboard

```
https://dashboard.project.example.com
```

### 3. Configure GitHub Webhook

1. Go to your GitHub repo Settings > Webhooks
2. Add webhook: `https://dashboard.project.example.com/api/webhook`
3. Content type: `application/json`
4. Secret: Get from `kubectl get secret tlc-tlc-server-secrets -o jsonpath='{.data.webhook-secret}' | base64 -d`
5. Events: Push events

### 4. Verify Installation

```bash
# Check pods
kubectl get pods -l app.kubernetes.io/name=tlc-server

# Check logs
kubectl logs -l app.kubernetes.io/name=tlc-server -f

# Test health endpoint
curl https://dashboard.project.example.com/health
```

## Upgrading

```bash
helm repo update
helm upgrade tlc tlc/tlc-server -f my-values.yaml
```

## Uninstalling

```bash
helm uninstall tlc

# Clean up PVCs (optional - deletes data)
kubectl delete pvc -l app.kubernetes.io/name=tlc-server
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Ingress Controller                 │   │
│  │         dashboard.project.com  *.project.com         │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │                    TLC Server                         │   │
│  │    ┌─────────┐  ┌──────────┐  ┌────────────────┐    │   │
│  │    │Dashboard│  │  API     │  │ Branch Deployer│    │   │
│  │    │ (Web UI)│  │(Webhook) │  │                │    │   │
│  │    └─────────┘  └──────────┘  └────────┬───────┘    │   │
│  └─────────────────────────────────────────┼────────────┘   │
│                                            │                 │
│  ┌─────────────────────────────────────────▼────────────┐   │
│  │              Branch Deployments Namespace             │   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐              │   │
│  │   │  main   │  │ feat-x  │  │ feat-y  │  ...         │   │
│  │   └─────────┘  └─────────┘  └─────────┘              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL                         │   │
│  │              (users, deployments, logs)               │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Pod not starting

```bash
kubectl describe pod -l app.kubernetes.io/name=tlc-server
kubectl logs -l app.kubernetes.io/name=tlc-server --previous
```

### Database connection issues

```bash
# Check PostgreSQL pod
kubectl get pods -l app.kubernetes.io/name=postgresql

# Check connection from TLC pod
kubectl exec -it $(kubectl get pod -l app.kubernetes.io/name=tlc-server -o name) -- \
  psql "$DATABASE_URL" -c "SELECT 1"
```

### Ingress not working

```bash
# Check ingress status
kubectl describe ingress tlc-tlc-server

# Check cert-manager (if using TLS)
kubectl get certificate
kubectl describe certificate tlc-tls
```

### Branch deployments failing

```bash
# Check deployment namespace
kubectl get pods -n tlc-deployments

# Check TLC server logs
kubectl logs -l app.kubernetes.io/name=tlc-server | grep -i deploy
```

## Production Checklist

- [ ] Use external PostgreSQL or managed database service
- [ ] Configure proper resource limits
- [ ] Set up PodDisruptionBudget for HA
- [ ] Use existingSecret for all credentials
- [ ] Configure network policies
- [ ] Set up monitoring (Prometheus metrics at `/metrics`)
- [ ] Configure backup for PostgreSQL and PVCs
- [ ] Review security contexts
- [ ] Set up alerting for pod health
