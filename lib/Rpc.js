import Web3Bridge from './Web3Bridge.js';
import parallel from 'async/parallel';
import queue from 'async/queue';
import os from 'os';

const CONNECTION_INTERVAL = 5000;
const STATS_INTERVAL = 10000;
const CHECK_LATEST_FILTER_INTERVAL = 300000;

export default class Rpc {
  constructor(diContainer) {
    this.config = diContainer.config;
    this.lodash = diContainer.lodash;
    this.pkg = diContainer.pkg;
    this.log = diContainer.logger;
    this.cli = diContainer.cli;
    this.socket = diContainer.socket;
    this.web3Bridge = new Web3Bridge(diContainer);

    this.host = this.config.rpcServer.host;
    this.port = this.config.rpcServer.port;

    let configStoreRpcServer = this.config.configStore.get('rpcServer');
    if (configStoreRpcServer !== undefined) {
      this.host = configStoreRpcServer.host;
      this.port = configStoreRpcServer.port;
    }

    if (this.cli.flags.rpcHost || this.cli.flags.rpcPort) {
      this.host = (!this.cli.flags.rpcHost) ? this.host : this.cli.flags.rpcHost;
      this.port = (!this.cli.flags.rpcPort) ? this.port : this.cli.flags.rpcPort;

      this.config.configStore.set('rpcServer', {
        host: this.host,
        port: this.port
      });
    }

    this.lastSyncStatus = {};
    this.lastBlock = null;
    this.isConnected = false;

    this.checkLatestFilter();
  }

  connect() {
    this.web3Bridge.setProvider(this.host, this.port);

    this.connectionInterval = setInterval(() => {
      this.checkConnection();
    }, CONNECTION_INTERVAL);

    this.socket.login({
      nodeName: this.config.configStore.get('nodeName'),
      secretKey: this.config.configStore.get('secretKey'),
      coinbase: this.web3Bridge.getCoinbase(),
      node: this.web3Bridge.getNodeVersion(),
      net: this.web3Bridge.getNetworkVersion(),
      protocol: this.web3Bridge.getEthereumVersion(),
      api: this.web3Bridge.getApiVersion(),
      os: os.type(),
      osVersion: os.release(),
      client: this.pkg.version
    });
  }

  start() {
    // Set chain watchers
    this.setFilters();

    // Set isSyncing watcher
    this.syncing = this.web3Bridge.isSyncing((error, sync) => {
      if (!error) {
        this.syncStatus(sync);
      }
    });

    // Set stats interval
    this.statsInterval = setInterval(() => {
      this.getStats();
    }, STATS_INTERVAL);
  }

  stop() {
    this.web3Bridge.reset(false);
    clearInterval(this.statsInterval);
  }

  checkConnection() {
    if (this.web3Bridge.isConnected()) {
      if (!this.isConnected) {
        this.isConnected = true;
        if (!this.socket.isLoggedIn) {
          this.socket.login({
            nodeName: this.config.configStore.get('nodeName'),
            secretKey: this.config.configStore.get('secretKey'),
            coinbase: this.web3Bridge.getCoinbase(),
            node: this.web3Bridge.getNodeVersion(),
            net: this.web3Bridge.getNetworkVersion(),
            protocol: this.web3Bridge.getEthereumVersion(),
            api: this.web3Bridge.getApiVersion(),
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
  }

  setFilters() {
    this.blockQueue = queue((hash, callback) => {
      this.getBlock(hash, callback);
    }, 1);

    this.chainFilter = this.web3Bridge.filter('latest');
    this.chainFilter.watch((error, hash) => {
      if (!error) {
        this.blockQueue.push(hash);
      }
    });
  }

  syncStatus(sync) {
    let syncParams = {
      syncOperation: null,
      startingBlock: 0,
      currentBlock: 0,
      highestBlock: 0,
      progress: 0
    };

    if (sync === true) {
      this.web3Bridge.reset(true);
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

    if (!this.lodash.isEqual(this.lastSyncStatus, syncParams)) {
      this.lastSyncStatus = syncParams;
      this.sendSync(syncParams);
    }
  }

  getBlock(number, asyncCallback) {
    this.web3Bridge.getBlock(number, false, (error, block) => {
      if (!error && block) {
        let currentBlockNumber = parseInt(block.number);
        this.log.info(`Got block: "${currentBlockNumber}"`);

        if (this.lastBlock !== null) {
          var lastBlockNumber = parseInt(this.lastBlock.number);

          if (currentBlockNumber < lastBlockNumber) {
            this.log.info(`Ignoring block "${currentBlockNumber}" because a newer block has already been sent (last block: "${lastBlockNumber}")`);
          }

          if (currentBlockNumber === lastBlockNumber) {
            this.log.info(`Block "${currentBlockNumber}" has already been sent`);
          }

          if ((currentBlockNumber - lastBlockNumber) > 1) {
            this.log.info(`Missing blocks detected (last block: "${lastBlockNumber}")`);

            let blocksToGet = currentBlockNumber - lastBlockNumber;

            while (blocksToGet > 0) {
              let blockNumber = (currentBlockNumber - blocksToGet) + 1;
              this.blockQueue.push(blockNumber);
              this.log.info(`Force get block "${blockNumber}"`);
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
          asyncCallback();
        }
      }
    });
  }

  getStats() {
    parallel({
      peers: callback => {
        this.web3Bridge.getPeerCount(callback);
      },
      gasPrice: callback => {
        this.web3Bridge.getGasPrice(callback);
      },
      mining: callback => {
        this.web3Bridge.getMining(callback);
      },
      hashrate: callback => {
        this.web3Bridge.getHashrate(callback);
      }
    }, (error, stats) => {
      this.sendStats(stats);
    });
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

  sendStats(stats) {
    this.socket.send('stats', stats);
  }

  getBlockHashes(blockNumbers) {
    let result = [];

    for (let i = 0; i < blockNumbers.length; i++) {
      let blockHeader = this.web3Bridge.getBlock(blockNumbers[i]);

      if (blockHeader === null) {
        this.log.error(`Could not get block "${blockNumbers[i]}". Your node might be not fully synced.`, false, true);
      }

      result.push({
        number: blockHeader.number,
        hash: blockHeader.hash
      });
    }

    this.socket.send('checkChain', result);
  }

  resolveCheckChainResponse(response) {
    if (response.success) {
      this.log.info('The node is on the main ethereum chain');
    } else {
      this.log.error(response.error, false, true);
    }
  }

  checkLatestFilter() {
    setInterval(() => {
      if (this.isConnected) {
        let clientLastBlockNumber = (this.lastBlock === null) ? 0 : parseInt(this.lastBlock.number);
        let nodeLastBlockNumber = this.web3Bridge.getLastBlockNumber();

        if (nodeLastBlockNumber > clientLastBlockNumber) {
          this.log.info(`Client last block ${clientLastBlockNumber} is behind Node last block ${nodeLastBlockNumber}, resetting filters...`);
          this.stop();
          this.start();
        }
      }
    }, CHECK_LATEST_FILTER_INTERVAL);
  }

}
