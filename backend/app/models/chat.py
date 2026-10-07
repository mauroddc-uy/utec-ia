from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    user_email: str | None = Field(default=None, max_length=254)

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        message = value.strip()
        if not message:
            raise ValueError("El mensaje no puede estar vacio.")
        return message

    @field_validator("user_email")
    @classmethod
    def normalize_user_email(cls, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = value.strip().lower()
        return normalized or None


class ChatResponse(BaseModel):
    response: str
