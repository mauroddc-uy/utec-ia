# UTEC_IA

UTEC_IA es un asistente academico y documental para UTEC. Esta version prepara el prototipo para una demostracion DevOps separando frontend y backend sin implementar todavia RAG, autenticacion, base de datos, servicios externos de IA, Docker, Kubernetes ni CI/CD.

Los datos actuales son simulados y sirven solo para validar el flujo:

```text
Frontend
    |
    | HTTP API
    v
FastAPI backend
    |
    +-- respuestas mock
```

## Estructura

```text
utec-ia/
+-- frontend/
|   +-- index.html
|   +-- config.js
|   +-- config.example.js
|   +-- static/
|       +-- css/styles.css
|       +-- js/app.js
+-- backend/
|   +-- app/
|   |   +-- main.py
|   |   +-- api/
|   |   +-- models/
|   |   +-- services/
|   +-- tests/
|   +-- requirements.txt
+-- .env.example
+-- README.md
```

## Frontend

El frontend conserva la interfaz visual existente: chat, textbox, mensajes, historico, sidebar, login demo, perfil y estilos. Ahora se sirve como sitio estatico y consume la API del backend.

Configuracion de API:

- `frontend/config.js` define `window.UTEC_IA_CONFIG.API_URL`.
- `frontend/config.example.js` muestra el valor esperado para desarrollo local.

Iniciar frontend:

```powershell
cd frontend
python -m http.server 3000
```

Abrir:

```text
http://127.0.0.1:3000
```

## Backend

El backend es una API FastAPI minima. Contiene health check, version y respuestas mock para el chat.

Instalar dependencias:

```powershell
cd backend
python -m pip install -r requirements.txt
```

Iniciar backend:

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Endpoints

### `GET /health`

```json
{
  "status": "ok",
  "service": "utec-ia-backend"
}
```

### `GET /version`

```json
{
  "application": "UTEC_IA",
  "version": "0.1.0"
}
```

### `POST /api/chat`

Request:

```json
{
  "message": "Cuantos creditos tengo?"
}
```

Response:

```json
{
  "response": "Segun los datos de demostracion, el estudiante posee 245 creditos aprobados."
}
```

Consultas mock contempladas:

- creditos del estudiante;
- materias cursadas;
- inasistencias;
- informacion sobre becas;
- documentos requeridos para tramites.

Para cualquier otra consulta, el backend responde que la integracion academica, documental e IA se implementara posteriormente.

## Tests

Desde `backend/`:

```powershell
python -m pytest
```

Los tests cubren:

- `/health`;
- `/version`;
- `/api/chat`;
- una respuesta academica mock sobre creditos.

## Notas

- CORS esta abierto para desarrollo local y debera restringirse cuando existan dominios reales.
- Las conversaciones y el perfil demo siguen viviendo en el navegador.
- Esta separacion deja listo el proyecto para una etapa posterior de contenerizacion y CI/CD.
