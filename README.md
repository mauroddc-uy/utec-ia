# UTEC IA - Preview

Preview web de UTECia construida con FastAPI. El proyecto expone una interfaz HTML con archivos estaticos, una experiencia de chat demostrativa y endpoints basicos para validar el flujo entre navegador, JavaScript y backend.

La aplicacion actual es una demo: el login, el perfil, el tema visual y las conversaciones se manejan en el frontend. El endpoint de chat responde con un texto fijo para demostrar la integracion `Navegador -> JavaScript -> FastAPI -> JSON -> Navegador`.

## Tecnologias

- Python
- FastAPI
- Uvicorn
- Pydantic
- Jinja2
- HTML, CSS y JavaScript
- Docker
- PostgreSQL con pgvector mediante `docker-compose.yml`

## Estructura del proyecto

```text
.
+-- app/
|   +-- main.py
|   +-- static/
|   |   +-- css/
|   |   |   +-- styles.css
|   |   +-- js/
|   |       +-- app.js
|   +-- templates/
|       +-- index.html
+-- Dockerfile
+-- docker-compose.yml
+-- requirements.txt
+-- test_main.http
+-- README.md
```

## Componentes principales

- `app/main.py`: define la aplicacion FastAPI, monta archivos estaticos, configura templates Jinja2 y declara los endpoints.
- `app/templates/index.html`: plantilla principal renderizada en `/`.
- `app/static/css/styles.css`: estilos de la interfaz.
- `app/static/js/app.js`: logica del chat, login demo, perfil, conversaciones en memoria del navegador y consumo de `/api/chat`.
- `requirements.txt`: dependencias Python necesarias para ejecutar el proyecto.
- `test_main.http`: requests de prueba para ejecutar desde IDEs compatibles con archivos `.http`.
- `Dockerfile`: construye una imagen Docker para ejecutar la app con Uvicorn.
- `docker-compose.yml`: levanta una base PostgreSQL con pgvector. La app FastAPI todavia no esta incluida como servicio en ese compose.

## Dependencias

El archivo `requirements.txt` incluye:

```text
fastapi
jinja2
uvicorn
pydantic
```

Instalacion local:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

En Linux/macOS:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Como iniciar el proyecto localmente

Desde la raiz del proyecto:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Luego abrir:

- App web: `http://127.0.0.1:8000/`
- Health check: `http://127.0.0.1:8000/health`
- Documentacion Swagger/OpenAPI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

## Endpoints disponibles

### `GET /`

Renderiza la interfaz web principal usando `app/templates/index.html`.

### `GET /health`

Devuelve el estado basico del servicio.

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "utec-ia-preview"
}
```

### `POST /api/chat`

Recibe un mensaje del usuario y devuelve una respuesta demo.

Request:

```json
{
  "message": "Cuantos creditos necesito para finalizar la carrera?",
  "user_email": null
}
```

Response:

```json
{
  "answer": "Consulta recibida correctamente por la preview de UTEC_IA. Esta respuesta demuestra el flujo Navegador -> JavaScript -> FastAPI -> JSON -> Navegador."
}
```

Validaciones:

- `message` es obligatorio.
- `message` no puede estar vacio.
- `message` tiene un maximo de 1000 caracteres.
- `user_email` es opcional y tiene un maximo de 254 caracteres.

## Pruebas manuales

Se puede usar `test_main.http` desde PyCharm, IntelliJ IDEA, VS Code con extension REST Client u otro cliente compatible.

Tambien se puede probar desde PowerShell:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/health
```

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/api/chat `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"message":"Hola","user_email":null}'
```

## Docker

### Construir la imagen

```powershell
docker build -t utec-ia .
```

### Ejecutar el contenedor

```powershell
docker run --rm -p 8000:8000 utec-ia
```

Luego abrir:

```text
http://127.0.0.1:8000/
```

### Explicacion del Dockerfile

```dockerfile
FROM python:3.12-slim
```

Usa una imagen base liviana con Python 3.12.

```dockerfile
LABEL authors="matix"
```

Agrega metadata de autor a la imagen.

```dockerfile
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
```

Evita generar archivos `.pyc` y hace que los logs de Python se escriban sin buffering, algo util en contenedores.

```dockerfile
WORKDIR /app
```

Define `/app` como directorio de trabajo dentro del contenedor.

```dockerfile
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
```

Copia primero las dependencias e instala los paquetes. Esto mejora el cache de Docker: si el codigo cambia pero `requirements.txt` no, Docker puede reutilizar la capa de instalacion.

```dockerfile
COPY . .
```

Copia el resto del proyecto al contenedor. Los archivos excluidos en `.dockerignore` no se copian.

```dockerfile
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser
```

Crea un usuario no-root y ejecuta la app con ese usuario. Esto reduce el riesgo de ejecutar el proceso principal con privilegios innecesarios.

```dockerfile
EXPOSE 8000
```

Documenta que la app escucha en el puerto `8000`.

```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Comando por defecto del contenedor. Inicia Uvicorn apuntando a la instancia `app` definida en `app/main.py`. Se usa `0.0.0.0` para que el servicio sea accesible desde fuera del contenedor.



## Credenciales demo del frontend

El login esta implementado en `app/static/js/app.js` y existe solo para demo local. Usuarios incluidos:

```text
admin / admin
test / test
test@test.com / test
```

No usar este mecanismo como autenticacion real en produccion.

## Notas de desarrollo

- La UI guarda configuracion de perfil en `localStorage`.
- Las conversaciones viven en memoria del navegador y se reinician al recargar o cerrar sesion.
- El backend no tiene persistencia ni integracion real con IA en este estado.
- Para desarrollo local conviene usar `--reload`; para Docker se usa el comando productivo sin reload.
