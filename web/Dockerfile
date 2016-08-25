FROM mhart/alpine-node
MAINTAINER Shinichi SUGIYAMA <shin.sugi@gmail.com>
RUN mkdir -p /var/www
ADD package.json webpack.config.js /var/www/
WORKDIR /var/www
RUN npm install
CMD ["npm", "run", "build"]
