# ethstats-cli [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]

> EthStats.io CLI client.  
>   
>
> This app connects to your Ethereum node through RPC and extract data that will be sent to the ethstats server for analytics purposes. Stats are displayed on [ethstats.io](https://ethstats.io/network-statistics)

# Contents
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installing and running](#setup)
      - [Directly](#directly)
      - [In Docker](#in-docker)
  - [Troubleshooting](#troubleshooting)
  - [Options](#options)
  - [License](#license)


# Getting started 

## Prerequisites 
Please make sure you have the following installed and running properly
- [Node.js](https://nodejs.org/en/download/) >= 7.0  
- NPM >= 5.0 (NPM is distributed with Node.js. For more infos see: https://www.npmjs.com/get-npm)
- [Geth](https://geth.ethereum.org/install/) or [Parity](https://wiki.parity.io/Setup) running in one of the supported configurations **synced on the Ethereum main/foundation chain**
- JSON-RPC http api enabled and accessible on the Ethereum client of choice (Geth/Parity)

## Supported client configurations
Geth
- fast (`--syncmode "fast"`)
- full (`--syncmode "full"`)
- light (`--syncmode "light"`)
> tested  1.8.1,

Parity
- fast (`--pruning fast`)
- archive (`--pruning archive`)
- with no ancient blocks (`--no-ancient-blocks`)
> tested 1.7.11, 1.8.6, 1.8.7, 1.9.0, 1.9.1, 1.9.2, 1.10.0,

## Setup

### Directly
The app is configured by default to connect to an Ethereum client on the local machine.
To connect to a client running on another host see `--rpc-host` and `--rpc-port` under [Options](#options).

#### Install `ethstats-cli` globally

With [npm](https://www.npmjs.com):
```sh
npm install -g ethstats-cli
```

Or [yarn](https://yarnpkg.com):
```sh
yarn global add ethstats-cli
```

#### Running `ethstats-cli`
On the first run of the app you will be asked a series of questions to setup your node. 
Either follow the on screen instruction or see [Options](#options) for a non-interactive mode.
```sh
$ ethstats-cli
```
After the setup is done, your node will be visible on [ethstats.io](https://stage.ethstats.io/network-statistics)

> It is highly recommended you use a process manager like [PM2](http://pm2.keymetrics.io) or [Forever](https://github.com/foreverjs/forever) to keep `ethstats-cli` running at all times.

#### Update `ethstats-cli` to the latest available version

With [npm](https://www.npmjs.com):
```sh
npm install -g ethstats-cli@latest
```

Or [yarn](https://yarnpkg.com):
```sh
yarn global upgrade ethstats-cli
```

### In Docker

#### Installing and running
The following commands assume that the Ethereum client is either running locally or in docker with `--net host`.
For other options you should check out [Options](#options).

Make a directory where your configuration files will be persisted.
```sh
mkdir /opt/ethstats-cli
```

Then run the following command to run 
```sh
docker \
run -d \
--restart always \
--net host \
--name ethstats \
-v /opt/ethstats-cli/:/root/.config/configstore/ \
node:latest \
/bin/sh -c "yarn global add ethstats-cli && ethstats-cli -r --account-email your@email.com --node-name your_node_name"
```

If you already had a configuration file, the settings from that file will be used and the command line ignored. Delete the files in `/opt/ethstats-cli` to add a node with different settings.

#### Updating
To update you just need to stop and remove the `ethstats` container and re-run the above [docker command](#installing-and-running)

```sh
docker stop ethstats && docker rm ethstats
```
then run it again.

## Troubleshooting
Trouble free for now

## Options

```sh
      --help, -h                Show help
      --version, -V             Show version
      --debug, -d               Output values sent to server
      --verbose, -v             Output more detailed information
      
      --server-host             Server Host
      --server-port             Server Port
      --net, -n                 Specify Ethereum network your node is running on (Default: mainnet, Available: mainnet|ropsten|kovan|rinkeby)
                                If --server-host or --server-port are specified, this option is ignored.

      --rpc-host                RPC Host (Default: http://localhost)
      --rpc-port                RPC Port (Default: 8545)
      
      --register, -r            Register node in non-interactive mode
        --account-email         Account identification, also used in case of node/secret-key recovery
                                It is possible to have multiple nodes under the same account-email
        --node-name             Name of the node. If node is already registered, a unique 5 char hash will be appended.
```

## License

MIT © [cubedro]()

[npm-image]: https://badge.fury.io/js/ethstats-cli.svg
[npm-url]: https://npmjs.org/package/ethstats-cli
[travis-image]: https://travis-ci.org/EthStats/client-node.svg?branch=master
[travis-url]: https://travis-ci.org/EthStats/client-node
[daviddm-image]: https://david-dm.org/EthStats/client-node.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/EthStats/client-node
[coveralls-image]: https://coveralls.io/repos/EthStats/client-node/badge.svg
[coveralls-url]: https://coveralls.io/r/EthStats/client-node
