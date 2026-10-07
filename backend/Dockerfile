FROM python:3.12-slim

ARG UTEC_IA_VERSION=0.1.0
ARG UTEC_IA_COMMIT_SHA=local

RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

LABEL authors="nextlayer"

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UTEC_IA_VERSION=${UTEC_IA_VERSION}
ENV UTEC_IA_COMMIT_SHA=${UTEC_IA_COMMIT_SHA}
ENV UTEC_IA_ENVIRONMENT=container
ENV UTEC_IA_MODE=demo

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -m appuser && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
