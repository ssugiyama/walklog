FROM node
MAINTAINER Shinichi SUGIYAMA <shin.sugi@gmail.com>

RUN mkdir -p /var/www
ADD package.json webpack.config.js /var/www/
ADD src /var/www/src/
WORKDIR /var/www
RUN npm install
CMD ["npm", "run", "build"]
