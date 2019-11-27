# ethstats-cli [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]

> EthStats - CLI Client 
>   
>
> The application connects to your Ethereum node through RPC and extract data that will be sent to the `EthStats - Server` for analytics purposes.  

# Live deployments
See active nodes or add your own on the following running deployments of the EthStats Network Monitor 

 - Mainnet - [ethstats.io](https://ethstats.io/)  
 - Rinkeby Testnet - [rinkeby.ethstats.io](https://rinkeby.ethstats.io/)
 - Görli Testnet - [goerli.ethstats.io](https://goerli.ethstats.io/)

# Supported Ethereum nodes
Geth, Parity, Besu, basically any Ethereum node that has RPC enabled.

# Contents
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Install](#install)
    - [Update](#update)
    - [Running](#running)
    - [Register node](#register-node)
    - [Config file](#config-file)
    - [Node recovery](#node-recovery)
  - [CLI Options](#cli-options)
  - [Daemon](#daemon)
  - [Docker](#docker)
  - [Troubleshooting](https://github.com/Alethio/ethstats-cli/blob/master/TROUBLESHOOTING.md)
  - [Changelog](https://github.com/Alethio/ethstats-cli/blob/master/CHANGELOG.md)
  - [License](https://github.com/Alethio/ethstats-cli/blob/master/LICENSE)

# Getting started 

## Prerequisites 
Please make sure you have the following installed and running properly
- [Node.js](https://nodejs.org/en/download/) >= 8.11
- [NPM](https://www.npmjs.com/get-npm) >= 5.6 (Usually NPM is distributed with Node.js)
- Build Tools - To compile and install native addons from NPM you may also need to install tools like: make, gcc, g++. E.q. on ubuntu `build-essential` package has all the necessary tools.
- [Yarn](https://yarnpkg.com) >= 1.5 Yarn is `optional`, being an alternative to NPM.
- [Git](https://git-scm.com/downloads) - Some dependencies are downloaded through Git.
- [Geth](https://geth.ethereum.org/install/) or [Parity](https://wiki.parity.io/Setup) running in one of the supported configurations **synced on the Ethereum main/foundation chain**
- JSON-RPC http or websockets or ipc APIs enabled and accessible on the Ethereum node of choice (Geth/Parity)


## Install

Install `ethstats-cli` globally

With [npm](https://www.npmjs.com):
```sh
npm install -g ethstats-cli
```
If you encounter permissions issues at install time please see [troubleshooting](https://github.com/Alethio/ethstats-cli/blob/master/TROUBLESHOOTING.md) section.

Or [yarn](https://yarnpkg.com):
```sh
yarn global add ethstats-cli
```
If after installing the package with yarn, the binaries are not found please see troubleshooting section: [Binaries not found](#binaries-not-found)

## Update 

Update `ethstats-cli` to the latest available version

With [npm](https://www.npmjs.com):
```sh
npm install -g ethstats-cli@latest
```

Or [yarn](https://yarnpkg.com):
```sh
yarn global upgrade ethstats-cli
```

## Running
To run the app use the following command:
```sh
$ ethstats-cli
```
The app is configured by default to connect to the Ethereum node on your local host (http://localhost:8545).
To connect to a node running on a different host see `--client-url` under [CLI Options](#cli-options).

The server that is connecting to by default is the one deployed for the Ethereum `mainnet`. For sending stats for a different network see the `--net` flag under [CLI Options](#cli-options).
Changing the network requires a new registration of the node. This is required because based on the network you specify at registration time the stats will be sent to a different server. Each server has its own nodes/secretKeys.
A new registration is possible if the [config file](#config-file) is deleted.

IMPORTANT: To be able to extract all statistics from the Ethereum node we recommend running the app on the same host. The usage information about the node like cpu and memory load cannot be extracted if on a different host.

## Register node

On the first run of the app the first thing it does is to register the Ethereum node in our platform. For this you will be asked about the network the node is running on, email address and node name.

It is possible to register the node also in non interactive mode without asking the necessary infos by specifying the `--register` option like in the example bellow:
```sh
$ ethstats-cli --register --account-email your@email.com --node-name your_node_name
```

For more details on these options please see [CLI Options](#cli-options). 

If the node is already registered and you still specify the `--register` option, it will be avoided. 
A new registration is possible if the [config file](#config-file) is deleted. 

NOTE: Every registered node will and must have its own secret key.

## Config file
After the node was successfully registered, a config file is created in the following location: 
```sh
~/.config/configstore/ethstats-cli.json
```  

It persists the node name, the secret key received on successfully registration and the values of the following CLI options:
  - `--configurator-url`
  - `--server-url`
  - `--client-url`
  - `--client-ipc-path`
  - `--network`

## Node recovery

IMPORTANT: This is available ONLY in interactive mode.

If you lost your secret key or config file or accidentally deleted it and want to use the same node name previously registered, there is possible to recover it.
To do that start `ethstats-cli` and on startup by not having a config file it will try to register by asking you:
```
? Is your node already registered ?
  New node
> Existing node
```
Using arrow keys select "Existing node", then you need to enter your email account which was used to register your node.

```
? Please enter account email: 
```
After typing that in, next an email will be sent to that account with a list of all nodes registered with that email account. Every node name in the list will have attached a recovery hash.
Select the recovery hash of the node you want to recover and type it in at the following step.

```
? Please enter node recovery hash:
```
This should end with a successful registration of an existing node name.
Keep in mind that the list of recovery hashes sent in the email expires in 30 minutes.

# CLI Options:

```sh
  --help, -h                Show help
  --version, -V             Show version
  --debug, -d               Output values sent to server
  --verbose, -v             Output more detailed information

  --server-url              Server URL (Must include protocol and port if any)
  --net, -n                 Specify Ethereum network your node is running on (Default: mainnet)
                            Available networks: mainnet|rinkeby|goerli
                            If --server-url is specified, this option is ignored

  --client-url              Client URL (Must include protocol and port if any; Default: http://localhost:8545)
                            Based on the protocol specified in the url (http | ws) the app sets the corresponding  Web3 provider
                            If --client-ipc-path is specified, this option is ignored
  --client-ipc-path         Client IPC path

  --configurator-url        Configurator URL (Must include protocol and port if any). Custom configuration service to provide application specific configs.

  --register, -r            Register node in non-interactive mode
    --account-email         Account identification, also used in case of node/secret-key recovery
                            It is possible to have multiple nodes under the same account-email
    --node-name             Name of the node. If node is already registered, a unique 5 char hash will be appended
```

# Daemon

To keep the app running at all times, you can run it as a daemon using the following command:

```sh
$ ethstats-daemon
```

## Daemon options:

```sh
  start               Start daemon
  stop                Stop daemon
  restart             Restart daemon. If it is already started, the process will be stopped first.
  status              Show infos about the daemon.
  kill                Ethstats daemon uses PM2 as a process manager. This command will kill PM2 god daemon.
```

If any CLI options are specified after the Daemon option, they will be forwarded to the forked process.
The Daemon mode is implemented programmatically through the PM2 API. The API does not support the "startup" feature. To handle start on boot, check out the [PM2](#with-pm2) instructions.

## PM2

For more control you can use directly [PM2](http://pm2.keymetrics.io). Here is a JSON format process file that we recommend:

```json
{
  "apps": [{
    "name": "ethstats-cli",
    "script": "ethstats-cli",
    "pid": "~/.ethstats-cli/ethstats-cli.pid",
    "error": "~/.ethstats-cli/ethstats-cli.log",
    "output": "~/.ethstats-cli/ethstats-cli.log",
    "args": "--verbose",
    "restartDelay": 1000
  }]
}
```

To handle daemon start at boot time, please visit [PM2-Startup](http://pm2.keymetrics.io/docs/usage/startup/).

# Docker

## Installing and running
The following commands assume that the Ethereum node is either running locally or in docker with `--net host`.
For other options you should check out [CLI options](#cli-options).

Make a directory where your configuration files will be persisted.
```sh
mkdir /opt/ethstats-cli
```

Then run the following command to run from `alethio/ethstats-cli` docker image:
```sh
docker run -d \
--restart always \
--net host \
-v /opt/ethstats-cli/:/root/.config/configstore/ \
alethio/ethstats-cli --register --account-email your@email.com --node-name your_node_name
```

or from `node:latest` docker image:

```sh
docker \
run -d \
--name ethstats-cli \
--restart always \
--net host \
-v /opt/ethstats-cli/:/root/.config/configstore/ \
node:latest \
/bin/sh -c "yarn global add ethstats-cli && ethstats-cli --register --account-email your@email.com --node-name your_node_name"
```

IMPORTANT: If you are running `ethstats-cli` through docker on a Mac OS X and the node is running on the same host, but not through docker make sure you specify the correct client url by adding `--client-url http://docker.for.mac.localhost:8545`

## Updating

If you started from `alethio/ehtstats-cli` docker image:

```sh
docker pull alethio/ethstats-cli
docker stop ethstats-cli && docker rm ethstats-cli
```

then run it again.

If you started from `node:latest` docker image, just stop and remove the `ethstats-cli` container:

```sh
docker stop ethstats-cli && docker rm ethstats-cli
```

then run it again.

MIT &copy; [Alethio](https://aleth.io)

[npm-image]: https://badge.fury.io/js/ethstats-cli.svg
[npm-url]: https://npmjs.org/package/ethstats-cli
[travis-image]: https://travis-ci.org/EthStats/ethstats-cli.svg?branch=master
[travis-url]: https://travis-ci.org/EthStats/ethstats-cli
[daviddm-image]: https://david-dm.org/EthStats/ethstats-cli.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/EthStats/ethstats-cli
[coveralls-image]: https://coveralls.io/repos/EthStats/ethstats-cli/badge.svg
[coveralls-url]: https://coveralls.io/r/EthStats/ethstats-cli
