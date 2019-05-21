FROM node:10-alpine

RUN apk update && \
    apk add --no-cache git python g++ make procps

WORKDIR /ethstats-cli

COPY package.json package-lock.json .babelrc ./

RUN npm install

COPY . .

RUN npm run gulp prepare

ENTRYPOINT ["./bin/ethstats-cli.js", "-vd"]
