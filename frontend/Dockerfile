FROM nginx:alpine

RUN apk update && apk upgrade --no-cache

LABEL authors="nextlayer"

COPY . /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80