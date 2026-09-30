import unicodedata


DEFAULT_RESPONSE = (
    "Esta es una respuesta simulada de UTEC_IA. La integracion con los "
    "servicios academicos y documentales se implementara pronto."
)


def normalize_text(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text.lower())
    without_accents = "".join(
        char for char in normalized if unicodedata.category(char) != "Mn"
    )
    return without_accents.strip()


def build_mock_response(message: str) -> str:
    query = normalize_text(message)

    if "credito" in query:
        return (
            "Segun los datos, el estudiante posee 245 "
            "creditos aprobados."
        )

    if "materia" in query or "cursando" in query or "curso" in query:
        return (
            "Segun los datos, estas cursando Taller devops, "
            "Proyecto e Ingles."
        )

    if "inasistencia" in query or "asistencia" in query:
        return (
            "Segun los datos que tengo, registras 2 inasistencias en "
            "el periodo actual del semestre."
        )

    if "beca" in query or "becas" in query:
        return (
            "Para esta demostracion, la informacion sobre becas se ubica en "
            "el portal institucional de UTEC y en la seccion de Bienestar "
            "Estudiantil."
        )

    if "documento" in query or "documentos" in query or "necesito" in query:
        return (
            "Segun la respuesta documental simulada, normalmente se solicita "
            "cedula de identidad vigente, escolaridad y el formulario "
            "correspondiente al tramite."
        )

    return DEFAULT_RESPONSE
