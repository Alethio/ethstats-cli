# Changelog
All notable changes to this project will be documented in this file.

## [2.5.3] - 2019-06-06
- Add support for sending to the server validators/signers on "clique" POA networks

## [2.5.2] - 2019-05-23
- Fixed output on the stats variables sent to the server

## [2.5.1] - 2019-05-22
- Add support for "clientTimeout" messages from the server

## [2.5.0] - 2019-05-21
- Add WebSocket API improvements
- Add support for "stats.pendingTxs"
- Remove ".net" subdomain

## [2.4.21] - 2019-04-02
- Remove "sprintf" npm package due to memory leaks
- Update npm dependent packages to latest versions

## [2.4.20] - 2019-03-27
- Update register text and readme file

## [2.4.19] - 2019-02-28
- Nethermind support for the latest blocks filter ([#9](https://github.com/Alethio/ethstats-cli/issues/9))
- Added details for the authentication error if trying to change the network/server ([#9](https://github.com/Alethio/ethstats-cli/issues/9)) 
- Updated Readme file with more details ([#9](https://github.com/Alethio/ethstats-cli/issues/9))
- Fixed syncing bug 

## [2.4.18] - 2019-02-18
- Show correct dashboard url when app starts
- Improvements reconnecting with the Ethereum node 

## [2.4.17] - 2019-02-17
- Fixed server reconnection bug
- Updated Readme file

## [2.4.16] - 2019-02-14
- Fixed web3 WebSocketProvider connection issue

## [2.4.14] - 2019-02-12
- Reconnect to server improvements
- Reinit web3 improvements when no new block received
- Updated dependencies to latest versions

## [2.4.13] - 2019-01-19
- Fixed websocket bug when reconnecting to the ethstats network server

## [2.4.12] - 2019-01-15
- Added CircleCI workflow to trigger docker hub build sequentially
- Updated Dockerfile to use node:alpine for smaller image size

## [2.4.11] - 2018-12-20
- Fixed basic auth when Web3 HttpProvider is used

## [2.4.10] - 2018-12-12
- Added privacy policy on register
- Bug fix - reinit web3 provider when no new blocks received for more then 1 hour
- Updated README file

## [2.4.9] - 2018-11-22
- Updated package.json
- Test automated builds on Docker Hub

## [2.4.8] - 2018-11-22
- Updated README file
- Updated issue template files

## [2.4.7] - 2018-11-20
- Dependency packages update

## [2.4.6] - 2018-08-30
- Backwards compatibility with v.1 clients
- Updated dependencies to latest versions
- Fixed eslint problems

## [2.4.5] - 2018-08-30 (removed from NPM)
- NPM Publish debugging

## [2.4.4] - 2018-08-30 (removed from NPM)
- NPM Publish debugging

## [2.4.3] - 2018-08-30 (removed from NPM)
- NPM Publish debugging

## [2.4.2] - 2018-08-23
- Improved logging Errors and Warnings
- Added history request for light mode server with no persistence

## [2.4.1] - 2018-06-27
- Bug fix on require 'babel-polyfill' module

## [2.4.0] - 2018-06-27
- On login send CPU, memory and disk information
- Every 5 seconds collect and send usage information

## [2.3.11] - 2018-06-22
- Updated Dockerfile
- Automatically build docker image to `hub.docker.com/r/alethio/ethstats-cli`

## [2.3.10] - 2018-06-14
- Improved WS communication mechanism with the server.

## [2.3.9] - 2018-06-07
- Fixed bug when ensuring the app is running only one instance inside docker container.

## [2.3.8] - 2018-06-07
- Added debug infos

## [2.3.7] - 2018-06-07
- Ensure the app is running only one instance.

## [2.3.6] - 2018-06-07
- Improvements on the chain detection mechanism.
- Bug fixes.

## [2.3.5] - 2018-05-21
- Added "--configurator-url" for custom configuration service, that provides application specific configs.

## [2.3.4] - 2018-05-16
- Updated Readme file to include Troubleshooting, because the github repo is private.

## [2.3.3] - 2018-05-16
- Updated Readme file.
- Added Changelog file.
- Added Troubleshooting file.

## [2.3.2] - 2018-05-09
- Updated Readme file.

## [2.3.1] - 2018-05-08
- Fixes bug on connection.
- Handle Parity sync subscription error.
- Added configurable text after the app successfully started.
- Updated Readme file.

## [2.3.0] - 2018-04-27
- Added support for [Web3 1.0](http://web3js.readthedocs.io/en/1.0/index.html) for performance issues, using websockets/ipc subscriptions. The app will use also the old version of Web3 (0.20.x) for the HTTP Provider which in the new version is deprecated.
