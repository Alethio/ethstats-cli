FROM node:alpine

# Using this node verision because `process.versions.modules` is 51, which
# matches the prebuilt `uws` binaries

RUN apk update && \
    apk add git # libc6-compat

WORKDIR /app
COPY package.json package-lock.json ./
COPY .babelrc ./

RUN npm install

COPY . .

CMD ["node", "./bin/ethstats-cli.js"]


