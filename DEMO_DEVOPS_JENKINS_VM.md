# Demo DevOps Jenkins + VM Ubuntu

Este documento describe el escenario de demostracion para UTEC_IA usando Jenkins local en Docker y una VM Ubuntu como servidor de despliegue. Complementa `PILOTO_DEVOPS.md` y `JENKINS_VM_DEPLOY.md`.

## Objetivo de la demo

Mostrar un flujo DevOps realista para el piloto:

1. Un cambio llega a GitHub.
2. Jenkins detecta la rama o PR.
3. Jenkins valida la aplicacion con tests y lint.
4. Jenkins construye dos imagenes Docker: frontend y backend.
5. Jenkins despliega en una VM Ubuntu por SSH.
6. La VM expone la aplicacion por HTTP.
7. Jenkins ejecuta un smoke test contra la URL real publicada.

La demo no despliega AWS, no implementa RAG completo y no convierte el login visual en autenticacion real.

## Arquitectura

```text
GitHub
  repo: https://github.com/mauroddc-uy/utec-ia
  rama piloto: devops/jenkins-vm-pilot
  rama de deploy: test

        |
        | Jenkins Multibranch Pipeline
        v

Jenkins local en Docker
  URL: http://127.0.0.1:8081
  Pipeline: Jenkinsfile.vm
  Credencial SSH: utec-ia-vm-ssh
  Usa Docker del host mediante /var/run/docker.sock

        |
        | SSH + SCP
        v

VM Ubuntu VMware
  IP: 192.168.6.128
  Usuario SSH: mauro
  Puerto SSH: 22
  Directorio app: /home/mauro/utec-ia
  Docker Engine: instalado
  Docker Compose: instalado

        |
        | Docker Compose
        v

Contenedores en la VM
  utec-ia-frontend -> puerto externo 8080
  utec-ia-backend  -> puerto interno 8000

        |
        v

Navegador
  http://192.168.6.128:8080
```

## Como se conectan las piezas

El repositorio contiene `Jenkinsfile.vm`. Jenkins Multibranch escanea GitHub y crea un job por rama que tenga ese archivo.

Cuando corre el pipeline:

1. `Checkout` descarga el commit exacto desde GitHub.
2. `Verify Agent` comprueba que Jenkins tenga `curl`, `docker`, `ssh` y `scp`.
3. `Backend Tests` ejecuta tests en `python:3.12-slim`.
4. `Frontend Lint` ejecuta lint en `node:22-alpine`.
5. `Build Images` construye:

```text
utec-ia-backend:<sha-corto>
utec-ia-frontend:<sha-corto>
```

6. `Deploy VM` corre solo si la rama actual coincide con `DEPLOY_BRANCH`.
7. `scripts/vm-deploy.sh` hace:

```text
docker save backend -> backend.tar
docker save frontend -> frontend.tar
scp backend.tar frontend.tar docker-compose.vm.yml .env a la VM
ssh a la VM
docker load -i backend.tar
docker load -i frontend.tar
docker compose -f docker-compose.vm.yml --env-file .env up -d --remove-orphans
```

8. `Smoke VM` ejecuta `scripts/smoke-test.sh` contra:

```text
http://192.168.6.128:8080
```

El frontend corre en Nginx. El navegador llama al mismo origen:

```text
http://192.168.6.128:8080/api/chat
```

Nginx proxyea internamente al backend:

```text
backend:8000
```

El navegador nunca necesita conocer el hostname interno `backend`.

## Precondiciones

### En Windows / host local

Jenkins debe estar levantado:

```powershell
docker compose -f docker-compose.jenkins.yml --env-file .env.jenkins up -d --build
```

Verificar:

```powershell
docker ps --filter name=utec-ia-jenkins
```

URL:

```text
http://127.0.0.1:8081
```

### En Jenkins

Debe existir una credencial:

```text
ID: utec-ia-vm-ssh
Tipo: SSH Username with private key
Username: mauro
Private key: clave privada con acceso a la VM
```

El job debe ser Multibranch Pipeline:

```text
Repo: https://github.com/mauroddc-uy/utec-ia
Script Path: Jenkinsfile.vm
```

### En la VM Ubuntu

Validaciones ya verificadas:

```bash
docker version
docker compose version
groups mauro
```

El usuario `mauro` debe pertenecer al grupo `docker`.

SSH debe estar activo:

```bash
sudo systemctl status ssh --no-pager
```

Firewall, si esta activo:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 8080/tcp
```

## Guion de demo recomendado

### Parte 1 - Mostrar aplicacion local existente

Objetivo: demostrar que la aplicacion conserva la interfaz y que frontend/backend estan separados.

En Windows:

```powershell
docker compose up -d --build
.\scripts\smoke-test.ps1 -BaseUrl http://127.0.0.1:8080
```

Abrir:

```text
http://127.0.0.1:8080
```

Enviar en el chat:

```text
cuantos creditos tengo?
```

Respuesta esperada:

```text
Segun los datos, el estudiante posee 245 creditos aprobados.
```

Mensaje para explicar:

```text
Esta respuesta sale del backend FastAPI. La UI no tiene una respuesta fija. El navegador consume /api/chat por el origen del frontend y Nginx redirige al backend interno.
```

### Parte 2 - Mostrar Jenkins y la validacion de una rama

Objetivo: mostrar CI sin despliegue automatico accidental.

En Jenkins:

1. Entrar a `utec-ia`.
2. Click en `Scan Repository Now`.
3. Entrar a la rama `devops/jenkins-vm-pilot`.
4. Ejecutar `Build Now` o revisar el ultimo build exitoso.

Stages esperados:

```text
Checkout
Verify Agent
Backend Tests
Frontend Lint
Build Images
```

En esta rama, si `DEPLOY_BRANCH` queda en `test`, estos stages deben saltarse:

```text
Deploy VM
Smoke VM
```

Mensaje para explicar:

```text
El pipeline valida todas las ramas, pero no despliega desde cualquier rama. El despliegue esta protegido por la condicion DEPLOY_BRANCH.
```

### Parte 3 - Despliegue controlado desde rama piloto

Objetivo: probar deploy real sin mergear todavia a `test`.

En Jenkins, dentro de:

```text
utec-ia / devops/jenkins-vm-pilot
```

Click:

```text
Build with Parameters
```

Usar:

```text
DEPLOY_BRANCH=devops/jenkins-vm-pilot
VM_HOST=192.168.6.128
VM_USER=mauro
VM_PORT=22
VM_APP_DIR=/home/mauro/utec-ia
VM_FRONTEND_PORT=8080
SSH_CREDENTIALS_ID=utec-ia-vm-ssh
BACKEND_IMAGE_NAME=utec-ia-backend
FRONTEND_IMAGE_NAME=utec-ia-frontend
```

Stages esperados:

```text
Checkout              OK
Verify Agent          OK
Backend Tests         OK
Frontend Lint         OK
Build Images          OK
Deploy VM             OK
Smoke VM              OK
```

Al finalizar, abrir:

```text
http://192.168.6.128:8080
```

Validar por PowerShell:

```powershell
.\scripts\smoke-test.ps1 -BaseUrl http://192.168.6.128:8080
```

Validar version:

```powershell
Invoke-RestMethod http://192.168.6.128:8080/version
```

Debe devolver metadata parecida a:

```json
{
  "application": "UTEC_IA",
  "version": "<sha-corto>",
  "commit": "<sha-completo>",
  "environment": "vm-ubuntu",
  "mode": "demo"
}
```

### Parte 4 - Mostrar que la VM realmente aloja los contenedores

En la VM:

```bash
cd /home/mauro/utec-ia
docker compose -f docker-compose.vm.yml --env-file .env ps
docker logs utec-ia-backend --tail=30
docker logs utec-ia-frontend --tail=30
```

Se deberian ver:

```text
utec-ia-backend
utec-ia-frontend
```

Y el frontend publicando:

```text
0.0.0.0:8080->80/tcp
```

### Parte 5 - Flujo automatico real por PR hacia test

Objetivo: mostrar como se usaria en un equipo.

Flujo:

1. Crear PR desde `devops/jenkins-vm-pilot` hacia `test`.
2. Jenkins valida el PR sin deploy.
3. Un companero aprueba el PR en GitHub.
4. Se hace merge a `test`.
5. Jenkins detecta el cambio en `test`.
6. Como la rama ahora coincide con `DEPLOY_BRANCH=test`, Jenkins ejecuta:

```text
Deploy VM
Smoke VM
```

7. La VM queda actualizada.

Mensaje para explicar:

```text
La aprobacion de PR se gobierna en GitHub con Branch Protection Rules. Jenkins no decide cuantas aprobaciones hacen falta; Jenkins ejecuta la validacion y el despliegue cuando el cambio llega a la rama autorizada.
```

## Prueba de fallo controlado

Para una demo corta, conviene no forzar un fallo destructivo en la VM. Una prueba segura es cambiar temporalmente un parametro de build:

```text
SSH_CREDENTIALS_ID=credencial-inexistente
```

Resultado esperado:

```text
Tests/lint/build pueden pasar.
Deploy VM falla antes de tocar la VM porque Jenkins no encuentra la credencial.
```

Otra prueba segura:

```text
VM_FRONTEND_PORT=18080
```

Resultado:

```text
La app se publica en otro puerto. El smoke test usa el mismo parametro y valida la URL nueva.
```

No afirmar "cero interrupciones" sin medirlo. Este flujo reinicia contenedores con Docker Compose y esta pensado como piloto local.

## Rollback manual de la VM

Antes de copiar una nueva configuracion, `scripts/vm-deploy.sh` guarda en la VM:

```text
/home/mauro/utec-ia/.env.previous
/home/mauro/utec-ia/docker-compose.vm.yml.previous
```

Si una actualizacion deja la app mal, se puede restaurar la configuracion previa con:

```bash
VM_HOST=192.168.6.128 \
VM_USER=mauro \
VM_PORT=22 \
VM_APP_DIR=/home/mauro/utec-ia \
sh scripts/vm-rollback.sh
```

Si se ejecuta desde Jenkins y se quiere usar la misma credencial SSH, el rollback debe correr dentro de un paso `withCredentials` o hacerse manualmente desde una terminal que tenga acceso SSH a la VM.

Validacion posterior:

```powershell
.\scripts\smoke-test.ps1 -BaseUrl http://192.168.6.128:8080
```

Este rollback restaura Compose y `.env`; las imagenes anteriores deben seguir existiendo en Docker dentro de la VM. No ejecutar `docker image prune` antes de confirmar que no se necesitara rollback.

## Que demuestra cada practica DevOps

| Practica | Evidencia en la demo |
| --- | --- |
| Separacion frontend/backend | Dos Dockerfiles y dos imagenes |
| Automatizacion CI | Jenkins ejecuta tests y lint |
| Artefactos identificables | Tags por SHA corto del commit |
| Despliegue automatizado | Jenkins copia imagenes y ejecuta Compose en VM |
| Validacion post-deploy | `Smoke VM` prueba frontend, health, version y chat |
| Configuracion sin secretos en Git | SSH se guarda como credencial Jenkins |
| Trazabilidad | `/version` expone commit y version |
| Rollout manual de laboratorio | VM queda con contenedores versionados |
| Recuperacion | `vm-deploy.sh` guarda configuracion previa y `vm-rollback.sh` la restaura |

## Diferencia entre build exitoso y deploy exitoso

Un build verde en una rama que no coincide con `DEPLOY_BRANCH` solo significa:

```text
El codigo compila, pasa tests y construye imagenes.
```

No significa que la VM haya sido actualizada.

Para confirmar deploy, deben estar verdes:

```text
Deploy VM
Smoke VM
```

Y debe responder:

```text
http://192.168.6.128:8080
```

## Troubleshooting

### Jenkins no encuentra `Jenkinsfile.vm`

Verificar:

```text
La rama escaneada contiene Jenkinsfile.vm en la raiz.
El job Multibranch tiene Script Path = Jenkinsfile.vm.
Ejecutar Scan Repository Now.
```

### Deploy VM aparece vacio

Eso significa que fue saltado por condicion.

Verificar:

```text
Rama actual == DEPLOY_BRANCH
```

Para probar desde la rama piloto:

```text
DEPLOY_BRANCH=devops/jenkins-vm-pilot
```

### Deploy falla por SSH

Verificar desde Windows:

```powershell
Test-NetConnection -ComputerName 192.168.6.128 -Port 22
```

Verificar en la VM:

```bash
sudo systemctl status ssh --no-pager
```

Verificar Jenkins:

```text
Credential ID = utec-ia-vm-ssh
Username = mauro
La private key corresponde a una public key autorizada en /home/mauro/.ssh/authorized_keys
```

### Deploy pasa pero navegador no abre

Verificar desde Windows:

```powershell
Test-NetConnection -ComputerName 192.168.6.128 -Port 8080
```

Verificar en la VM:

```bash
cd /home/mauro/utec-ia
docker compose -f docker-compose.vm.yml --env-file .env ps
docker logs utec-ia-frontend --tail=50
docker logs utec-ia-backend --tail=50
sudo ufw status
```

### Smoke falla por version

El smoke test compara `/version` con el SHA esperado. Verificar:

```bash
cat /home/mauro/utec-ia/.env
```

Debe contener:

```text
IMAGE_TAG=<sha-corto>
UTEC_IA_COMMIT_SHA=<sha-completo>
UTEC_IA_ENVIRONMENT=vm-ubuntu
```

## Limitaciones declaradas

- Jenkins local no recibe webhooks desde GitHub si no tiene URL publica. Para demo se puede usar `Scan Repository Now` o configurar polling.
- No se usa registry en este flujo. Las imagenes viajan por `docker save` + `scp`.
- No se despliega AWS.
- No se implementa RAG.
- No se implementa autenticacion real.
- PostgreSQL/pgvector existe como perfil opcional, pero la API demo no lo consume.
- Docker Compose en una VM no equivale a Kubernetes ni alta disponibilidad.

## Cierre recomendado para la presentacion

```text
El piloto demuestra el ciclo DevOps sobre UTEC_IA: validacion automatica, imagenes separadas, despliegue reproducible en una VM Ubuntu y smoke test contra la aplicacion real. La arquitectura futura con AWS, RAG y Kubernetes queda documentada como siguiente etapa, no como funcionalidad simulada.
```
