from fastapi.testclient import TestClient

from app.main import app
from app.models.chat import ChatRequest


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "utec-ia-backend"
    assert body["mode"] == "demo"
    assert body["version"]
    assert body["commit"]


def test_version() -> None:
    response = client.get("/version")

    assert response.status_code == 200
    body = response.json()
    assert body["application"] == "UTEC_IA"
    assert body["version"]
    assert body["commit"]


def test_chat_default_response() -> None:
    response = client.post("/api/chat", json={"message": "Hola"})

    assert response.status_code == 200
    assert "respuesta simulada de UTEC_IA" in response.json()["response"]


def test_chat_academic_credits_response() -> None:
    response = client.post("/api/chat", json={"message": "Cuantos creditos tengo?"})

    assert response.status_code == 200
    assert "245 creditos aprobados" in response.json()["response"]


def test_chat_rejects_missing_message() -> None:
    response = client.post("/api/chat", json={})

    assert response.status_code == 422


def test_chat_rejects_empty_message() -> None:
    response = client.post("/api/chat", json={"message": ""})

    assert response.status_code == 422


def test_chat_rejects_whitespace_message() -> None:
    response = client.post("/api/chat", json={"message": "   "})

    assert response.status_code == 422


def test_chat_accepts_message_at_length_limit() -> None:
    response = client.post("/api/chat", json={"message": "a" * 1000})

    assert response.status_code == 200
    assert response.json()["response"]


def test_chat_rejects_message_over_length_limit() -> None:
    response = client.post("/api/chat", json={"message": "a" * 1001})

    assert response.status_code == 422


def test_chat_accepts_optional_user_email() -> None:
    response = client.post(
        "/api/chat",
        json={"message": "Hola", "user_email": " estudiante@utec.edu.uy "},
    )

    assert response.status_code == 200


def test_chat_rejects_user_email_over_length_limit() -> None:
    response = client.post(
        "/api/chat",
        json={"message": "Hola", "user_email": "a" * 255},
    )

    assert response.status_code == 422


def test_chat_request_normalizes_optional_user_email() -> None:
    payload = ChatRequest(
        message=" Hola ",
        user_email=" ESTUDIANTE@UTEC.EDU.UY ",
    )

    assert payload.message == "Hola"
    assert payload.user_email == "estudiante@utec.edu.uy"
