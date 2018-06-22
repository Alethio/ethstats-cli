# Changelog
All notable changes to this project will be documented in this file.

## [2.3.11] - 2018-06-22
- Updated Dockerfile
- Automatically build docker image to `hub.docker.com/r/alethio/ethstats-cli`

## [2.3.10] - 2018-06-14
- Improved WS communication mechanism with the server.

## [2.3.9] - 2018-06-07
- Fixed bug when ensuring the app is running only one instance inside docker container.

## [2.3.8] - 2018-06-07
- Added dbeug infos

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