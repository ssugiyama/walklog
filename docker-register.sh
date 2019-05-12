#! /bin/sh
docker-compose build
docker tag walklog_db chezsugi/walklog_db:latest
docker tag walklog_web chezsugi/walklog_web:latest
docker push chezsugi/walklog_db:latest
docker push chezsugi/walklog_web:latest
