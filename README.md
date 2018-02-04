# ethstats-cli [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]

> EthStats.io CLI client.  
>   
>
> This app connects to your Ethereum node through RPC and extract data that will be sent to the ethstats server for analytics purposes.

## Requirements
> Node.js >= 7.0 (https://nodejs.org/en/download/)  
> NPM >= 5.0 (NPM is distributed with Node.js. For more infos see: https://www.npmjs.com/get-npm)

## Installation

The app needs to be installed on the same machine as the Ethereum node.
> NPM
```sh
$ npm install -g ethstats-cli
```

> Yarn
```sh
$ yarn global add ethstats-cli
```

## Update

> NPM
```sh
$ npm install -g ethstats-cli@latest
```

> Yarn
```sh
$ yarn global upgrade ethstats-cli
```

## Usage

On the first run of the app, a node name must be provided.   
Under that name the node will be visible on http://ethstats.net 
```sh
$ ethstats-cli
```

## Shell options

```sh
--help, -h              Show help
--version, -V           Show version
--debug, -d             Output values sent to server
--verbose, -v           Output more detailed information
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
