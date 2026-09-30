from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "utec-ia-backend",
    }


def test_version() -> None:
    response = client.get("/version")

    assert response.status_code == 200
    assert response.json() == {
        "application": "UTEC_IA",
        "version": "0.1.0",
    }


def test_chat_default_response() -> None:
    response = client.post("/api/chat", json={"message": "Hola"})

    assert response.status_code == 200
    assert "respuesta simulada de UTEC_IA" in response.json()["response"]


def test_chat_academic_credits_response() -> None:
    response = client.post("/api/chat", json={"message": "Cuantos creditos tengo?"})

    assert response.status_code == 200
    assert "245 creditos aprobados" in response.json()["response"]
