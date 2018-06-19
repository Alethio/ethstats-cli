FROM node:latest

WORKDIR /ethstats-cli

COPY package.json package-lock.json .babelrc ./

RUN npm install -g gulp
RUN npm install

COPY . .

RUN gulp prepare

ENTRYPOINT ["./bin/ethstats-cli.js", "-vd"]
