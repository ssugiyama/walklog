FROM node
MAINTAINER Shinichi SUGIYAMA <shin.sugi@gmail.com>

RUN mkdir -p /var/www
COPY package.json webpack.config.js src /var/www/
WORKDIR /var/www
RUN npm install
CMD ["npm", "run", "build"]
