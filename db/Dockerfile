FROM mdillon/postgis:11-alpine
MAINTAINER Shinichi SUGIYAMA <shin.sugi@gmail.com>

WORKDIR /tmp
ADD schema.sql /docker-entrypoint-initdb.d/
ADD manage-areas.sh /usr/local/bin
RUN chmod +x /usr/local/bin/manage-areas.sh
