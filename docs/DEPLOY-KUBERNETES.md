# Deploy: Kubernetes

Reference manifests for production K8s clusters. Adapt for your namespace, ingress controller, and secrets backend.

## Manifest

`baref00t-portal.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: baref00t
---
apiVersion: v1
kind: Secret
metadata:
  name: baref00t-portal-env
  namespace: baref00t
type: Opaque
stringData:
  BAREF00T_API_KEY: "pk_live_..."
  AUTH_SECRET: "<32+ random bytes>"
  AZURE_AD_CLIENT_SECRET: "..."
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: baref00t-portal-config
  namespace: baref00t
data:
  BAREF00T_API_BASE: "https://api.baref00t.io"
  AUTH_URL: "https://portal.your-company.com"
  AZURE_AD_TENANT_ID: "..."
  AZURE_AD_CLIENT_ID: "..."
  BRAND_NAME: "Your Company Portal"
  BRAND_PRIMARY_COLOR: "#00cc66"
  BRAND_THEME: "dark"
  LOG_LEVEL: "info"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: baref00t-portal
  namespace: baref00t
spec:
  replicas: 2
  selector:
    matchLabels: { app: baref00t-portal }
  template:
    metadata:
      labels: { app: baref00t-portal }
    spec:
      containers:
        - name: portal
          image: ghcr.io/becloudsmart-com/baref00t-portal:0.1.0
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef: { name: baref00t-portal-config }
            - secretRef: { name: baref00t-portal-env }
          resources:
            requests: { cpu: 100m, memory: 256Mi }
            limits:   { cpu: 500m, memory: 512Mi }
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /api/ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
            failureThreshold: 3
          securityContext:
            runAsNonRoot: true
            runAsUser: 1001
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: false
            capabilities: { drop: [ALL] }
---
apiVersion: v1
kind: Service
metadata:
  name: baref00t-portal
  namespace: baref00t
spec:
  selector: { app: baref00t-portal }
  ports:
    - port: 80
      targetPort: 3000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: baref00t-portal
  namespace: baref00t
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
spec:
  tls:
    - hosts: [portal.your-company.com]
      secretName: baref00t-portal-tls
  rules:
    - host: portal.your-company.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: baref00t-portal
                port: { number: 80 }
```

## Apply

```bash
kubectl apply -f baref00t-portal.yaml
kubectl -n baref00t rollout status deployment/baref00t-portal
kubectl -n baref00t logs -l app=baref00t-portal -f
```

## Secrets backend

For production, replace the inline `Secret` with [External Secrets Operator](https://external-secrets.io/) or [SOPS](https://github.com/getsops/sops):

```yaml
# Example: External Secrets Operator pulling from Azure Key Vault
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: baref00t-portal-env
  namespace: baref00t
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-keyvault
    kind: ClusterSecretStore
  target:
    name: baref00t-portal-env
  data:
    - secretKey: BAREF00T_API_KEY
      remoteRef: { key: baref00t-partner-api-key }
    - secretKey: AUTH_SECRET
      remoteRef: { key: baref00t-portal-auth-secret }
    - secretKey: AZURE_AD_CLIENT_SECRET
      remoteRef: { key: baref00t-portal-entra-client-secret }
```

## Upgrades

```bash
kubectl -n baref00t set image deployment/baref00t-portal portal=ghcr.io/becloudsmart-com/baref00t-portal:0.2.0
kubectl -n baref00t rollout status deployment/baref00t-portal
```

Rollback:

```bash
kubectl -n baref00t rollout undo deployment/baref00t-portal
```
