FROM mhart/alpine-node
MAINTAINER Shinichi SUGIYAMA <shin.sugi@gmail.com>
RUN apk add --no-cache git
RUN apk add --no-cache yarn
RUN mkdir -p /var/www
ADD package.json webpack.config.js setup.sh index.js yarn.lock /var/www/
ADD lib /var/www/lib
ADD views /var/www/views
ADD src /var/www/src
ADD assets /var/www/assets
WORKDIR /var/www
RUN yarn install
RUN yarn run build-svr
EXPOSE 3000
CMD [ "npm", "start" ]