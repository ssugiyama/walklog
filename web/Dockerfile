FROM node
MAINTAINER Shinichi SUGIYAMA <shin.sugi@gmail.com>

RUN mkdir -p /var/www
COPY . /var/www
WORKDIR /var/www
RUN npm install
RUN npm run build
