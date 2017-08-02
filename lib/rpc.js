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

    this.isConnected = false;
  }

  connect() {
    let host = this.config.rpcServer.host;
    let port = this.config.rpcServer.port;
    web3.setProvider(new web3.providers.HttpProvider(port ? `${host}:${port}` : host));

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
  }

  start() {
    // Set chain & pending watchers
    this.setFilters();

    // Set isSyncing watcher
    this.syncing = web3.eth.isSyncing((error, sync) => {
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
    web3.reset(false);
    clearInterval(this.statsInterval);
  }

  checkConnection() {
    if (web3.isConnected()) {
      if (!this.isConnected) {
        this.isConnected = true;
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
      }
    }
  }

  setFilters() {
    this.sendPendingThrottled = throttle(this.sendPending, PENDING_THROTTLE);

    this.blockQueue = queue((hash, callback) => {
      this.getBlock(hash, callback);
    }, 1);

    this.chainFilter = web3.eth.filter('latest');
    this.chainFilter.watch((error, hash) => {
      if (!error) {
        this.blockQueue.push(hash);
      }
    });

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
  }

  getBlock(number, asyncCallback) {
    web3.eth.getBlock(number, false, (error, block) => {
      if (!error) {
        this.sendBlock(block);
        if (asyncCallback) {
          asyncCallback();
        }
      } else {
        if (asyncCallback) {
          asyncCallback(error);
        }
      }
    });
  }

  getStats() {
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

  sendPending(pending) {
    this.socket.send('pending', pending);
  }

  sendStats(stats) {
    this.socket.send('stats', stats);
  }
}
