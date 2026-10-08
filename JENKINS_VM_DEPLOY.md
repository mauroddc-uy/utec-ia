# Jenkins local + VM Ubuntu

Este flujo permite que Jenkins corra en un contenedor local y despliegue UTEC_IA en una VM Ubuntu con Docker Compose.

```text
GitHub PR
  -> Jenkins valida tests/lint/build
Merge a la rama autorizada
  -> Jenkins construye imagenes
  -> copia imagenes por SSH a la VM Ubuntu
  -> docker compose up -d en la VM
  -> smoke test HTTP contra la URL real de la VM
```

## Datos necesarios

No se guardan secretos en Git. Estos valores se cargan en Jenkins o como parametros del job:

- IP o DNS de la VM: credencial Jenkins Secret text `utec-ia-vm-host`.
- Usuario SSH de la VM: username de la credencial SSH.
- Puerto SSH: `VM_PORT`, normalmente `22`.
- Clave privada SSH con acceso a la VM: credencial Jenkins `utec-ia-vm-ssh-file`.
- Rama que despliega: `DEPLOY_BRANCH`.
- Puerto web publicado en la VM: `VM_FRONTEND_PORT`.
- URL del repositorio GitHub: `https://github.com/mauroddc-uy/utec-ia`.

## Preparar la VM Ubuntu

La VM debe tener Docker y Docker Compose plugin:

```bash
docker version
docker compose version
```

Tambien debe tener SSH activo para que Jenkins pueda conectarse:

```bash
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
sudo systemctl status ssh --no-pager
```

El usuario SSH debe poder ejecutar Docker. Una forma habitual:

```bash
sudo usermod -aG docker <usuario>
```

Luego cerrar y volver a abrir la sesion SSH para que aplique el grupo.

La VM debe aceptar conexiones desde la maquina donde corre Jenkins y exponer el puerto elegido:

```bash
sudo ufw allow 8080/tcp
sudo ufw allow 22/tcp
```

## Levantar Jenkins local

Desde el root del repo:

```powershell
copy .env.jenkins.example .env.jenkins
docker compose -f docker-compose.jenkins.yml --env-file .env.jenkins up -d --build
```

Abrir:

```text
http://127.0.0.1:8081
```

El contenedor monta `/var/run/docker.sock` para poder construir imagenes con el Docker local. Es aceptable para demo local; no es un modelo de aislamiento fuerte para produccion.

Para obtener la clave inicial:

```powershell
docker exec utec-ia-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

## Crear credencial SSH en Jenkins

En Jenkins:

```text
Manage Jenkins -> Credentials -> System -> Global credentials -> Add Credentials
```

Tipo:

```text
SSH Username with private key
```

Valores:

- ID: `utec-ia-vm-ssh-file`.
- Username: usuario de la VM, por ejemplo `ubuntu`.
- Private Key: clave privada que tiene acceso SSH a la VM.

Probar desde Jenkins, si hace falta, creando un job simple o usando el pipeline.

## Crear credencial del host de la VM

Para que la IP o DNS no viaje en Git, guardarla como credencial Jenkins:

```text
Manage Jenkins -> Credentials -> System -> Global credentials -> Add Credentials
```

Tipo:

```text
Secret text
```

Valores:

- ID: `utec-ia-vm-host`.
- Secret: IP o DNS real de la VM.

## Crear job Multibranch Pipeline

1. New Item.
2. Elegir `Multibranch Pipeline`.
3. Branch Source: GitHub.
4. Repository HTTPS o SSH del repo.
5. Build Configuration:

```text
Mode: by Jenkinsfile
Script Path: Jenkinsfile.vm
```

6. Guardar y ejecutar `Scan Multibranch Pipeline Now`.

## PR y despliegue automatico

Con `Jenkinsfile.vm`:

- Un PR ejecuta checkout, tests, lint y build. No despliega.
- Un merge/push a `DEPLOY_BRANCH` despliega automaticamente a la VM.

La aprobacion minima del PR se configura en GitHub:

```text
Settings -> Branches -> Branch protection rules
```

Configurar ahi revisiones obligatorias si el docente lo pide. La presentacion no fija cantidad de aprobaciones.

## Parametros importantes del job

- `DEPLOY_BRANCH`: rama que despliega.
- `VM_HOST_CREDENTIALS_ID`: credencial Secret text con la IP/DNS de la VM.
- `VM_PORT`: puerto SSH.
- `VM_APP_DIR`: directorio remoto opcional. Si queda vacio, usa `/home/<usuario_ssh>/utec-ia`.
- `VM_FRONTEND_PORT`: puerto publicado del frontend en la VM.
- `SSH_CREDENTIALS_ID`: `utec-ia-vm-ssh-file`.

## Verificacion manual

Despues de un despliegue:

```powershell
.\scripts\smoke-test.ps1 -BaseUrl http://<IP_VM>:8080
```

En la VM:

```bash
cd /home/<USUARIO_VM>/utec-ia
docker compose -f docker-compose.vm.yml --env-file .env ps
docker logs utec-ia-backend --tail=50
docker logs utec-ia-frontend --tail=50
```

## Rollback manual

Cada deploy guarda la configuracion anterior de la VM como:

```text
.env.previous
docker-compose.vm.yml.previous
```

Para restaurarla:

```bash
VM_HOST=<IP_O_DNS_VM> \
VM_USER=<USUARIO_VM> \
VM_PORT=22 \
VM_APP_DIR=/home/<USUARIO_VM>/utec-ia \
sh scripts/vm-rollback.sh
```

Las imagenes anteriores deben seguir cargadas en Docker dentro de la VM.

## Limitaciones de este flujo

- No usa registry. Jenkins transfiere imagenes con `docker save` + `scp`.
- Es ideal para demo local o laboratorio.
- Para un flujo mas profesional, cambiar a registry: Jenkins hace `docker push`, la VM hace `docker compose pull`.
- Si Jenkins esta local y queres webhooks GitHub reales, GitHub necesita llegar a Jenkins. Para eso podes usar una URL publica temporal con ngrok/cloudflared, o configurar polling periodico en Jenkins.
