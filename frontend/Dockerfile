FROM nginx:alpine

ARG UTEC_IA_VERSION=0.1.0
ARG UTEC_IA_COMMIT_SHA=local

RUN apk update && apk upgrade --no-cache

LABEL authors="nextlayer"
LABEL org.opencontainers.image.title="UTEC_IA Frontend"
LABEL org.opencontainers.image.version="${UTEC_IA_VERSION}"
LABEL org.opencontainers.image.revision="${UTEC_IA_COMMIT_SHA}"

COPY . /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
