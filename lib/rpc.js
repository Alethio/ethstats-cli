import Web3 from 'web3';
import parallel from 'async/parallel';
import queue from 'async/queue';
import throttle from 'lodash.throttle';

const web3 = new Web3();

export default class Rpc {
  constructor(socket) {
    this.socket = socket;
  }

  connect(host, port) {
    web3.setProvider(new web3.providers.HttpProvider(`${host}:${port}`));
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
    }, 10000);
  }

  stop() {
    web3.reset(false);
    clearInterval(this.statsInterval);
  }

  setFilters() {
    const sendPendingThrottled = throttle(this.sendPending, 1000);

    this.blockQueue = queue((hash, callback) => {
      this.getBlock(hash, callback);
    }, 1);

    this.chainFilter = web3.eth.filter('latest');
    this.chainFilter.watch((error, hash) => {
      if (!error) {
        this.blockQueue.push(hash);
      }
    });

    this.pendingFilter = web3.eth.filter('latest');
    this.pendingFilter.watch((error, pending) => {
      if (!error) {
        sendPendingThrottled(pending);
      }
    });
  }

  syncStatus(sync) {
    if (sync === true) {
      web3.reset(true);
      this.sendSync(true);
    } else if (sync) {
      const progress = sync.currentBlock - sync.startingBlock;
      const total = sync.highestBlock - sync.startingBlock;
      sync.progress = (progress / total * 100).toFixed(2);
      this.sendSync(sync);
    } else {
      // TODO: send synced blocks
      this.setFilters();
      this.sendSync(false);
    }
  }

  getBlock(number, asyncCallback) {
    web3.getBlock(number, false, (error, block) => {
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
