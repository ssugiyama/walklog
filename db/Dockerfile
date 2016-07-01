FROM mdillon/postgis
MAINTAINER Shinichi SUGIYAMA <shin.sugi@gmail.com>

WORKDIR /tmp
RUN apt-get update
RUN apt-get install -y unzip
ADD schema.sql .
ADD japan_ver80.zip .
ADD walklog-init.sh /docker-entrypoint-initdb.d/
RUN chmod +x /docker-entrypoint-initdb.d/walklog-init.sh
