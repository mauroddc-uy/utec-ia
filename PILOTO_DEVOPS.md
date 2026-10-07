# Piloto DevOps UTEC_IA

Esta guia documenta el piloto local para demostrar la propuesta DevOps de la presentacion original del Grupo 4, Semana 4, sin desplegar AWS ni agregar una implementacion RAG completa.

## Alcance real

- Interfaz original conservada como frontend estatico.
- Backend FastAPI separado con respuestas mock.
- Frontend Nginx con reverse proxy a `/api`, `/health`, `/version` y `/metrics`.
- Docker Compose para demo local.
- Kubernetes local con namespace propio, Deployments, Services, probes, recursos iniciales, ConfigMap, RBAC y NetworkPolicies.
- Jenkinsfile para CI/CD hacia Kubernetes con imagenes inmutables por SHA y recuperacion explicita.

Fuera de alcance en esta tarea:

- AWS, EKS, RDS, S3, Bedrock y Secrets Manager.
- Autenticacion real.
- RAG completo.
- HPA obligatorio. Queda para cuando haya metricas, requests validados y objetivo de escalado.
- CloudWatch. Queda como integracion futura.

## Pruebas automatizadas

Desde un entorno Python 3.12 con pip:

```powershell
python -m pip install -r backend/requirements-dev.txt
cd backend
python -m pytest
```

Cobertura relevante:

- `GET /health`.
- `GET /version`.
- chat valido.
- mensaje faltante.
- mensaje vacio.
- mensaje con solo espacios.
- limite de 1.000 caracteres.
- rechazo sobre 1.000 caracteres.
- `user_email` opcional, normalizado y limitado a 254 caracteres.

## Demo local con Docker Compose

```powershell
copy .env.example .env
docker compose up --build
```

Verificaciones:

```powershell
.\scripts\smoke-test.ps1 -BaseUrl http://127.0.0.1:8080
docker compose ps
docker compose logs backend
```

El navegador usa `http://127.0.0.1:8080/api/chat`. Nginx resuelve `backend:8000` dentro de la red Docker. No se entrega al navegador un hostname interno de Kubernetes.

PostgreSQL/pgvector es opcional y no se usa por la API actual:

```powershell
docker compose --profile data up -d postgres
```

Observabilidad local opcional:

```powershell
docker compose --profile observability up -d
```

## Kubernetes local

El checkout actual no tenia contexto Kubernetes configurado durante la inspeccion inicial. Para usar un cluster local, habilitar Docker Desktop Kubernetes, kind o minikube y comprobar:

```powershell
kubectl config current-context
kubectl get nodes
```

Aplicar:

```powershell
kubectl apply -k k8s/base
kubectl -n utec-ia-pilot rollout status deployment/backend --timeout=120s
kubectl -n utec-ia-pilot rollout status deployment/frontend --timeout=120s
kubectl -n utec-ia-pilot get pods -o wide
```

Acceso al frontend:

```powershell
kubectl -n utec-ia-pilot port-forward svc/frontend 8080:80
```

Abrir `http://127.0.0.1:8080` y ejecutar:

```powershell
.\scripts\smoke-test.ps1 -BaseUrl http://127.0.0.1:8080
```

## Practicas a mostrar

### 1. Interfaz y chat demo

Abrir el frontend y enviar:

```text
cuantos creditos tengo
```

Respuesta esperada: una respuesta mock con `245 creditos aprobados`.

### 2. Dos imagenes separadas

```powershell
docker compose build
docker images utec-ia-backend
docker images utec-ia-frontend
```

### 3. Dos replicas FastAPI y Service estable

```powershell
kubectl -n utec-ia-pilot get deployment backend
kubectl -n utec-ia-pilot get endpoints backend
kubectl -n utec-ia-pilot get pods -l app=backend -o wide
```

Nota: dos replicas en un solo nodo no implican tolerancia a perdida del nodo.

### 4. Recreacion controlada de un Pod

```powershell
sh scripts/k8s-delete-backend-pod.sh utec-ia-pilot
```

Mostrar que el Deployment vuelve a dos Pods listos.

### 5. Actualizacion exitosa identificable

```powershell
sh scripts/k8s-rollout-demo.sh utec-ia-pilot demo-docente local-demo
kubectl -n utec-ia-pilot port-forward svc/frontend 8080:80
.\scripts\smoke-test.ps1 -BaseUrl http://127.0.0.1:8080 -ExpectedVersion demo-docente -ExpectedCommit local-demo
```

### 6. Fallo deliberado y recuperacion

Esta prueba queda aislada al namespace local del piloto.

```powershell
sh scripts/k8s-failure-demo.sh utec-ia-pilot http://127.0.0.1:8080
```

El script cambia temporalmente el backend a una imagen invalida, espera que el rollout falle, restaura la imagen estable previa y verifica salud por HTTP si se pasa una URL.

### 7. Logs, eventos y metricas disponibles

```powershell
kubectl -n utec-ia-pilot logs deployment/backend --tail=50
kubectl -n utec-ia-pilot get events --sort-by=.lastTimestamp
kubectl -n utec-ia-pilot top pods
```

`kubectl top` requiere metrics-server. Si no esta instalado, no declarar metricas como probadas.

Metricas HTTP del backend:

```powershell
curl http://127.0.0.1:8080/metrics
```

## NetworkPolicies

Las NetworkPolicies estan definidas, pero su aislamiento depende del CNI del cluster. Verificar antes de declararlas probadas:

```powershell
sh scripts/k8s-network-policy-check.sh utec-ia-pilot
```

El script prueba:

- trafico permitido desde un Pod con etiqueta `app=frontend` hacia `backend:8000`;
- trafico denegado desde un Pod sin etiqueta permitida;
- DNS necesario para resolver el Service.

Si el trafico denegado llega al backend, el plugin de red no aplica NetworkPolicies o la politica no esta aislando como se espera.

## Jenkins

El pipeline no hace checkout fijo de `main`; usa el SCM del job. Para Multibranch:

- PR: tests, lint y build; no push ni deploy.
- Rama `DEPLOY_BRANCH`: push de imagenes y deploy.

Parametros externos:

- `IMAGE_REGISTRY`.
- `IMAGE_REPOSITORY_PREFIX`.
- `REGISTRY_CREDENTIALS_ID`.
- `KUBECONFIG_CREDENTIALS_ID`.
- `K8S_NAMESPACE`.
- `DEPLOY_BRANCH`.
- `IMAGE_PULL_SECRET` opcional.

El agente Jenkins debe tener:

- Docker CLI con acceso al daemon usado para build/push.
- Red hacia el registro.
- `kubectl`.
- Red hacia el API server del cluster.

No asumir que Docker/Kubernetes disponibles en Windows son visibles desde un agente Linux o desde una VM.

## Recuperacion en pipeline

Antes de actualizar, Jenkins registra:

- imagen previa del backend;
- imagen previa del frontend;
- version/commit previos expuestos por el backend;
- ConfigMap previo.

Si falla rollout o smoke despues de iniciar deploy, ejecuta `scripts/k8s-recover.sh`. Si tests o build fallan antes de deploy, no intenta rollback. Si es primera instalacion y no existe version previa, informa esa condicion.

Kubernetes no hace rollback completo de ConfigMaps, Secrets o datos externos por si solo. Este piloto registra la configuracion que modifica para poder recuperar el estado anterior.

## Flujo Docker en VM legado

El Jenkinsfile anterior construia una unica imagen, la guardaba como tar, la copiaba por SCP a una VM y ejecutaba Docker por SSH. Ese flujo queda como antecedente, pero no cubre el piloto Kubernetes pedido: no validaba tests, no publicaba artefactos inmutables, no hacia rollout/smoke test ni recuperacion explicita.

## Registro de inspeccion inicial

Comandos ejecutados durante la preparacion:

```text
git status --short
```

Resultado inicial relevante:

```text
 M .gitignore
 M backend/Dockerfile
```

Se preservaron esos cambios locales.

```text
docker --version
Docker version 29.4.3, build 055a478

docker compose version
Docker Compose version v5.1.3

kubectl version --client
Client Version: v1.34.1
Kustomize Version: v5.7.1

kubectl config current-context
error: current-context is not set

kind version
kind: no instalado

minikube version
minikube: no instalado
```

El `python`/`python3` disponible en PATH apunta a MSYS y no tenia `pip` ni `pytest`; por eso la validacion Python local requiere instalar un entorno Python 3.12 con pip o ejecutar tests dentro de contenedor.

## Registro de validacion local

Validaciones ejecutadas sobre este checkout:

```text
npm ci
Resultado: 77 packages instalados, 0 vulnerabilidades npm.

npm run lint
Resultado: OK, 0 errores.

.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
Resultado: OK en Python 3.11.3 local. La imagen/pipeline usan Python 3.12.

cd backend
..\.venv\Scripts\python.exe -m pytest
Resultado: 12 passed, 1 warning de deprecacion de TestClient/httpx.

cd backend
..\.venv\Scripts\python.exe -m pylint app tests
Resultado: 10.00/10.

cd backend
..\.venv\Scripts\python.exe -m pip_audit -r requirements.txt
Resultado: No known vulnerabilities found.

docker compose config
Resultado: OK.

docker compose config --profiles
Resultado: data, observability.

kubectl kustomize k8s/base
Resultado: render OK de todos los recursos.
```

Limitaciones del entorno local durante esta ejecucion:

```text
docker ps
Resultado: fallo al conectar con npipe:////./pipe/dockerDesktopLinuxEngine.
Interpretacion: Docker CLI esta instalado, pero el daemon Docker Desktop no esta disponible.

kubectl apply --dry-run=client -k k8s/base
Resultado: fallo por ausencia de API server/contexto Kubernetes.
Interpretacion: `kubectl kustomize` renderiza, pero no se pudo hacer validacion contra cluster.

sh -n scripts/*.sh
Resultado: no hay `sh` usable en PATH en esta sesion Windows.
Interpretacion: los scripts quedan para ejecutar en Jenkins/Linux o en una terminal con shell POSIX.
```

Validaciones pendientes al levantar Docker Desktop y un cluster local:

```powershell
docker compose up --build
.\scripts\smoke-test.ps1 -BaseUrl http://127.0.0.1:8080

kubectl apply -k k8s/base
kubectl -n utec-ia-pilot rollout status deployment/backend --timeout=120s
kubectl -n utec-ia-pilot rollout status deployment/frontend --timeout=120s
kubectl -n utec-ia-pilot port-forward svc/frontend 8080:80
.\scripts\smoke-test.ps1 -BaseUrl http://127.0.0.1:8080
```
