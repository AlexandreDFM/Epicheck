# Deployment (Kubernetes + GitHub Actions)

The web version of EpiCheck runs on the k3s cluster of the VPS, behind Traefik, with TLS from cert-manager (Let's Encrypt). GitHub Actions builds one image and deploys it with a deploy account limited to the app's namespace. The mobile apps are built separately (`.github/workflows/android.yaml`, [BUILD_APK.md](BUILD_APK.md)).

| Environment | URL | Branch | Namespace | Secret/Variable prefix | GitHub environment |
|---|---|---|---|---|---|
| Production | https://epicheck.nice-tek.eu (`www.` redirects to it) | `main` | `epicheck-prod` | `PRD_` | `production` |
| Preprod | https://epicheck.ppd.nice-tek.eu | `develop` | `epicheck-preprod` | `PPD_` | `preprod` |

The workflows run on **`epitech-nice/EpiCheck`**. `AlexandreDFM/Epicheck` is the public archive (Actions disabled).

```
browser ─HTTPS─> Traefik (Ingress epicheck-web, middlewares redirect-https, security-headers, rate-limit)
                   └─> Service epicheck-web:80
                         └─> pods epicheck-web (2 in production), each with two containers:
                               web   :8080  nginx: Expo web export, /api -> 127.0.0.1:3001
                               proxy :3001  Node: CORS proxy ──HTTPS──> intra.epitech.eu
```

No database, no volume, no application secret: the user's Intranet cookie only passes through the proxy.

> **Known limitation:** outside the Epitech network, the Intranet answers requests from the VPS with an anti-DDoS page, and the proxy then returns `401`. The mobile apps call the Intranet directly and are not affected.

## Files

| Path | Content |
|---|---|
| `k8s/cluster/namespace.yaml` | Both namespaces (cluster admin, once) |
| `k8s/rbac/deployer.yaml`, `deployer-preprod.yaml` | Deploy account `github-deployer` per namespace (cluster admin, once) |
| `k8s/rbac/make-kubeconfig.sh` | Prints the `PRD_KUBE_CONFIG` / `PPD_KUBE_CONFIG` secret |
| `k8s/base/` | Shared manifests: constants ConfigMap, web Deployment (web + proxy containers) and Service, Traefik middlewares |
| `k8s/production/` | Production overlay: 2 replicas, Ingress for `epicheck.nice-tek.eu`, `www` redirect |
| `k8s/preprod/` | Preprod overlay: 1 replica, Ingress for `epicheck.ppd.nice-tek.eu` |
| `.github/workflows/ci.yaml` | Pull requests and before each build: app types, lint, Expo dependency check, audit; proxy types, tests, audit |
| `.github/workflows/build.yaml` | Push on `main` or `develop`: checks, image `ghcr.io/epitech-nice/epicheck:<sha>` (`latest` for `main` only), then deploy |
| `.github/workflows/deploy.yaml` | Reusable deploy (one call per environment) |
| `.github/workflows/android.yaml` | APK and AAB on `vX.Y.Z` tags, attached to the GitHub release |
| `Dockerfile`, `docker/` | One image (Expo web export, nginx, proxy) run as two containers; uid 1000, read-only root filesystem ([docker/README.md](../docker/README.md)) |

Kubernetes objects carry `app.kubernetes.io/name=epicheck`, `app.kubernetes.io/component=web`, `app.kubernetes.io/part-of=epicheck` and `app.kubernetes.io/managed-by=kustomize`.

## One-time setup (cluster admin)

On the VPS, `kubectl` is `sudo kubectl`.

```bash
kubectl apply -f k8s/cluster/namespace.yaml
kubectl apply -f k8s/rbac/deployer.yaml -f k8s/rbac/deployer-preprod.yaml

# Store each environment's kubeconfig without displaying it
./k8s/rbac/make-kubeconfig.sh https://<api-server>:6443 \
  | gh secret set PRD_KUBE_CONFIG --repo epitech-nice/EpiCheck
NAMESPACE=epicheck-preprod ./k8s/rbac/make-kubeconfig.sh https://<api-server>:6443 \
  | gh secret set PPD_KUBE_CONFIG --repo epitech-nice/EpiCheck
```

The deploy accounts manage only the kinds the manifests use (ConfigMaps, Secrets, Services, Deployments, Ingresses, Traefik Middlewares), with no delete, no exec and nothing outside their namespace. Removing an object is a deliberate admin action.

Shared with the other applications of the cluster, and installed by the admin: cert-manager and the `letsencrypt-prod` ClusterIssuer. cert-manager creates and renews each certificate from the `cert-manager.io/cluster-issuer` annotation of the Ingress; nothing in the workflow deletes certificates.

DNS: `epicheck.nice-tek.eu`, `www.epicheck.nice-tek.eu` and `epicheck.ppd.nice-tek.eu` point to the VPS.

### Check the deploy account

```bash
SA=system:serviceaccount:epicheck-prod:github-deployer
kubectl auth can-i patch deployments.apps -n epicheck-prod --as=$SA     # yes
kubectl auth can-i delete deployments.apps -n epicheck-prod --as=$SA    # no
kubectl auth can-i get secrets -n kube-system --as=$SA                  # no
```

## GitHub settings

Secrets and Variables are **repository-level** on `epitech-nice/EpiCheck`, prefixed with `PRD_` (production) or `PPD_` (preprod). The deploy workflow receives the prefix from `build.yaml` and reads `secrets[<prefix>_<NAME>]`. The GitHub environments `production` and `preprod` only record the deployments and their URL; they hold no secret.

Repository-level secrets are readable by every workflow of the repository, whatever the branch: changes to `.github/workflows/` deserve the same review as production access.

### Secrets

| Secret | Required | Use |
|---|---|---|
| `PRD_KUBE_CONFIG`, `PPD_KUBE_CONFIG` | yes | Kubeconfig of the environment's `github-deployer` |
| `GHCR_PULL_TOKEN` (no prefix) | only for a private package | Classic PAT with only `read:packages`. Not needed: the `epicheck` package is public |
| `GHCR_PULL_USER` (no prefix) | no | Owner of that PAT, if not the repository owner |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | for Android releases | Release key of the mobile app ([BUILD_APK.md](BUILD_APK.md)) |

### Variables

| Variable | Required | Use |
|---|---|---|
| `PRD_PUBLIC_SITE_URL`, `PPD_PUBLIC_SITE_URL` | yes | Environment URL and smoke tests (`https://epicheck.nice-tek.eu`, `https://epicheck.ppd.nice-tek.eu`) |
| `<prefix>_RATE_LIMIT_PER_MINUTE` | no | Proxy requests per minute and per client (default 120) |
| `IMAGE_PLATFORMS` (no prefix) | no | Build platforms (default `linux/amd64`) |

They become the ConfigMap `epicheck-app-config`. Constants (`NODE_ENV`, `PORT`, `TRUST_PROXY`) are in `k8s/base/configmap.yaml`.

### Package visibility

After the first build, set the package `ghcr.io/epitech-nice/epicheck` to **public** (organization → Packages → epicheck → Package settings). The workflow then empties the `github-container-registry` pull secret, so no token can expire.

## Deploying

A push on `main` deploys production; a push on `develop` deploys preprod. The flow is feature branch → pull request to `develop` (preprod) → pull request to `main` (production). A version is released by tagging `main` (see [the version rules](IOS_XCODE_TROUBLESHOOTING.md#5-workflow-de-version-bump)).

Deploy steps: connect with `<prefix>_KUBE_CONFIG`, check the account's rights, registry pull secret, settings, `kubectl apply -k` with the image tag set to the commit SHA, rollout, smoke tests on `<prefix>_PUBLIC_SITE_URL` (`/`, `/health`, `/api/health`, a target outside the Intranet refused with `400`, HSTS and CSP headers). On failure the job prints pods, logs, certificates and events.

### Probes

- `web` container: readiness and liveness on `/health` (nginx itself).
- `proxy` container: readiness and liveness on `/health` (Node itself; the Intranet is not called, so an Intranet outage does not restart the pod).

### Several replicas

The pods keep no state. The proxy rate limit is counted per pod, so production (2 pods) allows up to twice `RATE_LIMIT_PER_MINUTE` per client.

## Operations

```bash
N=epicheck-prod   # or epicheck-preprod
kubectl -n $N get deployments,pods,ingress,certificates
kubectl -n $N logs -l app.kubernetes.io/component=web -c proxy -f     # -c web for nginx
kubectl -n $N exec deploy/epicheck-web -c proxy -- wget -qO- 127.0.0.1:3001/health   # admin only
```

### Rollback

Each deployment uses the image of its commit, so the previous ReplicaSet is the previous version:

```bash
kubectl -n $N rollout history deploy/epicheck-web
kubectl -n $N rollout undo deploy/epicheck-web
```

For a lasting rollback, revert the commit on the branch: the next deployment would otherwise bring it back.

## Verified locally

The manifests and the workflow's own `run:` blocks were run on a local k3s (Docker) with the `github-deployer` kubeconfigs produced by `make-kubeconfig.sh`: both overlays deploy and roll out, a second deploy is a no-op, the smoke tests pass, `www` and `http` redirect to `https://epicheck.nice-tek.eu`, and the deploy account is refused outside its namespace and for `delete` / `exec`. To repeat it, follow `assets/verify-k3s.md` of the deployment convention.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Secret PRD_KUBE_CONFIG is missing` (or `PPD_`) | Environment not set up | Run `make-kubeconfig.sh` for that environment |
| `The deploy account cannot manage <kind>` | A manifest uses a kind missing from the Role | Add it to `k8s/rbac/deployer*.yaml` and apply as admin |
| Pods in `ImagePullBackOff`, `403 Forbidden` | Package still private | Make the package public, or set `GHCR_PULL_TOKEN` |
| Certificate not ready on a new host | DNS not pointing to the VPS, or HTTP-01 challenge blocked | `kubectl -n $N get certificate,challenges`; check the DNS record |
| Two Ingresses for `epicheck.nice-tek.eu` | The former `epicheck` namespace still exists | `kubectl delete namespace epicheck epicheck-staging` (admin) |
| Web login works, then every call answers `401` with an anti-DDoS message | The Intranet refuses the VPS address | Use the mobile app, or run the proxy from the Epitech network (`pnpm proxy`) |
| `field is immutable` on apply | A selector changed | Recreate the Deployment (admin), there is no data to keep |
