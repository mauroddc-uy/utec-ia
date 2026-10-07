# UTEC_IA

UTEC_IA es el prototipo del asistente academico usado para el piloto DevOps del Grupo 4. La aplicacion conserva la interfaz original y separa frontend y backend para demostrar build, ejecucion local, Kubernetes y pipeline Jenkins.

El alcance actual es demo: el chat responde datos simulados, el login vive en el navegador y no es autenticacion real, y no se implementan RAG, AWS, Bedrock, S3, RDS ni pgvector como dependencias obligatorias.

## Estructura

```text
frontend/              UI estatica servida por Nginx
backend/               API FastAPI
k8s/base/              Manifiestos del piloto Kubernetes local
scripts/               Smoke tests, rollback y comandos de demo
docker-compose.yml     Demo local frontend/backend y perfiles opcionales
Jenkinsfile            Pipeline CI/CD para Kubernetes
Jenkinsfile.vm         Pipeline CI/CD alternativo hacia VM Ubuntu
PILOTO_DEVOPS.md       Guia reproducible de demostracion
JENKINS_VM_DEPLOY.md   Guia Jenkins local + VM Ubuntu
Dockerfile             Legado de imagen unica; no es el camino del piloto
```

## Backend en PyCharm o terminal

Usar Python 3.12 y tomar `backend/` como working directory.

```powershell
python -m pip install -r backend/requirements-dev.txt
cd backend
python -m pytest
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Endpoints principales:

- `GET /health`: salud real del backend demo y metadata de version/commit.
- `GET /version`: version desplegada.
- `POST /api/chat`: chat mock con `message` obligatorio y `user_email` opcional.
- `GET /metrics`: metricas Prometheus expuestas por FastAPI.

## Frontend local

Para el recorrido completo recomendado, usar Docker Compose para que el navegador consuma `/api/chat` por el mismo origen del frontend y Nginx haga reverse proxy al backend interno.

```powershell
docker compose up --build
```

Abrir:

```text
http://127.0.0.1:8080
```

Para servir solo archivos estaticos en PyCharm o terminal:

```powershell
cd frontend
python -m http.server 3000
```

En ese modo no hay reverse proxy. Usar `frontend/config.example.js` como referencia si se necesita apuntar temporalmente a `http://127.0.0.1:8000` durante desarrollo local; no tratar ese login como autenticacion real.

## Compose

Servicios por defecto:

- `frontend`: Nginx con UI y proxy a `backend:8000`.
- `backend`: FastAPI demo.

Perfiles opcionales:

```powershell
docker compose --profile data up -d postgres
docker compose --profile observability up -d
```

`postgres` usa pgvector pero la API actual no lo consume. Observabilidad local incluye Prometheus, Grafana, Loki y Alloy para la demo de logs/metricas disponibles.

Variables sin secretos reales:

```powershell
copy .env.example .env
```

## Kubernetes local

Los manifiestos viven en `k8s/base`. El namespace por defecto es `utec-ia-pilot`.

```powershell
kubectl apply -k k8s/base
kubectl -n utec-ia-pilot rollout status deployment/backend --timeout=120s
kubectl -n utec-ia-pilot rollout status deployment/frontend --timeout=120s
kubectl -n utec-ia-pilot port-forward svc/frontend 8080:80
```

Abrir `http://127.0.0.1:8080`.

El backend corre con dos replicas, pero si el cluster local tiene un solo nodo eso no demuestra tolerancia a perdida del nodo. Solo demuestra reemplazo de Pods y acceso estable por Service.

## Jenkins

El `Jenkinsfile` valida PRs sin desplegar. En la rama autorizada por `DEPLOY_BRANCH`, ejecuta:

1. checkout del commit del job;
2. tests backend;
3. lint frontend;
4. build de ambas imagenes;
5. push al registro con tag inmutable basado en SHA;
6. despliegue Kubernetes;
7. espera de rollout;
8. smoke test por el frontend real;
9. recuperacion explicita si falla una actualizacion iniciada.

Configurar en Jenkins:

- `REGISTRY_CREDENTIALS_ID`: usuario/password del registro.
- `KUBECONFIG_CREDENTIALS_ID`: kubeconfig como file credential.
- `IMAGE_PULL_SECRET`: opcional, si el cluster necesita credenciales para descargar imagenes privadas.

El flujo anterior de Docker en VM por SCP queda como legado historico; el objetivo principal de este repo es el piloto Kubernetes local descrito en `PILOTO_DEVOPS.md`.

## Jenkins local y VM Ubuntu

Para una demo sin Kubernetes, usar `Jenkinsfile.vm`. Ese pipeline valida PRs sin desplegar y despliega automaticamente a una VM Ubuntu cuando hay merge/push a la rama autorizada.

La guia completa esta en `JENKINS_VM_DEPLOY.md`.
