

#! /bin/sh

# walklog_web is pushed by circleci

docker login -u $DOCKER_USER -p $DOCKER_PASS
docker build -t $DOCKER_USER/walklog_db db
docker push $DOCKER_USER/walklog_db:latest
