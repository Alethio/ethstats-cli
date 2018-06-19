# ethstats-cli [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]

> EthStats.io CLI client.  
>   
>
> This app connects to your Ethereum node through RPC and extract data that will be sent to the ethstats server for analytics purposes. Stats are displayed on [ethstats.io](https://alpha.ethstats.io/)

# Contents
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Install](#install)
    - [Update](#update)
    - [Running](#running)
      - [CLI](#cli)
      - [Daemon](#daemon)
      - [With PM2](#with-pm2)
      - [In Docker](#in-docker)
  - [Troubleshooting](#troubleshooting)
  - [License](#license)


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

## Supported node configurations
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

## Install

Install `ethstats-cli` globally

With [npm](https://www.npmjs.com):
```sh
npm install -g ethstats-cli
```
If you encounter permissions issues at install time please see troubleshooting section: [NPM global package permissions problem](#npm-global-package-permissions-problem)

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
On the first run of the app you will be asked a series of questions to setup your node.
Either follow the on screen instructions or see [CLI options](#cli-options) for a non-interactive mode.

The app is configured by default to connect to an Ethereum node on the local machine (http://localhost:8545) that is running on the `mainnet` network.
To connect to a node running on another host see `--clientUrl` under [CLI options](#cli-options).

After the setup is done, your node will be visible on [ethstats.io](https://alpha.ethstats.io/)

### CLI

To run the app in interactive mode you can use the following command:

```sh
$ ethstats-cli
```

#### CLI options:

```sh
  --help, -h                Show help
  --version, -V             Show version
  --debug, -d               Output values sent to server
  --verbose, -v             Output more detailed information

  --server-url              Server URL (Must include protocol and port if any)
  --net, -n                 Specify Ethereum network your node is running on (Default: mainnet)
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

Running the app in non-interactive mode for the first time, you'll need to specify the `--register` option together with `--account-email` and `--node-name`.
Like this no questions will be asked. All other CLI options have default values.

Example:
```sh
$ ethstats-cli --register --account-email your@email.com --node-name your_node_name
```

If the app is already registered and you still specify the registration CLI option like in the example command above, they will be avoided.

If the node was successfully registered, a configuration file is created to persist the values of the CLI options previously specified.
Every CLI option that passes a value, once specified, it's value is stored in this configuration file, so the next time the app is started there's no need to specify does CLI options again.

### Daemon

To keep the app running at all times, you can run it as a daemon using the following command:

```sh
$ ethstats-daemon
```

#### Daemon options:

```sh
  start               Start daemon
  stop                Stop daemon
  restart             Restart daemon. If it is already started, the process will be stopped first.
  status              Show infos about the daemon.
  kill                Ethstats daemon uses PM2 as a process manager. This command will kill PM2 god daemon.
```

If any CLI options are specified after the Daemon option, they will be forwarded to the forked process.
The Daemon mode is implemented programmatically through the PM2 API. The API does not support the "startup" feature. To handle start on boot, check out the [PM2](#with-pm2) instructions.

### With PM2

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

### In Docker

#### Installing and running
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

The docker commands are run with `-d`, that means `ethstats-cli` is started in non-interactive mode.

To run in interactive mode change `-d` to `-it` and remove the `--register` option along with `--account-email` and `--node-name`.

If you already had a configuration file, the settings from that file will be used and the command line ignored. Delete the files in `/opt/ethstats-cli` to add a node with different settings.

#### Updating

If you started from `alethio/ehtstats-cli` docker image:

```sh
docker pull alethio/ethstats-cli
docker stop ethstats-cli && docker rm ethstats-cli
```

then run it again.

If you started from `node/latest` docker image, just stop and remove the `ethstats-cli`:

```sh
docker stop ethstats-cli && docker rm ethstats-cli
```

then run it again.

## Troubleshooting
#### NPM global package permissions problem
We recommend installing NPM global packages **without** sudo. If you encountered issues when tried to install `ethstats-cli` as a global package with or without sudo regarding permissions, we recommend using this script [npm-global-no-sudo](https://github.com/baxy/npm-global-no-sudo) to fix the issue.

#### Binaries not found
If you installed `ethstats-cli` as a global package with Yarn and the binaries are not found, we recommend running the following command:
```
export PATH="$PATH:`yarn global bin`" && echo 'export PATH="$PATH:`yarn global bin`"' >> ~/.profile
```

## License

MIT &copy; [alethio](https://aleth.io)

[npm-image]: https://badge.fury.io/js/ethstats-cli.svg
[npm-url]: https://npmjs.org/package/ethstats-cli
[travis-image]: https://travis-ci.org/EthStats/client-node.svg?branch=master
[travis-url]: https://travis-ci.org/EthStats/client-node
[daviddm-image]: https://david-dm.org/EthStats/client-node.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/EthStats/client-node
[coveralls-image]: https://coveralls.io/repos/EthStats/client-node/badge.svg
[coveralls-url]: https://coveralls.io/r/EthStats/client-node
