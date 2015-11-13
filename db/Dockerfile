FROM ubuntu
MAINTAINER Shinichi SUGIYAMA

RUN apt-get update
RUN apt-get install -y curl git g++ python make libgeos++-dev

# Set working directory.
ENV HOME /root
WORKDIR /root

# install nodebrew
RUN curl -L git.io/nodebrew | perl - setup
ENV PATH $HOME/.nodebrew/current/bin:$PATH
RUN echo 'export PATH=$HOME/.nodebrew/current/bin:$PATH' >> $HOME/.bashrc
RUN nodebrew install-binary 0.10
RUN nodebrew list | head -1 |xargs nodebrew use
RUN git clone https://github.com/ssugiyama/walkdb-web.git web
RUN git clone https://github.com/ssugiyama/walkdb-api-node.git api
WORKDIR /root/api
RUN npm install
EXPOSE 3000
CMD npm start

