FROM node:20.9.0-alpine
LABEL maintainer="Shinichi SUGIYAMA <shin.sugi@gmail.com>"
RUN apk add --no-cache git yarn python3 make g++
RUN mkdir -p /var/www
ADD package.json entrypoint.sh yarn.lock babel.config.js .parcelrc .sequelizerc /var/www/
ADD shared /var/www/shared
ADD server /var/www/server
ADD client /var/www/client
ADD assets /var/www/public
WORKDIR /var/www
RUN yarn install --production=false
RUN yarn build-svr
RUN yarn build-cli
EXPOSE 3000
ENTRYPOINT [ "/var/www/entrypoint.sh" ]
CMD [ "npm", "start" ]
