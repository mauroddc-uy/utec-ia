from app.core.config import Settings, get_settings


class DatabaseConfigurationError(RuntimeError):
    pass


class DatabaseConnectionError(RuntimeError):
    pass


def check_database_connection(settings: Settings | None = None) -> dict:
    settings = settings or get_settings()

    if not settings.database_url:
        raise DatabaseConfigurationError("DATABASE_URL no esta configurada.")

    try:
        import psycopg

        with psycopg.connect(settings.database_url, connect_timeout=3) as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()[0]
                cursor.execute("SELECT extversion FROM pg_extension WHERE extname = 'vector';")
                vector_result = cursor.fetchone()
    except Exception as exc:
        raise DatabaseConnectionError("No se pudo conectar a PostgreSQL.") from exc

    return {
        "status": "ok",
        "engine": "postgresql",
        "version": version,
        "pgvector": vector_result[0] if vector_result else "not_enabled",
    }
