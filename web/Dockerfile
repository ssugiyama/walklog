FROM node:20.5.0-alpine
LABEL maintainer="Shinichi SUGIYAMA <shin.sugi@gmail.com>"
RUN apk add --no-cache git yarn python3 make g++
RUN mkdir -p /var/www
ADD package.json setup.sh index.js yarn.lock babel.config.js .parcelrc .sequelizerc /var/www/
ADD lib /var/www/lib
ADD src /var/www/src
ADD assets /var/www/assets
WORKDIR /var/www
RUN yarn install
RUN yarn run build-svr
EXPOSE 3000
CMD [ "npm", "start" ]
