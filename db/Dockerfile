FROM chezsugi/postgis
MAINTAINER Shinichi SUGIYAMA <shin.sugi@gmail.com>

WORKDIR /tmp
RUN apk add --no-cache unzip
ADD schema.sql .
ADD japan_ver*.zip .
ADD walklog-init.sh /docker-entrypoint-initdb.d/
RUN chmod +x /docker-entrypoint-initdb.d/walklog-init.sh
