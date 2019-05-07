FROM mhart/alpine-node
MAINTAINER Shinichi SUGIYAMA <shin.sugi@gmail.com>
RUN apk add --no-cache git
RUN apk add --no-cache yarn
RUN mkdir -p /var/www
ADD package.json setup.sh index.js yarn.lock .babelrc /var/www/
ADD lib /var/www/lib
ADD src /var/www/src
ADD assets /var/www/assets
WORKDIR /var/www
RUN yarn install
RUN yarn run build-svr
EXPOSE 3000
CMD [ "npm", "start" ]
