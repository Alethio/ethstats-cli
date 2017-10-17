import Web3 from 'web3';
import parallel from 'async/parallel';
import queue from 'async/queue';
import throttle from 'lodash.throttle';
import os from 'os';

const CONNECTION_INTERVAL = 5000;
const STATS_INTERVAL = 10000;
const PENDING_THROTTLE = 1000;

const web3 = new Web3();

export default class Rpc {
  constructor(appContainer) {
    this.config = appContainer.config;
    this.pkg = appContainer.pkg;
    this.log = appContainer.logger;
    this.socket = appContainer.socket;

    this.lastBlock = null;
    this.isConnected = false;
  }

  connect() {
    let configRpcServer = {
      host: this.config.rpcServer.host,
      port: this.config.rpcServer.port
    };
    let configStoreRpcServer = this.config.configStore.get('rpcServer');

    if (configStoreRpcServer !== undefined) {
      configRpcServer = {
        host: configStoreRpcServer.host,
        port: configStoreRpcServer.port
      };
    }

    try {
      web3.setProvider(new web3.providers.HttpProvider(configRpcServer.port ? `${configRpcServer.host}:${configRpcServer.port}` : configRpcServer.host));

      this.connectionInterval = setInterval(() => {
        this.checkConnection();
      }, CONNECTION_INTERVAL);

      this.socket.login({
        nodeName: this.config.configStore.get('nodeName'),
        secretKey: this.config.configStore.get('secretKey'),
        coinbase: web3.eth.coinbase,
        node: web3.version.node,
        net: web3.version.network,
        protocol: web3.version.ethereum,
        api: web3.version.api,
        os: os.type(),
        osVersion: os.release(),
        client: this.pkg.version
      });
    } catch (e) {
      this.log.error(e.message);
    }
  }

  start() {
    // Set chain & pending watchers
    this.setFilters();

    // Set isSyncing watcher
    try {
      this.syncing = web3.eth.isSyncing((error, sync) => {
        if (!error) {
          this.syncStatus(sync);
        }
      });
    } catch (e) {
      this.log.error(e.message);
    }

    // Set stats interval
    this.statsInterval = setInterval(() => {
      this.getStats();
    }, STATS_INTERVAL);
  }

  stop() {
    try {
      web3.reset(false);
      clearInterval(this.statsInterval);
    } catch (e) {
      this.log.error(e.message);
    }
  }

  checkConnection() {
    try {
      if (web3.isConnected()) {
        if (!this.isConnected) {
          this.isConnected = true;
          if (!this.socket.isLoggedIn) {
            this.socket.login({
              nodeName: this.config.configStore.get('nodeName'),
              secretKey: this.config.configStore.get('secretKey'),
              coinbase: web3.eth.coinbase,
              node: web3.version.node,
              net: web3.version.network,
              protocol: web3.version.ethereum,
              api: web3.version.api,
              os: os.type(),
              osVersion: os.release(),
              client: this.pkg.version
            });
          }

          this.sendConnection({
            isConnected: this.isConnected,
          });
          this.start();
        }
      } else {
        if (this.isConnected) {
          this.isConnected = false;
          this.sendConnection({
            isConnected: this.isConnected,
          });
          this.stop();

          if (this.socket.isLoggedIn) {
            this.socket.logout();
          }
        }
      }
    } catch (e) {
      this.log.error(e.message);
    }
  }

  setFilters() {
    this.sendPendingThrottled = throttle(this.sendPending, PENDING_THROTTLE);

    this.blockQueue = queue((hash, callback) => {
      this.getBlock(hash, callback);
    }, 1);

    try {
      this.chainFilter = web3.eth.filter('latest');
      this.chainFilter.watch((error, hash) => {
        if (!error) {
          this.blockQueue.push(hash);
        }
      });
    } catch (e) {
      this.log.error(e.message);
    }

    // this.pendingFilter = web3.eth.filter('latest');
    // this.pendingFilter.watch((error, pending) => {
    //   if (!error) {
    //     this.sendPendingThrottled(pending);
    //   }
    // });
  }

  syncStatus(sync) {
    let syncParams = {
      syncOperation: null,
      startingBlock: 0,
      currentBlock: 0,
      highestBlock: 0,
      progress: 0
    };

    try {
      if (sync === true) {
        web3.reset(true);
        syncParams.syncOperation = 'start';
      } else if (sync) {
        const progress = sync.currentBlock - sync.startingBlock;
        const total = sync.highestBlock - sync.startingBlock;
        syncParams.progress = (progress > 0 && total > 0) ? (progress / total * 100).toFixed(2) : 0;
        syncParams.syncOperation = 'progress';
        syncParams.startingBlock = sync.startingBlock;
        syncParams.currentBlock = sync.currentBlock;
        syncParams.highestBlock = sync.highestBlock;
      } else {
        // TODO: send synced blocks
        this.setFilters();
        syncParams.syncOperation = 'finish';
      }

      this.sendSync(syncParams);
    } catch (e) {
      this.log.error(e.message);
    }
  }

  getBlock(number, asyncCallback) {
    try {
      web3.eth.getBlock(number, false, (error, block) => {
        if (!error) {
          let currentBlockNumber = parseInt(block.number);
          this.log.info(`Got block: "${currentBlockNumber}"`);

          if (this.lastBlock !== null) {
            var lastBlockNumber = parseInt(this.lastBlock.number);

            if (currentBlockNumber < lastBlockNumber) {
              this.log.info(`Ignoring block: "${currentBlockNumber}" beacause is less then last block: "${lastBlockNumber}"`);
            }

            if (currentBlockNumber === lastBlockNumber) {
              this.log.info(`Already sent block: "${currentBlockNumber}"`);
            }

            if ((currentBlockNumber - lastBlockNumber) > 1) {
              this.log.info(`Missing blocks detected, last block: "${lastBlockNumber}"`);

              let blocksToGet = currentBlockNumber - lastBlockNumber;

              while (blocksToGet > 0) {
                let blockNumber = (currentBlockNumber - blocksToGet) + 1;
                this.blockQueue.push(blockNumber);
                this.log.info(`Force get block: "${blockNumber}"`);
                blocksToGet--;
              }
            }
          }

          if (this.lastBlock === null || (currentBlockNumber - lastBlockNumber) === 1) {
            this.lastBlock = block;
            this.sendBlock(block);
          }

          if (asyncCallback) {
            asyncCallback();
          }
        } else {
          if (asyncCallback) {
            asyncCallback(error);
          }
        }
      });
    } catch (e) {
      this.log.error(e.message);
    }
  }

  getStats() {
    try {
      parallel({
        peers: callback => {
          web3.net.getPeerCount(callback);
        },
        gasPrice: callback => {
          web3.eth.getGasPrice(callback);
        },
        mining: callback => {
          web3.eth.getMining(callback);
        },
        hashrate: callback => {
          web3.eth.getHashrate(callback);
        }
      }, (error, stats) => {
        if (error === null) {
          this.sendStats(stats);
        }
      });
    } catch (e) {
      this.log.error(e.message);
    }
  }

  sendConnection(connected) {
    this.socket.send('connection', connected);
  }

  sendSync(sync) {
    this.socket.send('sync', sync);
  }

  sendBlock(block) {
    this.socket.send('block', block);
  }

  sendPending(pending) {
    this.socket.send('pending', pending);
  }

  sendStats(stats) {
    this.socket.send('stats', stats);
  }

  getBlockHashes(blockNumbers) {
    try {
      let result = [];

      for (let i = 0; i < blockNumbers.length; i++) {
        let blockHeader = web3.eth.getBlock(blockNumbers[i]);
        result.push({
          number: blockHeader ? blockHeader.number : null,
          hash: blockHeader ? blockHeader.hash : null
        });
      }

      this.socket.send('checkChain', result);
    } catch (e) {
      this.log.error(e.message);
    }
  }

  resolveCheckChainResponse(response) {
    if (response.success) {
      this.log.info('The node is on the main ethereum chain');
    } else {
      this.log.error(response.error);
      process.exit();
    }
  }

}
